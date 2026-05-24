# 项目上下文

## 基本信息
- 项目名称：MyNewEditor
- 项目类型：RPG Maker 数据扩展编辑器
- 工作形态：桌面应用，面向数据库、地图、脚本、弹道、任务与扩展规则编辑

## 当前架构
- 后端：Go + Wails
- 前端：React + TypeScript + Zustand + Ant Design + Monaco + Pixi
- 前端包管理与构建：Bun
- 主要运行模式：
  - `property`
  - `note`
  - `script`
  - `effect`
  - `equip`
  - `drop`
  - `projectile`
  - `quest`
  - `map`

## 当前项目状态
- 普通数据库文件已纳入统一预载与缓存管理。
- 地图采用“索引先行、内容按需加载”的双层模型。
- 装备模式已从原生数据库写回中分离出 `EquipExtensions.json` 作为扩展数据源。
- 掉落模式已接入 `Enemies.json` 主文件模型，并直接写回 `enemyDrops`。
- 未保存保护已经统一到模式切换、数据切换、程序关闭三条链路。
- 脚本编辑器已收口为无时间戳命名、真实 dirty 判定和稳定的 SaveAll 消费逻辑。
- 效果模式已收口到严格模板协议：
  - 不再保留旧 effect 兼容迁移层
  - 不再支持顶层 `module`
  - 不再支持 `custom_script_effect`
  - `ops` 已改为结构化编辑

## 当前关键模块
- 数据与地图加载：
  - `frontend/src/services/DataLoaderService.ts`
  - `frontend/src/services/BaseDataReloadService.ts`
  - `frontend/src/stores/editorStore.ts`
- 文件操作与保存：
  - `frontend/src/hooks/useFileOperations.ts`
  - `frontend/src/services/DataFileFormatService.ts`
- 脚本编辑：
  - `frontend/src/components/panels/CodeEditorPanel.tsx`
  - `frontend/src/services/ScriptOperations.ts`
  - `frontend/src/services/ScriptCacheManager.ts`
- 效果编辑：
  - `frontend/src/components/panels/EffectPanel.tsx`
  - `frontend/src/services/GameEffectService.ts`
- 装备与弹道：
  - `frontend/src/components/panels/EquipPanel.tsx`
  - `frontend/src/components/panels/DropPanel.tsx`
  - `frontend/src/components/panels/ProjectilePanel.tsx`
  - `frontend/src/components/common/ProjectileCanvas.tsx`

## 当前知识库口径
- `CHANGELOG.md` 与 `archive/` 保留历史演进与方案包记录。
- `modules/` 文档以“当前真实状态”为准，不继续堆叠旧协议或旧阶段描述。
- 若代码与文档冲突，以代码为准，并回写知识库。

## 当前约束
- 地图内容文件禁止进入启动预载。
- 外部文件变化命中规则当前仍是白名单，而非全量依赖图。
- 效果系统当前严格依赖 `GameEffectService` 作为协议事实源，面板层不能自行扩展字段。
- 脚本旧版时间戳文件名不再兼容保存。

## 当前验证基线
- 前端：
  - `bunx tsc --noEmit`
  - `bun run build`
  - 相关面板或服务测试按需执行
- 后端：
  - `go test ./...`
  - `go build ./...`

## 主要模块入口
- 总索引：`helloagents/INDEX.md`
- 变更记录：`helloagents/CHANGELOG.md`
- 模块索引：`helloagents/modules/_index.md`
