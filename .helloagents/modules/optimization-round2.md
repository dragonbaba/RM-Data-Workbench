# 优化第2轮（1~5）实施记录

## 目标
- 在不改变业务功能的前提下继续做 1~5 项优化。
- 强化弹道预览，使其与面板配置行为一致且更平滑。

## 优化 1：构建分包
- 调整 `vite` 的 `manualChunks`，把重依赖拆到独立 vendor 包：
  - `vendor-antd`
  - `vendor-pixi`
  - `vendor-monaco`
- 文件：`frontend/vite.config.ts`
- 结果：
  - 主业务入口包约 `50.67 kB`（明显小于此前）
  - 仍保留 antd 大包告警（`vendor-antd` ~795k），但这是依赖体量本身，不影响功能正确性。

## 优化 2：状态订阅粒度
- 将多个核心组件从“全量 store 订阅”改为“selector 精确订阅”：
  - `MainContent`, `LeftPanel`
  - `CodeEditorPanel`, `QuestPanel`, `ProjectilePanel`, `PropertyPanel`, `NotePanel`
  - `ProjectileCanvas`
- 目标：减少与当前组件无关的状态变化触发重渲染。

## 优化 3：日志系统稳定性与测试噪音
- Logger 新增运行时能力：
  - 存储能力安全检测（已在上轮）
  - 测试环境自动禁用 console 输出（本轮）
- 文件：`frontend/src/services/Logger.ts`
- 效果：
  - 测试通过且输出更干净，避免大量无关日志影响排查。

## 优化 4：数据加载链路
- `preloadManifest` 从串行加载改为并发加载（保持输出结构不变）。
- 文件：`frontend/src/services/DataLoaderService.ts`
- 效果：
  - 工作区首次加载/切换数据时延下降。

## 优化 5：弹道预览行为与性能
- 新增预览工具函数，统一持续时间与轨迹点计算：
  - `normalizeDurationFrames`
  - `segmentDurationToMs`
  - `buildTrajectoryPoints`
- 文件：`frontend/src/services/ProjectilePreviewUtils.ts`
- 兼容策略：
  - 以“帧”为唯一单位（输入/显示/存储均为帧）。
- 面板与预览同步：
  - 面板时长输入显示为帧
  - 预览动画按帧换算成毫秒播放
- 缓动补全：
  - 补齐面板里所有 easing（含 Elastic/Back/Bounce 全套 In/Out/InOut）
- 文件：
  - `frontend/src/components/panels/ProjectilePanel.tsx`
  - `frontend/src/components/common/ProjectileCanvas.tsx`
- 测试：
  - 新增 `frontend/src/services/ProjectilePreviewUtils.test.ts`

## 验证结果
- `bunx tsc --noEmit` ✅
- `bun run test --run` ✅（32/32）
- `bun run build` ✅
- `go test ./...` ✅
- `go build ./...` ✅
