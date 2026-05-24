# 任务清单: note-to-property-mode

> **@status:** completed | 2026-05-02 13:22

```yaml
@feature: note-to-property-mode
@created: 2026-05-02
@status: completed
@mode: R2
```

## LIVE_STATUS

```json
{"status":"completed","completed":6,"failed":0,"pending":0,"total":6,"done":6,"percent":100,"current":"开发实施、验证和知识库同步完成","updated_at":"2026-05-02 13:23:00"}
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 6 | 0 | 0 | 6 |

---

## 任务列表

### 1. 入口迁移

- [√] 1.1 在 `app.go` 中移除“备注模式”菜单项和 F4 note 切换入口 | depends_on: []
- [√] 1.2 在 `frontend/src/components/layout/MainContent.tsx`、`frontend/src/types/index.ts`、`frontend/src/services/BaseDataReloadService.ts`、`backend/models/models.go` 中收口独立 `note` 模式引用 | depends_on: [1.1]

### 2. 属性模式集成

- [√] 2.1 在 `frontend/src/components/panels/NotePanel.tsx` 中将备注编辑改为可嵌入的紧凑区块 | depends_on: []
- [√] 2.2 在 `frontend/src/components/panels/PropertyPanel.tsx` 中嵌入紧凑备注区块 | depends_on: [2.1]

### 3. 换行修复

- [√] 3.1 修复描述编辑 Enter 换行后被来源同步覆盖的问题，并保留空行编辑/保存语义 | depends_on: [2.1]

### 4. 验证与同步

- [√] 4.1 运行相关类型检查/构建，并同步知识库变更记录 | depends_on: [1.2,2.2,3.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-05-02 13:17 | DESIGN | completed | R2 简化方案包已创建并填充 |
| 2026-05-02 13:20 | DEVELOP | completed | 入口迁移、属性模式集成和描述换行修复已完成 |
| 2026-05-02 13:22 | VERIFY | completed | `bunx tsc --noEmit`、`bun run build`、相关 Vitest、`go test ./...` 通过 |
| 2026-05-02 13:23 | KB | completed | 更新模块文档和 CHANGELOG |

---

## 执行备注

- 用户选择迁移范围为“移除独立备注模式入口，把备注编辑/预览整合到属性模式内”。
- 主要缺陷原因是描述保存过滤空行后触发来源数据同步，覆盖了 TextArea 本地编辑态。
