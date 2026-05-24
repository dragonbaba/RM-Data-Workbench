# 掉落模式与敌人掉落规则

## 职责
- 记录 `drop` 模式的入口、主文件归属、掉落字段结构和界面行为。
- 约束敌人掉落的引用来源、失效引用显示和脏标记策略。
- 记录掉落模式与外部数据刷新、SaveAll 的联动规则。

## 当前实现
- `drop` 模式由 `app.go` 的模式菜单触发，前端通过 `useFileOperations` 接管。
- 掉落模式始终以 `Enemies.json` 为主文件，不引入独立 `fileType` 或扩展文件。
- 若切换到 `drop` 模式时当前文件不是 `Enemies.json`，系统会自动打开 `Enemies.json`。
- 左侧列表继续复用通用 `LeftPanel`，但在 `drop` 模式下标题固定为“敌人列表”。
- 右侧使用独立 `DropPanel`，负责展示当前敌人摘要、普通掉落条目编辑区和图鉴挑战掉落编辑区。

## enemyDrops 数据约定
- 当前敌人的掉落字段固定为 `enemyDrops`。
- `enemyDrops` 的条目结构固定为：
  - `dropType`
  - `dropChance`
  - `isRare`
  - `dropId`
- `dropType` 的显示文案与持久化值固定映射为：
  - `0 = 物品`
  - `1 = 武器`
  - `2 = 防具`
- `dropChance` 范围固定为 `0-100`，允许小数。
- `isRare` 为可选布尔字段，缺失时按 `false` 处理。

## 初始化与编辑规则
- 当前敌人不存在 `enemyDrops` 时，不做全表批量补齐。
- 仅当用户选中该敌人进入编辑态时，面板才会把 `enemyDrops` 补成空数组。
- 初始化空数组后，会同时标记：
  - `Enemies.json` 文件为脏
  - 当前敌人索引为脏
- 掉落条目支持：
  - 新增
  - 删除
  - 修改 `dropType`
  - 修改 `dropChance`
  - 修改 `isRare`
  - 修改 `dropId`
- 图鉴挑战掉落支持：
  - 修改星级 `dropRateMultiplier`
  - 修改星级 `goldMultiplier`
  - 修改星级 `expMultiplier`
  - 新增、删除和修改 `extraRewards`
- 条目编辑直接写入前端缓存，统一交给现有 SaveAll / 保存链路落盘。
- 当前面板布局固定为四列：
  - `掉落类型`
  - `掉落概率`
  - `是否稀有`
  - `掉落目标`
- 其中前三列保持紧凑，最后一列“掉落目标”占主要宽度。

## 引用来源与失效引用规则
- `dropType = 0` 的候选项来自 `Items.json`。
- `dropType = 1` 的候选项来自 `Weapons.json`。
- `dropType = 2` 的候选项来自 `Armors.json`。
- 三类候选项都保留 `0 : 未选择` 占位项。
- 若当前 `dropId` 在目标数据源中不存在：
  - 不会自动清空
  - 面板会注入 `已失效引用` 占位显示
  - 原始 `dropId` 会继续保留，避免无声丢数据
- 当用户切换 `dropType` 后，如果原 `dropId` 在新数据源中无效，会自动回落为 `0`。

## 图鉴挑战掉落规则
- 图鉴挑战掉落仍保存到当前敌人的 `bookChallenge` 顶层结构，不新增独立数据源。
- 掉落模式只维护 `enemy.bookChallenge.stars[]` 中的掉落相关字段：
  - `dropRateMultiplier`
  - `goldMultiplier`
  - `expMultiplier`
  - `extraRewards`
- 属性模式继续维护图鉴挑战的非掉落字段：
  - `challengeTroopId`
  - `star`
  - `goldCost`
  - `levelRequirement`
  - `baseParamRate`
  - `passiveStates`
- `extraRewards` 的条目结构固定为：
  - `rewardType`
  - `dataId`
  - `amount`
- `rewardType` 的显示文案与持久化值固定映射为：
  - `gold = 金币`
  - `item = 物品`
  - `weapon = 武器`
  - `armor = 防具`
- 金币奖励不需要 `dataId`，编辑时固定为 `0`。
- 物品、武器、防具奖励的候选项分别来自 `Items.json`、`Weapons.json`、`Armors.json`。
- 若 `extraRewards[].dataId` 在目标数据源中不存在：
  - 不会自动清空
  - 面板会注入 `已失效引用` 占位显示
  - 原始 `dataId` 会继续保留，避免无声丢数据

## 外部刷新与保存规则
- 掉落模式的依赖白名单固定为：
  - `Enemies.json`
  - `Items.json`
  - `Weapons.json`
  - `Armors.json`
- 这些文件发生外部变化时，`BaseDataReloadService` 会把掉落模式判定为依赖命中，并要求确认刷新。
- 掉落模式继续复用现有：
  - `markFileDirty`
  - `markItemDirty`
  - `saveFile`
  - `saveAllFiles`
- 掉落模式不新增单独保存按钮，保存语义完全依赖现有文件保存链路。

## 相关依赖
- `app.go`
- `frontend/src/types/index.ts`
- `frontend/src/hooks/useFileOperations.ts`
- `frontend/src/stores/editorStore.ts`
- `frontend/src/components/layout/LeftPanel.tsx`
- `frontend/src/components/layout/MainContent.tsx`
- `frontend/src/components/panels/DropPanel.tsx`
- `frontend/src/components/panels/DropPanel.test.tsx`
- `frontend/src/services/BaseDataReloadService.ts`
- `frontend/src/services/BaseDataReloadService.test.ts`

## 当前约束
- 掉落模式只能在 `Enemies.json` 上使用。
- `enemyDrops` 缺失时的补齐时机固定为“当前敌人进入编辑态”，不能升级为进入模式即全量补齐。
- 失效引用必须可见，不能在界面层静默清洗。
- 图鉴挑战星级本身仍由属性模式创建和删除，掉落模式不负责新增或删除 `bookChallenge.stars[]`。
- 掉落模式更新图鉴挑战掉落时必须保留同一星级上的非掉落字段。
- 若后续要做“掉落总览工作台 / 批量掉落编辑器”，需要重新评估是否继续保持 `Enemies.json` 主文件模式。

## 近期验证
- `bun run test --run src/components/panels/DropPanel.test.tsx` ✅
- `bunx tsc --noEmit` ✅
- `bun run build` ✅
- `bun run lint` ⚠️ 当前项目存在既有 lint 错误，非本次变更新增
- `bunx tsc --noEmit` ✅
- `bun run test --run src/services/BaseDataReloadService.test.ts` ✅
- `bun run build` ✅
- `go test ./...` ✅
- `go build ./...` ✅
