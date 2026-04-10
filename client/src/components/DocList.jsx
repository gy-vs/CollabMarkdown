import React from 'react'

export default function DocList({ documents, onSelect, currentDoc }) {
  return (
    <div className="doc-list">
      {documents.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#7f8c8d' }}>暂无文档，点击右上角新建文档</p>
      ) : (
        documents.map(doc => (
          <div
            key={doc.id}
            className={`doc-item ${currentDoc?.id === doc.id ? 'active' : ''}`}
            onClick={() => onSelect(doc.id)}
          >
            {doc.name}
          </div>
        ))
      )}
    </div>
  )
}
