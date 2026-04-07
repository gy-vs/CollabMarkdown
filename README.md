# Markdown 协同编辑器

基于 WebSocket 的多人实时协同 Markdown 编辑器 Web 应用，支持左右分栏实时预览、多用户光标标识、文档版本历史与快捷键操作。

---

## How to Run

```bash
docker compose up --build -d
```

## Services

| 服务 | 端口 | 说明 |
|------|------|------|
| Web App | 8080 | 编辑器前端 + WebSocket 服务 |

访问地址：http://localhost:8080

## 核心功能

- 创建/打开文档，通过分享链接邀请协同编辑
- 左右分栏：左侧语法高亮编辑器，右侧实时渲染 Markdown
- 多人实时同步：基于 WebSocket，光标用不同颜色标识
- 文档版本历史：自动快照，支持查看和回滚
- 快捷键：Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+K 插入链接
