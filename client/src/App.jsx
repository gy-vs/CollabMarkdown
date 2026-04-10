import React, { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import DocList from './components/DocList'
import CreateDocModal from './components/CreateDocModal'
import VersionHistoryModal from './components/VersionHistoryModal'
import './App.css'

marked.setOptions({
  breaks: true,
  gfm: true
})

const renderer = new marked.Renderer()
const originalText = renderer.text.bind(renderer)
renderer.text = (text) => {
  if (text.includes('$')) {
    try {
      const inlineMath = text.replace(/\$([^$]+)\$/g, (match, math) => {
        try {
          return katex.renderToString(math, { throwOnError: false })
        } catch (e) {
          return match
        }
      })
      return inlineMath
    } catch (e) {}
  }
  return originalText(text)
}

const originalCode = renderer.code.bind(renderer)
renderer.code = (code, language) => {
  if (language === 'math' || language === 'katex') {
    try {
      return `<div class="math-block">${katex.renderToString(code, { throwOnError: false, displayMode: true })}</div>`
    } catch (e) {}
  }
  return originalCode(code, language)
}

marked.use({ renderer })

function App() {
  const [ws, setWs] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userColor, setUserColor] = useState(null)
  const [currentDoc, setCurrentDoc] = useState(null)
  const [content, setContent] = useState('')
  const [remoteUsers, setRemoteUsers] = useState([])
  const [documents, setDocuments] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versions, setVersions] = useState([])
  const editorRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`
    const socket = new WebSocket(wsUrl)
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleMessage(data)
    }
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'get-docs' }))
    }
    
    setWs(socket)
    
    return () => socket.close()
  }, [])

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'init':
        setUserId(data.userId)
        setUserColor(data.userColor)
        setDocuments(data.documents || [])
        break
      case 'doc-list':
        setDocuments(data.documents || [])
        break
      case 'document':
        setCurrentDoc({ id: data.docId, name: data.name })
        setContent(data.content)
        setRemoteUsers(data.users || [])
        setVersions(data.versions || [])
        if (editorRef.current) {
          editorRef.current.setValue(data.content)
        }
        break
      case 'sync':
        if (data.userId !== userId) {
          setContent(data.content)
          if (editorRef.current) {
            const editor = editorRef.current
            const cursor = editor.getPosition()
            editor.setValue(data.content)
            if (cursor) editor.setPosition(cursor)
          }
        }
        break
      case 'cursor-update':
        if (data.userId !== userId) {
          setRemoteUsers(prev => {
            const updated = prev.filter(u => u.userId !== data.userId)
            return [...updated, {
              userId: data.userId,
              name: data.name,
              color: data.color,
              cursor: data.cursor
            }]
          })
        }
        break
      case 'user-join':
        if (data.userId !== userId) {
          setRemoteUsers(prev => [...prev, {
            userId: data.userId,
            name: data.name,
            color: data.color
          }])
        }
        break
      case 'user-leave':
        setRemoteUsers(prev => prev.filter(u => u.userId !== data.userId))
        break
      case 'doc-created':
        navigate(`/doc/${data.docId}`)
        if (ws) {
          ws.send(JSON.stringify({ type: 'join', docId: data.docId }))
        }
        break
      case 'new-version':
        setVersions(prev => [...prev, data.version])
        break
    }
  }, [userId, ws, navigate])

  const handleEditorChange = useCallback((value) => {
    if (!value || value === content) return
    setContent(value)
    if (ws && currentDoc) {
      const editor = editorRef.current
      const cursor = editor?.getPosition()
      ws.send(JSON.stringify({
        type: 'content',
        docId: currentDoc.id,
        content: value,
        cursor
      }))
    }
  }, [ws, currentDoc, content])

  const handleCursorChange = useCallback(() => {
    if (ws && currentDoc && editorRef.current) {
      const cursor = editorRef.current.getPosition()
      ws.send(JSON.stringify({
        type: 'cursor',
        docId: currentDoc.id,
        cursor
      }))
    }
  }, [ws, currentDoc])

  const handleCreateDoc = (name) => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'create-doc', name }))
    }
    setShowCreateModal(false)
  }

  const handleSelectDoc = (docId) => {
    navigate(`/doc/${docId}`)
    if (ws) {
      ws.send(JSON.stringify({ type: 'join', docId }))
    }
  }

  const handleSave = async () => {
    if (!currentDoc) return
    try {
      await fetch(`/api/save/${currentDoc.id}`, { method: 'POST' })
      alert('保存成功！')
    } catch (e) {
      console.error('保存失败:', e)
    }
  }

  const handleRollback = async (versionContent) => {
    setContent(versionContent)
    if (editorRef.current) {
      editorRef.current.setValue(versionContent)
    }
    if (ws && currentDoc) {
      ws.send(JSON.stringify({
        type: 'content',
        docId: currentDoc.id,
        content: versionContent
      }))
    }
    setShowVersionModal(false)
  }

  const handleCopyLink = () => {
    if (currentDoc) {
      navigator.clipboard.writeText(window.location.href)
      alert('链接已复制到剪贴板！')
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>CollabMarkdown</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>新建文档</button>
          {currentDoc && (
            <>
              <button className="btn btn-secondary" onClick={handleCopyLink}>分享链接</button>
              <button className="btn btn-secondary" onClick={() => setShowVersionModal(true)}>版本历史</button>
              <button className="btn btn-success" onClick={handleSave}>保存版本</button>
            </>
          )}
          <div className="users-list">
            {remoteUsers.map(u => (
              <span key={u.userId} className="user-indicator" style={{ backgroundColor: u.color }}>
                {u.name}
              </span>
            ))}
          </div>
        </div>
      </header>
      
      <div className="main-content">
        <div className="sidebar">
          <h3>文档列表</h3>
          <DocList 
            documents={documents} 
            onSelect={handleSelectDoc}
            currentDoc={currentDoc}
          />
        </div>
        
        <EditorWrapper
          content={content}
          editorRef={editorRef}
          onChange={handleEditorChange}
          onCursorChange={handleCursorChange}
          remoteUsers={remoteUsers}
          ws={ws}
          currentDoc={currentDoc}
        />
      </div>
      
      <CreateDocModal 
        show={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateDoc}
      />
      
      <VersionHistoryModal
        show={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        versions={versions}
        onRollback={handleRollback}
      />
    </div>
  )
}

function EditorWrapper({ content, editorRef, onChange, onCursorChange, remoteUsers, ws, currentDoc }) {
  const { docId } = useParams()
  const monacoRef = useRef(null)

  useEffect(() => {
    if (docId && ws && currentDoc === null) {
      ws.send(JSON.stringify({ type: 'join', docId }))
    }
  }, [docId, ws, currentDoc])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    editor.onDidChangeCursorPosition(onCursorChange)
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      const selection = editor.getSelection()
      const text = editor.getModel().getValueInRange(selection)
      editor.executeEdits(null, [{ range: selection, text: `**${text}**` }])
    })
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      const selection = editor.getSelection()
      const text = editor.getModel().getValueInRange(selection)
      editor.executeEdits(null, [{ range: selection, text: `*${text}*` }])
    })
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      const selection = editor.getSelection()
      const text = editor.getModel().getValueInRange(selection) || '链接文本'
      editor.executeEdits(null, [{ range: selection, text: `[${text}](url)` }])
    })
  }

  const previewContent = marked(content || '')

  return (
    <div className="editor-container">
      <div className="editor-pane">
        <div className="pane-header">编辑区 (Ctrl+B: 加粗, Ctrl+I: 斜体, Ctrl+K: 链接)</div>
        <div className="editor-wrapper">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            defaultValue={content}
            value={content}
            onChange={onChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              automaticLayout: true
            }}
          />
          {remoteUsers.filter(u => u.cursor).map(u => (
            <div
              key={u.userId}
              className="cursor-indicator"
              style={{
                backgroundColor: u.color,
                left: `${(u.cursor?.column || 1) * 8}px`,
                top: `${(u.cursor?.lineNumber || 1) * 18}px`
              }}
            >
              <span className="cursor-label" style={{ backgroundColor: u.color }}>
                {u.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="preview-pane">
        <div className="pane-header">预览区</div>
        <div className="preview-wrapper">
          <div 
            className="preview-content" 
            dangerouslySetInnerHTML={{ __html: previewContent }} 
          />
        </div>
      </div>
    </div>
  )
}

export default function AppWithRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/doc/:docId" element={<App />} />
      </Routes>
    </Router>
  )
}
