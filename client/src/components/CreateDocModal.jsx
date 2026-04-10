import React, { useState } from 'react'

export default function CreateDocModal({ show, onClose, onCreate }) {
  const [name, setName] = useState('')
  
  if (!show) return null
  
  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate(name || '未命名文档')
    setName('')
  }
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>新建文档</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>文档名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入文档名称"
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary">创建</button>
          </div>
        </form>
      </div>
    </div>
  )
}
