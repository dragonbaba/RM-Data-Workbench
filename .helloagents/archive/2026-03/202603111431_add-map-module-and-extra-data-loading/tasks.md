# 任务清单: add-map-module-and-extra-data-loading

> **@status:** completed | 2026-03-11 14:51

```yaml
@feature: add-map-module-and-extra-data-loading
@created: 2026-03-11
@status: pending
@mode: R2
```

<!-- LIVE_STATUS_BEGIN -->
状态: completed | 进度: 10/10 (100%) | 更新: 2026-03-11 14:52:00
当前: -
<!-- LIVE_STATUS_END -->

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 10 | 0 | 0 | 10 |

---

## 任务列表

### 1. 后端工作区与菜单扩展

- [√] 1.1 在 `backend/services/workspace_service.go` 中补充 `Classes.json`、`CommonEvents.json`、`MapInfos.json` 与地图文件相关类型识别和可选文件定义。
- [√] 1.2 在 `app.go` 中扩展“数据”菜单，增加职业、公共事件与地图入口。
  - 依赖: 1.1

### 2. 常规数据文件接入

- [√] 2.1 在 `frontend/src/services/DataLoaderService.ts` 与 `frontend/src/hooks/useFileOperations.ts` 中补充 `Classes.json`、`CommonEvents.json` 的 manifest 与菜单映射，保持其继续走普通 `data` 类型。
  - 依赖: 1.2

### 3. 地图索引与按需加载服务

- [√] 3.1 在 `frontend/src/services/DataLoaderService.ts` 中拆分普通数据预载与地图索引加载逻辑，新增 `MapInfos.json` 缓存入口。
  - 依赖: 1.2
- [√] 3.2 在 `frontend/src/services/DataLoaderService.ts` 中新增按地图 ID/文件名读取 `MapXXX.json` 的懒加载能力，并将地图内容注册到统一缓存。
  - 依赖: 3.1

### 4. 地图状态与交互接入

- [√] 4.1 在 `frontend/src/types/index.ts` 与 `frontend/src/stores/editorStore.ts` 中扩展 `map` 相关类型、地图索引状态与当前地图状态，保证地图可进入统一脏标记和保存链路。
  - 依赖: 3.2
- [√] 4.2 在 `frontend/src/hooks/useFileOperations.ts` 中新增地图菜单事件流程：先加载 `MapInfos.json`，再根据地图项触发 `MapXXX.json` 懒加载。
  - 依赖: 4.1

### 5. 地图 UI 模块接入

- [√] 5.1 改造 `frontend/src/components/layout/LeftPanel.tsx` 与 `frontend/src/components/layout/MainContent.tsx`，让地图模式显示地图索引列表并接入 `MapPanel`。
  - 依赖: 4.2
- [√] 5.2 新增 `frontend/src/components/panels/MapPanel.tsx`，提供地图基础信息/内容的最小可用编辑能力，并保证修改可回写统一缓存。
  - 依赖: 5.1

### 6. 验证与文档同步

- [√] 6.1 补充地图懒加载相关测试或纯函数校验，并执行 `bunx tsc --noEmit`、`bun run build`、`go test ./...` 完成验收；开发完成后同步知识库与变更记录。
  - 依赖: 5.2

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-11 14:31:00 | 方案包创建 | pending | 已生成骨架，待进入开发实施 |
| 2026-03-11 14:41:00 | 1.1-1.2 | completed | 后端识别与菜单入口已补齐；子代理失败后由主代理降级执行 |
| 2026-03-11 14:46:00 | 2.1-5.2 | completed | 前端数据加载、地图状态、地图列表与 MapPanel 已接入 |
| 2026-03-11 14:50:00 | 6.1 | completed | `bunx tsc --noEmit`、`bun run build`、`bun run test --run`、`go test ./...`、`go build ./...` 均通过 |
| 2026-03-11 14:52:00 | KB/CHANGELOG 同步 | completed | 已补充模块文档、上下文、CHANGELOG，待归档方案包 |

---

## 执行备注

- 地图模块本次只实现最小可用接入，不扩展为完整地图编辑器。
- `Classes.json` 与 `CommonEvents.json` 继续复用现有普通数据文件链路，不新增专用面板。
- 地图必须遵守“索引先行、内容按需加载”的设计约束，禁止将全部 `MapXXX.json` 放入启动预载流程。
- 后端实现子代理在本轮环境中无法正常执行 shell，相关代码改动由主代理降级接手完成。
