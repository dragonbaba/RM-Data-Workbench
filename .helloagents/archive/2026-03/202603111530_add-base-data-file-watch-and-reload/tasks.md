# 任务清单: add-base-data-file-watch-and-reload

> **@status:** completed | 2026-03-11 15:46

```yaml
@feature: add-base-data-file-watch-and-reload
@created: 2026-03-11
@status: completed
@mode: R2
```

<!-- LIVE_STATUS_BEGIN -->
状态: completed | 进度: 10/10 (100%) | 更新: 2026-03-11 15:46:00
当前: -
<!-- LIVE_STATUS_END -->

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 10 | 0 | 0 | 10 |

---

## 任务列表

### 1. 后端文件监听链路

- [√] 1.1 在 `backend/services/workspace_service.go` 中增加当前工作区 `data/` 目录监听能力，并限定为受支持的数据文件集合。
- [√] 1.2 在 `app.go` 中接入监听生命周期，将文件变化通过 Wails 事件统一发到前端。
  - 依赖: 1.1

### 2. 数据缓存重载能力

- [√] 2.1 在 `frontend/src/services/DataLoaderService.ts` 中新增“按文件路径/文件名重载缓存”的统一入口，覆盖普通数据库文件、`MapInfos.json` 和按需地图文件。
  - 依赖: 1.2
- [√] 2.2 为监听场景补充去抖或来源识别，避免应用自身保存后立刻触发重复重载。
  - 依赖: 2.1

### 3. 当前面板命中判定与交互

- [√] 3.1 在 `frontend/src/hooks/useFileOperations.ts` 中接入文件变化事件监听，按 `uiMode + 当前文件 + 面板依赖白名单` 判断是否影响当前激活面板。
  - 依赖: 2.1
- [√] 3.2 命中当前激活面板时，复用 `InputDialog.confirm(...)` 弹出确认框；未命中时静默刷新缓存。
  - 依赖: 3.1

### 4. 当前数据重载流程

- [√] 4.1 在 `frontend/src/hooks/useFileOperations.ts` 中补充“重载当前面板数据”的统一流程，覆盖普通 data、quest、projectile、map 和地图索引视图。
  - 依赖: 3.2
- [√] 4.2 确保 `QuestPanel`、`ProjectilePanel` 在依赖缓存变化确认后能重新取值并刷新界面选项。
  - 依赖: 4.1

### 5. 验证与知识库同步

- [√] 5.1 为新增的纯函数/监听判定补测试或最小回归验证，并执行 `bunx tsc --noEmit`、`bun run build`、`go test ./...`。
  - 依赖: 4.2
- [√] 5.2 同步更新 `.helloagents` 模块文档、上下文与 `CHANGELOG.md`。
  - 依赖: 5.1

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-11 15:31:00 | 1.1-1.2 | completed | 后端补充 `data/` 目录轮询监听、应用内写入抑制与 `data:file-changed` 事件发射 |
| 2026-03-11 15:36:00 | 2.1-4.2 | completed | 前端新增单文件重载、当前面板命中判定、确认框与当前数据重载流程 |
| 2026-03-11 15:41:00 | 5.1 | completed | 新增前端/后端测试并通过 `bunx tsc --noEmit`、`bun run test --run`、`bun run build`、`go test ./...`、`go build ./...` |
| 2026-03-11 15:46:00 | 5.2 | completed | 已同步模块文档、上下文、CHANGELOG，并归档方案包 |

---

## 执行备注

- 第一版严格限制在 `data/` 目录基础数据文件监听，不扩展到脚本和图片资源。
- 当前面板命中判定使用白名单，后续若新增复杂面板再扩展依赖集合。
- 地图仍保持“索引先行、内容按需加载”，监听逻辑不得引入全量地图重载。
