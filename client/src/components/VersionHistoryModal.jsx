import React from 'react'

export default function VersionHistoryModal({ show, onClose, versions, onRollback }) {
  if (!show) return null
  
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>版本历史</h2>
        {versions.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#7f8c8d', padding: '20px 0' }}>
            暂无保存的版本，点击"保存版本"按钮创建第一个版本
          </p>
        ) : (
          <div className="version-list">
            {versions.slice().reverse().map((version, index) => (
              <div
                key={version.id}
                className="version-item"
                onClick={() => onRollback(version.content)}
              >
                <div className="version-time">
                  版本 #{versions.length - index} - {formatTime(version.timestamp)}
                </div>
                <div className="version-preview">
                  {version.content.slice(0, 60)}...
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
