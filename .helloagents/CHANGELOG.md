# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added
- **[物品等级上限特殊效果编辑]**: `PropertyPanel` 在 `Items.json` 属性模式下改为编辑顶层 `levelLimitBreakAmount`，避免 RPG Maker 编辑器写回 `effects` 时丢失等级上限提升量；`RPGItem` 类型新增该字段，`DataAuditService` 回归覆盖该字段和标准 effects 对象不被修复清除。 — by Zaun
  - 类型: 功能新增（无方案包）
  - 文件: `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/types/index.ts`, `frontend/src/services/DataAuditService.test.ts`, `.helloagents/modules/equip-mode-and-system-rules.md`
  - 验证: `npm test -- --run src/services/DataAuditService.test.ts`; `npm run build`
- **[战车核心槽引擎/C装置混排]**: `EquipExtensionsService.normalizeEquipExtensions()` 移除战车核心槽 `slotIndex 5/7` 固定映射，`slotIndex 5..8` 默认模板现在会补齐 `0->7`、`0->8` 与 `7<->8` 改造 transition，允许四格在引擎和 C 装置之间混排；底盘 `slotIndex 9` 仍固定。 — by Zaun
  - 类型: 功能调整（无方案包）
  - 文件: `frontend/src/services/EquipExtensionsService.ts`, `frontend/src/services/EquipExtensionsService.test.ts`, `.helloagents/modules/equip-mode-and-system-rules.md`
  - 验证: `npm test -- --run src/services/EquipExtensionsService.test.ts`
- **[跨条目数据复制]**: 装备模式、改造模式与属性模式（强化耗材）新增"复制到…"批量复制功能，通过共享组件 `CopyToTargetModal` 支持多选目标、搜索过滤。装备模式复制角色装备槽位与初始装备；改造模式复制改造规则（含 transitions/conditions 深拷贝）；属性模式复制 `upgradeCosts` 强化耗材到其他武器/防具。复制后标记目标为已修改，遵循现有保存链路。 — by Zaun
  - 类型: 功能新增（无方案包）
  - 文件: `frontend/src/components/common/CopyToTargetModal.tsx`, `frontend/src/components/panels/EquipPanel.tsx`, `frontend/src/components/panels/RefitPanel.tsx`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/components/common/CopyToTargetModal.test.tsx`
  - 验证: `bunx tsc --noEmit` ✅；`npx vitest run` ✅（232/232）；`npx vite build` ✅
- **[职业拓展等级曲线协议]**: `ClassLevelExtensions.json` 升级到 `schemaVersion: 2` 曲线配置协议；职业拓展等级面板改为维护最大等级、经验四参数、每项属性最大等级目标值和独立成长模式，并自动预览 100 级到最大等级的经验与属性，不再要求逐级手动新增。 — by Zaun
  - 方案: [202606120358_class-level-extension-curves](archive/2026-06/202606120358_class-level-extension-curves/)
  - 决策: class-level-extension-curves#D001(使用曲线配置作为权威数据)
  - 验证: `bun run test --run src/services/ClassLevelExtensionsService.test.ts src/services/DataLoaderService.test.ts src/services/BaseDataReloadService.test.ts src/components/panels/ClassLevelExtensionsPanel.test.tsx src/components/panels/PropertyPanel.test.tsx` ✅；`bunx tsc --noEmit` ✅
- **[职业拓展等级数据源]**: 新增 `ClassLevelExtensions.json` 独立 object JSON 协议和职业属性模式“拓展等级”面板，用于维护 99 级以后经验与 8 项基础属性成长；加载链会首次创建空结构，reload/watch/save 链路均纳入该扩展文件，编辑时只标脏 `ClassLevelExtensions.json`。 — by Zaun
  - 方案: [202606120315_class-level-extensions](archive/2026-06/202606120315_class-level-extensions/)
  - 决策: class-level-extensions#D001(采用独立固定协议 JSON 而非扩展 Classes.json)
  - 验证: `bun run test --run src/services/ClassLevelExtensionsService.test.ts src/services/DataLoaderService.test.ts src/services/BaseDataReloadService.test.ts src/components/panels/ClassLevelExtensionsPanel.test.tsx src/components/panels/PropertyPanel.test.tsx` ✅；`bunx tsc --noEmit` ✅；`go test ./backend/services` ✅
- **[装备品质等级锁定协议]**: 武器、防具属性模式新增顶级 `qualityLevel`，与既有 `qualityLock` 组成固定品质协议；`EquipmentQualityProtocolService` 集中执行 `0-6` clamp，属性面板保存链、`EquipmentPropertyService` 标准化和 `DataAuditService` 修复模式统一补齐并收敛该字段。 — by Zaun
  - 方案: [202606092124_equipment-quality-level-contract](D:/RMProjects/MyGame/.helloagents/archive/2026-06/202606092124_equipment-quality-level-contract/)
  - 决策: equipment-quality-level-contract#D001(集中归一化服务)
  - 文件: `frontend/src/services/EquipmentQualityProtocolService.ts`, `frontend/src/services/EquipmentPropertyService.ts`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/types/index.ts`
- **[Owner Params 基础属性恢复]**: 属性面板新增 `ownerParams.baseParams / paramRate` 两组编辑入口，角色/职业/敌人/状态/武器/防具均可维护 owner 基础属性加值与倍率追加；`OwnerParamsPropertyService` 与 `DataAuditService` 修复模式同步补齐默认数组并保留 legacy `paramRate` 迁移。 — by Zaun
  - 类型: 回退性修复（无方案包）
  - 文件: `frontend/src/types/index.ts`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/services/OwnerParamsPropertyService.ts`, `frontend/src/services/DataAuditService.ts`

- **[武器可被迎击覆盖]**: 武器属性面板新增 `interceptableMode` 三态字段：沿用攻击技能设置、强制可被迎击、强制不可被迎击；修复模式会给武器补齐默认 `-1`，并把非法值收敛回沿用技能设置。 — by Zaun
  - 类型: 功能新增（无方案包）
  - 文件: `frontend/src/types/index.ts`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/services/EquipmentPropertyService.ts`, `frontend/src/services/EquipmentPropertyService.test.ts`


- **[敌群出现条件 meetCondition]**: 敌群属性面板新增出现条件模块，固定两个条件行：开关选择+Toggle、变量选择+操作符(>=/<=/===)+数值输入。新增 `TroopMeetCondition` 类型 + `TROOP_MEET_CONDITION_DEFAULT` 冻结常量；`DataAuditService` 修复模式自动补齐缺失字段，`EquipExtensions.json` 移除出审计目标。 — by Zaun
  - 文件: `frontend/src/types/index.ts`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/services/DataAuditService.ts`, `frontend/src/services/DataAuditService.test.ts`
- **[性能与CSS优化]**: 全局消除内联样式分配：`style={{width}}`→`className` (~80处)、Card `headStyle/bodyStyle`→全局CSS (26处)、`JSON.stringify`比较→`arePlainDataEqual`；内联正则字面量全部迁移到 `constants/regexp.ts`；面板标题统一 `.panel-title` 类；新增 `text-accent/text-muted/bg-surface/border-b-color` 语义CSS工具类。 — by Zaun
  - 文件: 16 files, `frontend/src/styles/global.css`, `frontend/src/services/StateChargePropertyService.ts`, etc.

- **[敌人属性与技能覆盖]**: 敌人技能覆盖面板新增 `skillUseCount` 技能使用次数上限字段（-1=无限次），`EnemyPropertyService` 新增 `normalizeSkillUseCount` 并接入修复模式自动补齐缺失值为 `-1`；属性面板和技能覆盖卡片所有 `<Select>` 统一补上 `showSearch + optionFilterProp="label"` 实现输入捕获。 — by Zaun
  - 文件: `frontend/src/types/index.ts`, `frontend/src/services/EnemyPropertyService.ts`, `frontend/src/components/panels/EnemyActionOverridesCard.tsx`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/services/DataAuditService.test.ts`
- **[敌人强制技能选择标记]**: 敌人技能覆盖面板新增 `forceWhenValid` 布尔开关（默认 false），写入 `actionOverrides[skillId]`；`EnemyPropertyService` 与 `DataAuditService` 修复模式统一补齐缺失字段，运行时由 MyGame `Zaun_GameBattler` 在行动有效时强制选中该技能。 — by Zaun
  - 类型: 功能新增（无方案包）
  - 文件: `frontend/src/types/index.ts`, `frontend/src/services/EnemyPropertyService.ts`, `frontend/src/components/panels/EnemyActionOverridesCard.tsx`, `frontend/src/services/EnemyPropertyService.test.ts`, `frontend/src/services/DataAuditService.test.ts`, `frontend/src/components/panels/EnemyActionOverridesCard.test.tsx`, `D:/RMProjects/MyGame/js/plugins/Zaun_GameBattler.js`
  - 验证: `npm test -- EnemyPropertyService.test.ts DataAuditService.test.ts EnemyActionOverridesCard.test.tsx`; `npx tsc --noEmit`; `node --check D:/RMProjects/MyGame/js/plugins/Zaun_GameBattler.js`

- **[数据加载与地图管理]**: 地图属性面板新增 `fixedWeather` 固定天气字段，下拉维护 `none/rain/snow/wind/bubble/blood_rain`，空值保存为未固定；字段写入 `MapXXX.json` 顶层并由 MyGame 运行时 `TimeSystem` 消费。 — by Zaun
  - 方案: [202605180123_fixed-map-weather](D:/RMProjects/MyGame/.helloagents/archive/2026-05/202605180123_fixed-map-weather/)
  - 决策: fixed-map-weather#D001(固定地图天气由 TimeSystem 管理)

### Changed
- **[奖励加成线性结算]**: 图鉴挑战 `dropRate/gold/exp` 从乘数切为严格加成字段 `dropRateBonus/goldBonus/expBonus`；周目经验/金钱/掉率插件参数同步改为加成语义；战斗结算改为 `1 + 图鉴挑战加成 + 周目加成 + 团队加成` 线性累加，并批量迁移 MyGame 旧数据。 — by Zaun
  - 类型: 破坏性协议切换（无兼容）
  - 文件: `frontend/src/types/index.ts`, `frontend/src/components/panels/DropPanel.tsx`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/services/*`, `D:/RMProjects/MyGame/js/plugins/Zaun_GameVariable.js`, `D:/RMProjects/MyGame/js/plugins/Zaun_GameUnit.js`, `D:/RMProjects/MyGame/js/plugins/Zaun_SceneBattle.js`, `D:/RMProjects/MyGame/data/*.json`
  - 平衡: 线性加成按 `0.1→0.03 / 0.2→0.06 / 0.3→0.09 / >=0.4→0.12` 收敛，所有经验/掉率/金币奖励加成数据上限不超过 `0.12`。

### Fixed
- **[效果模式保存全部草稿刷新]**: 保存当前文件/保存全部前会广播 `editor:flush-pending-draft`，效果面板收到后立即清掉延迟自动保存计时器并把当前草稿同步进 `currentData` 缓存；修复连续修改多个效果后，保存全部每次只落盘一个效果并只清掉一个 dirty 索引的问题。新增回归测试覆盖保存前强制 flush 时当前效果与既有脏索引一起保留。 — by Zaun
  - 类型: 快速修复（无方案包）
  - 文件: `frontend/src/components/panels/EffectPanel.tsx`, `frontend/src/hooks/useFileOperations.ts`, `frontend/src/core/EventSystem.ts`, `frontend/src/types/index.ts`, `frontend/src/stores/editorStore.ts`, `frontend/src/components/panels/EffectPanel.test.tsx`

- **[任务目标累计语义]**: 任务面板的“累计获取”开关收敛到原版数量型目标，仅变量值、金钱、杀怪数、收集物品、武器、防具可切换累计/非累计；开关目标不再显示该选项。新增回归测试覆盖可显示类型与开关隐藏语义。 — by Zaun
  - 类型: 回归修复（无方案包）
  - 文件: `frontend/src/components/panels/QuestPanel.tsx`, `frontend/src/components/panels/QuestPanel.test.ts`
- **[C 装效果语义]**: 效果模板 `single_cunit_bonus` 展示语义改为“C 装携带奖励”，明确每个已装备 C 装置自身携带的 effect 会独立生效并可叠加，不再误导为 owner 只能装备一个 C 装置。 — by Zaun
  - 类型: 语义修正（无方案包）
  - 文件: `frontend/src/services/GameEffectService.ts`, `frontend/src/services/GameEffectService.test.ts`

- **[前后端交互与性能修复记录]**: 修复右侧主面板在窗口缩放后被内容撑出屏幕的问题；主布局、主内容、面板宿主和脚本编辑器关键 flex 容器已补齐 `min-w-0/min-h-0/overflow-hidden`，脚本路径和错误文本改为截断显示，Monaco 容器可随窗口收缩。 — by Zaun
  - 方案: [202605291216_right-panel-container-bounds](archive/2026-05/202605291216_right-panel-container-bounds/)
  - 决策: right-panel-container-bounds#D001(用 flex 最小尺寸约束修复主布局溢出)
- **[弹道与保存防回归基线]**: 弹道预览轨迹现在按预览配置追溯 `weapon.attackSkillId -> skill.projectileId -> Projectiles.json` 或 `skill.projectileId -> Projectiles.json`，左侧弹道模板切换/编辑不再重置预览面板，也不再改变预览轨迹来源。 — by Zaun
  - 方案: [202605291430_projectile-preview-template-lookup](archive/2026-05/202605291430_projectile-preview-template-lookup/)
  - 决策: projectile-preview-template-lookup#D001(预览轨迹与左侧选中模板解耦)
- **[弹道与保存防回归基线]**: 弹道预览辅助轨迹线改为按每段 `easeX/easeY/easing` 采样绘制，避免非线性缓动仍显示成直线折线；播放动画和轨迹线现在共用同一套 easing 解析逻辑。 — by Zaun
  - 类型: 快速修改（无方案包）
  - 文件: frontend/src/components/common/ProjectileCanvas.tsx
- **[前后端交互与性能修复记录]**: 脚本 dirty 显示改为订阅 `ScriptCacheManager` 的 clean/dirty 状态转换事件，已有脚本编辑后会在脚本列表和标题显示未保存标记，保存后同步清除。 — by Zaun
  - 方案: [202605291430_projectile-preview-template-lookup](archive/2026-05/202605291430_projectile-preview-template-lookup/)
  - 决策: projectile-preview-template-lookup#D004(脚本 dirty 显示以 ScriptCacheManager 内容差异为事实源)
- **[弹道预览轨迹坐标语义]**: `buildTrajectoryPoints` 非最后一段的 `targetX/targetY` 原来被当作绝对值使用，导致途径点坐标脱离起点基线；现改为链式累加语义（从起点开始逐段叠加偏移），与运行时 `Zaun_Projectile.js` 的 `buildSegmentPoints` 保持一致。 — by Zaun
  - 文件: `frontend/src/services/ProjectilePreviewUtils.ts`, `frontend/src/services/ProjectilePreviewUtils.test.ts`
- **[敌人属性与技能覆盖]**: 弱点组编辑器改进：标签统一为"弱点倍率 (正数=弱点)"，InputNumber 新增 `min={0}` 禁止负数输入，`normalizeEnemyWeaknessSlot` 对 rate 执行 `Math.abs()` 强制正数；`EnemyPropertyService` 新增 `normalizeWeaknessSlot/normalizeWeaknessGroup` 并接入 `normalizeEnemyDataEntry` 修复模式，自动修正历史数据的负数弱点和缺失字段。 — by Zaun
  - 文件: `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/services/EnemyPropertyService.ts`
- **[数据加载与地图管理]**: `MapPanel` 移除“保存地图信息”按钮，地图属性字段变化时立即调用 `updateCurrentMapData()` 同步当前 `MapXXX.json` 缓存并标记 dirty；回归测试覆盖不点击保存按钮也会进入 dirty。 — by Zaun
- **[数据加载与地图管理]**: `editorStore.updateCurrentMapData()` 现在统一负责地图内容缓存同步与 dirty 标记，修复地图属性修改后没有进入 dirtyFiles、SaveAll 不保存 `MapXXX.json` 的问题；新增 `MapPanel` 回归测试覆盖属性保存后的 dirty 与缓存更新。 — by Zaun
  - 方案: [202605180137_map-dirty-save-chain](D:/RMProjects/MyGame/.helloagents/archive/2026-05/202605180137_map-dirty-save-chain/)
  - 决策: map-dirty-save-chain#D001(地图 dirty 标记收口到 updateCurrentMapData)
- **[装备模式与系统规则]**: 武器、防具属性模式新增顶层 `upgradeCosts[]` 强化耗材协议和“强化耗材”编辑卡片，可逐级维护强化金币、必需物品/数量、保底物品/数量；标准化链和修复模式会为缺失字段补空数组，`MyGame` 运行时对接补丁说明已随方案包输出。 — by Zaun
  - 方案: [202604241832_equipment-upgrade-costs](archive/2026-04/202604241832_equipment-upgrade-costs/)
  - 决策: equipment-upgrade-costs#D001(`upgradeCosts[index]` 严格对应目标强化等级 `index + 1`)
- **[装备模式与系统规则]**: `upgradeCosts[]` 单级配置新增 `successRate`，属性面板按 `0-100` 百分比编辑；缺失值按旧公式 `100 / 目标强化等级` 补齐，运行时应改为读取装备数据决定每级强化成功率。 — by Zaun
  - 方案: [202604241832_equipment-upgrade-costs](archive/2026-04/202604241832_equipment-upgrade-costs/)
  - 决策: equipment-upgrade-costs#D002(每级成功率属于装备数据，不再由强化插件公式统一管理)

- **[效果模式条件字段输入]**: 条件字段的槽位索引、装备槽位类型、武器类型、防具类型改为保留正在输入的原始文本，不再在每次按键后立即格式化成数值数组字符串；现在可直接输入 `0`，也可用中文逗号 `，` 连续输入列表，保存/自动 flush 时仍按数值数组写回。 — by Zaun
  - 类型: 快速修复（无方案包）
  - 验证: `npm test -- --run src/components/panels/EffectPanel.test.tsx` ✅；`npm run build` ✅
  - 文件: `frontend/src/components/panels/EffectPanel.tsx`, `frontend/src/components/panels/EffectPanel.test.tsx`

- **[效果模式发射期连发提示]**: 效果面板的属性操作区域新增 `actionRepeat` 运行时提示，区分会按条件字段写入武器的装备实例模板与只写 owner 车辆属性、战斗发射期不会读取的模板，避免把“槽位/装备类型条件 + 发射期连发”配到无效效果类型上。 — by Zaun
  - 类型: 快速提示修复（无方案包）
  - 验证: `npm test -- --run src/components/panels/EffectPanel.test.tsx`; `npm run build`
  - 文件: `frontend/src/components/panels/EffectPanel.tsx`, `frontend/src/components/panels/EffectPanel.test.tsx`

### Fixed
- **[装备模式与系统规则]**: 改造模式面板现在只展示当前槽位来源类型对应的目标规则，隐藏同槽位其它来源类型的互转规则；读取和保存时都会保留 transition 自身的 `fromEquipTypeId`，避免主炮槽里重复出现多个“主炮”目标并防止保存污染互转数据。 — by Zaun
  - 文件: `frontend/src/components/panels/RefitPanel.tsx`, `frontend/src/services/EquipExtensionsService.ts`, `frontend/src/services/EquipExtensionsService.test.ts`

- **[装备模式与系统规则]**: `EquipExtensionsService.normalizeEquipExtensions()` 现在会补齐改造模式同槽位正数装备类型的互相转换 transition；新增规则按目标类型已有 transition 复制金币价格与条件，保证保存/修复后的 `EquipExtensions.json` 允许战车槽位改造后继续改造。 — by Zaun
  - 文件: `frontend/src/services/EquipExtensionsService.ts`, `frontend/src/services/EquipExtensionsService.test.ts`

- **[装备模式与系统规则]**: 修复模式重新纳入 `EquipExtensions.json` 检查；当角色带 `isTank` 标识但 `actorRefitRules` 缺失或无 transition 时，会按 `actorEquipSlots` 生成默认战车改造模板，并保证同类 transition 价格随 actorId 单调递增、不低于前一角色。 — by Zaun
  - 类型: 修复模式增强（无方案包）
  - 文件: `frontend/src/services/EquipExtensionsService.ts`, `frontend/src/services/DataAuditService.ts`, `frontend/src/services/EquipExtensionsService.test.ts`, `frontend/src/services/DataAuditService.test.ts`

- **[装备模式与系统规则]**: 修复 `EquipExtensions.json` 修复模式每次都被误判为已修改的问题；规范化比较改为结构相等而非 `JSON.stringify` 文本顺序比较，避免仅因对象键顺序不同就重复写回。 — by Zaun
  - 类型: 回归修复（无方案包）
  - 文件: `frontend/src/services/EquipExtensionsService.ts`, `frontend/src/services/EquipExtensionsService.test.ts`

- **[装备模式与系统规则]**: 修复武器范围修复模式误改协议的问题；`RangePropertyService` 与 `EquipmentPropertyService` 现在保留有效 `areaMode/shapeType/areaTargetCount/repeatTime`，只补齐缺失或非法字段，`DataAuditService` 回归覆盖扇形、圆形、受控线形、贯穿和全体模式，避免 `132 散射弩` 这类扇形武器被修成圆形，也避免 `areaMode=3/4` 被误当普通范围重建。 — by Zaun
  - 方案: [202605090325_weapon-range-repair-mode-preserve-protocol](archive/2026-05/202605090325_weapon-range-repair-mode-preserve-protocol/)
  - 决策: weapon-range-repair-mode-preserve-protocol#D001(修复模式保留有效协议)

- **[前后端交互与性能修复记录]**: 备注编辑已迁移进属性模式，菜单不再提供独立“备注模式”；属性面板新增紧凑“文本与备注”区块，继续维护 `description/note/meta`，并修复描述输入按 Enter 后空行被过滤导致编辑态回到第一行的问题。 — by Zaun
  - 方案: [202605021317_note-to-property-mode](archive/2026-05/202605021317_note-to-property-mode/)
  - 决策: note-to-property-mode#D001(移除独立备注模式入口)
- **[前后端交互与性能修复记录]**: 武器属性面板的基础属性区已新增顶层 `weaponImageId` 编辑入口，输入与保存统一收口为 `>=1` 的整数；武器标准化和修复模式也会在字段缺失时补齐 `weaponImageId: 1`，不再把它留在备注协议里做主写入口。 — by Zaun
  - 方案: [202604211129_add-weapon-image-id-field](archive/2026-04/202604211129_add-weapon-image-id-field/)
  - 决策: add-weapon-image-id-field#D001(`weaponImageId` 作为武器顶层正式字段维护)
- **[数据加载与地图管理]**: 外部文件监听确认链路已补上队列级去重；`useFileOperations` 现在通过 `ExternalDataChangeQueue` 统一处理标准化路径聚合、会话内抑制和短时冷却，避免同一数据文件在一次确认/重载处理期间因重复写入连续弹出近似提示，同时会在下一轮批次前追加短聚合窗口，收紧多文件连续变化时的弹窗数量。 — by Zaun
  - 方案: [202604211053_fix-external-change-prompt-dedup](archive/2026-04/202604211053_fix-external-change-prompt-dedup/)
  - 决策: fix-external-change-prompt-dedup#D001(在队列层做会话抑制和短时冷却，而不是仅靠批次 Map 清空)
- **[前后端交互与性能修复记录]**: 修复范围表单初始化竞态；`PropertyPanel` 与 `EnemyActionOverridesCard` 的自动收口链路现在会先读取表单当前真实值，再决定是否纠正，避免合法的扇形/范围目标数在条件挂载阶段被默认 watch 值覆盖成圆形或默认值。 — by Zaun
  - 方案: [202604211040_fix-range-form-initialization](archive/2026-04/202604211040_fix-range-form-initialization/)
  - 决策: fix-range-form-initialization#D001(收口逻辑基于表单真实值而非 watch 默认值)
- **[弹道与保存防回归基线]**: 弹道模板持久化协议已移除预览态 `sourceType/sourceId/targetType/targetId/weaponId/skillId`；新建、复制、普通编辑保存和修复模式都会剥离历史字段，并已清理当前 `MyGame` 两份 `Projectiles.json`。 — by Zaun
  - 方案: [202604201650_projectile-preview-field-cleanup](archive/2026-04/202604201650_projectile-preview-field-cleanup/)
  - 决策: projectile-preview-field-cleanup#D001(预览态不进入弹道持久化协议)
- **[掉落模式与敌人掉落规则]**: 图鉴挑战掉落已从敌人属性模式拆出，改由掉落模式的独立“图鉴挑战掉落”区块维护；保存仍写回原 `enemy.bookChallenge.stars[]`，普通 `enemyDrops` 数据结构不变。 — by Zaun
  - 方案: [202604201626_enemy-challenge-drop-mode-split](archive/2026-04/202604201626_enemy-challenge-drop-mode-split/)
  - 决策: enemy-challenge-drop-mode-split#D001(图鉴挑战掉落归属 drop 模式)
- **[前后端交互与性能修复记录]**: 属性面板的平面基础属性链已按文件类型收紧；`Actors/Enemies/Weapons/Armors` 才允许写顶层 `params`，其中 `floatParams` 进一步只保留给 `Weapons/Armors`。`Classes` 不再经过这条保存链，避免职业成长矩阵被错误压扁。 — by Zaun
- **[前后端交互与性能修复记录]**: `DataAuditService` 已补字段归属修复：`Classes` 强制归一为 8×100 等级矩阵；`Skills/Items/States` 会清掉非法 `params/floatParams`；`Enemies` 会清掉未被运行时消费的 `floatParams`。清理写回统一改成赋 `undefined` 后落盘，不再在修复链里直接 `delete`。 — by Zaun

### 快速修改
- **[前后端交互与性能修复记录]**: 数据体检/修复模式已移除 `EquipExtensions.json` 规范化写回分支；装备扩展数据继续随编辑器加载进入缓存，只有显式保存装备相关配置时才写回。 — by Zaun
  - 类型: 快速修改（无方案包）
  - 文件: frontend/src/hooks/useFileOperations.ts:683-725
- **[前后端交互与性能修复记录]**: 数据体检/修复模式新增 `description` 预解析；持有字符串描述的条目会按换行拆成 `description: string[]`，已有数组直接跳过，运行时可直接按行绘制。 — by Zaun
  - 类型: 快速修改（无方案包）
  - 文件: frontend/src/services/DataAuditService.ts:65-183, frontend/src/services/DataAuditService.test.ts:22-152
- **[前后端交互与性能修复记录]**: 属性模式内“文本与备注”区块已改为描述、备注、元数据预览同一行三等分布局，并提高输入区与预览区高度。 — by Zaun
  - 类型: 快速修改（无方案包）
  - 文件: frontend/src/components/panels/NotePanel.tsx:145-201
- **[前后端交互与性能修复记录]**: 属性面板的额外统一属性、车属性和基础强化卡片已统一替换易混淆列名；额外/车属性改为“未强化值/随机浮动/每级强化追加/追加浮动”，基础强化改为“配置值/配置浮动/每级追加/追加浮动”，数据结构仍保持 `value/floatValue/upgradeValue/upgradeFloatValue` 不变。 — by Zaun
  - 类型: 快速修改（无方案包）
  - 文件: frontend/src/components/panels/PropertyPanel.tsx:117-3673

### Fixed
- **[装备类型语义修复与重映射保护]**: 修复 `PropertyPanel` 只写 `EquipExtensions.weaponEquipTypes` 不写 `Weapons.json.etypeId` 的双事实源问题，武器保存链现在同步回写原始条目 `etypeId`；`EquipPanel` 保存 `equipTypes/systemWeaponEquipTypes` 重排时新增 `weaponEquipTypes` 同步重映射，避免索引改名后整批武器语义漂移；`DataAuditService` 修复模式新增装备语义校验，按 `wtypeId` 回收武器 `主炮/副炮/SE/人类武器` 映射，并修正 `--发动机/--C装置/--底盘` 防具分组标题的错误 `etypeId`；装备候选列表也不再显示空名或占位条目。 — by Zaun
  - 类型: 修复（无方案包）
  - 文件: `frontend/src/components/panels/EquipPanel.tsx`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/services/EquipDataService.ts`, `frontend/src/services/EquipExtensionsService.ts`, `frontend/src/services/EquipmentPropertyService.ts`, `frontend/src/services/DataAuditService.ts`, `frontend/src/services/EquipExtensionsService.test.ts`, `frontend/src/services/EquipDataService.test.ts`, `frontend/src/services/EquipmentPropertyService.test.ts`, `frontend/src/services/DataAuditService.test.ts`
  - 验证: `npm test -- --run src/services/EquipExtensionsService.test.ts src/services/EquipmentPropertyService.test.ts src/services/EquipDataService.test.ts src/services/DataAuditService.test.ts src/components/panels/PropertyPanel.test.tsx` ✅；`npm run build` ✅

## [0.12.0] - 2026-04-11

### Added
- **[数据加载与地图管理]**: 地图属性面板新增“室内地图”开关，保存到顶层可选字段 `inRoom`；开启时写入 `true`，关闭时写回 `undefined`，避免对大量地图执行批量默认字段修复。 — by Zaun
- **[前后端交互与性能修复记录]**: 技能属性面板已新增结构化 `skillEffectSpec` 协议编辑区，统一维护 `damageType / damageElementId / allowCritical / damageScatter / formula / durabilityChange / skillDurability`；同时补上 `heal` 生命恢复类型，并把旧 `damage` 迁移严格限制在 `DataAuditService` 修复模式中。 — by Zaun

### Fixed
- **[前后端交互与性能修复记录]**: 地图列表切换入口已减少无效提示；重复点击当前地图直接 no-op，切换到已缓存的地图时复用缓存并静默切换，不再继续弹出“已加载地图”成功提示。 — by Zaun
- **[前后端交互与性能修复记录]**: 修复地图列表切换具体 `MapXXX.json` 时被误判为外部数据变化的问题；后端 watcher 现在会在 `SetActiveMapFile` 时同步更新当前地图快照基线，不再把 active map 监控目标切换解释成 `create/remove`。 — by Zaun
- **[前后端交互与性能修复记录]**: 修复选择地图后切换到属性等非地图面板时左侧地图列表被显示为空的问题；左侧列表现在以 `currentFileType === 'map'` 判定地图列表来源，不再被右侧 `uiMode` 切换带偏。 — by Zaun
- **[数据加载与地图管理]**: 地图室内语义已从备注 `meta.inRoom` 切到顶层 `inRoom` 字段；编辑器不再要求通过备注维护该值。 — by Zaun
- **[前后端交互与性能修复记录]**: 技能伤害/耐久协议区的脚本公式告警已改成稳定显示；切换技能时不再因为脚本导出异步重建短暂闪出黄色误报，真实异常会持续显示到配置被修正。 — by Zaun
- **[前后端交互与性能修复记录]**: 基础属性显示名称已切到 `System.json` 的 `$dataSystem.terms.params` 前 8 项，继续保持 `params / floatParams` 数组作为唯一存储协议；属性名修改后，编辑器基础属性区会同步刷新。 — by Zaun
- **[前后端交互与性能修复记录]**: 清理遗留总包 `202604091846_protocol-repair-mode-wave2`；该包未单独实施，已按“中间草稿并入正式归档包”口径归档，避免提交前残留活跃方案目录。 — by Zaun

### Performance
- **[前后端交互与性能修复记录]**: 属性面板和相邻主模式继续完成一轮高收益性能收紧：引用数据统一收口到 `referenceRevision` 驱动；`EffectPanel` 去掉 `JSON.stringify` 比较；`DropPanel / ProjectilePanel / LeftPanel / QuestPanel` 的大批量选项数组已改为 memo；`CodeEditorPanel` 的脚本预加载新增稳定清单去重。 — by Zaun

## [0.11.1] - 2026-04-09

### Fixed
- **[前后端交互与性能修复记录]**: 技能协议修复模式已收口为固定结构写回；`SkillPropertyService` 现在会为当前正式维护的技能字段补齐顶层协议与完整 `skillCosts[]` 记录，`baseSkillUtils` 与 `Window_ItemInfo` 则直接信任结构化数据，不再继续保留技能消耗字段缺失兜底。 — by Zaun
  - 方案: [202604091808_skill-fixed-structure-repair](archive/2026-04/202604091808_skill-fixed-structure-repair/)
  - 决策: skill-fixed-structure-repair#D001(技能协议固定字段由修复模式补齐，运行时不再保留字段兜底)

## [0.11.0] - 2026-04-09

### Added
- **[前后端交互与性能修复记录]**: `skillCosts` 协议已扩展 `goldRate / variableRate`；技能属性模式可直接编辑金币/变量百分比消耗，`SkillPropertyService` 与 `PropertyPanel` 已同步收口。 — by Zaun
  - 方案: [202604091753_skill-cost-rate-and-dispatch-optimization](archive/2026-04/202604091753_skill-cost-rate-and-dispatch-optimization/)
  - 决策: skill-cost-rate-and-dispatch-optimization#D001(金币和变量百分比采用独立类型而不是 mode 字段)

### Fixed
- **[前后端交互与性能修复记录]**: `baseSkillUtils` 与 `Window_ItemInfo` 的技能消耗分发已改为类型表驱动，不再沿用当前这条链路上的 `toIntOrZero + switch` 组合；`goldRate / variableRate` 现在按当前值百分比向上取整结算并显示。 — by Zaun
  - 方案: [202604091753_skill-cost-rate-and-dispatch-optimization](archive/2026-04/202604091753_skill-cost-rate-and-dispatch-optimization/)
  - 决策: skill-cost-rate-and-dispatch-optimization#D002(技能消耗分发改为类型表驱动)

## [0.10.0] - 2026-04-09

### Added
- **[前后端交互与性能修复记录]**: 技能属性模式新增结构化 `skillCosts` 编辑卡片；`SkillPropertyService` 已统一读写 `hp / hpRate / gold / variable / item / weapon / armor` 多来源消耗，并与 `MyGame` 运行时 `baseSkillUtils`、技能信息窗口 `Window_ItemInfo` 共用同一协议，变量显示变量名，物品/装备显示“数量 + 名称”。 — by Zaun
  - 方案: [202604091710_skill-cost-sources](archive/2026-04/202604091710_skill-cost-sources/)
  - 决策: skill-cost-sources#D001(使用结构化 `skillCosts[]` 统一编辑器和运行时协议)

## [0.9.4] - 2026-04-08

### Fixed
- **[前后端交互与性能修复记录]**: 数据体检/修复已覆盖 `Projectiles.json`，并通过 `normalizeProjectileDataEntry()` 统一规范历史弹道条目（补齐默认值、收口 `easeX/easeY`、清理旧 `easing` 字段）；`useFileOperations` 的修复确认文案也已同步纳入 `Projectiles.json`。 — by Zaun
  - 方案: [202604082242_editor-repair-mode-projectile-sync-tightening](archive/2026-04/202604082242_editor-repair-mode-projectile-sync-tightening/)
  - 决策: editor-repair-mode-projectile-sync-tightening#D001(修复模式补齐默认值，不保留运行时旧兜底)
- **[前后端交互与性能修复记录]**: `SkillPropertyService` 在缺失 targeting 字段时会直接补齐 `targetCamp/targetLifeState/selectMode/areaMode` 默认值；`BaseDataReloadService` 同步补齐技能面板依赖 `Projectiles.json` 外部变更时的确认提示文案。 — by Zaun
  - 方案: [202604082242_editor-repair-mode-projectile-sync-tightening](archive/2026-04/202604082242_editor-repair-mode-projectile-sync-tightening/)
  - 决策: editor-repair-mode-projectile-sync-tightening#D003(技能面板依赖弹道变更必须提示)
- **[前后端交互与性能修复记录]**: 弹道预览链路已做热路径优化：轨迹点定长数组写入、播放段预编译、轨迹标签池化复用；同时修复弹道偏移编辑后左侧“未保存”标记未显示的问题。 — by Zaun
  - 方案: [202604082242_editor-repair-mode-projectile-sync-tightening](archive/2026-04/202604082242_editor-repair-mode-projectile-sync-tightening/)
  - 决策: editor-repair-mode-projectile-sync-tightening#D002(弹道预览热路径预编译+池化)

## [0.9.3] - 2026-04-02

### Added
- **[前后端交互与性能修复记录]**: `Enemies.json` 的属性模式已新增“敌人扩展”卡片，可直接编辑 `classId / level / levelScope / isBoss / bounty / attackAnimationId`；职业和攻击动画分别从 `Classes.json` 与 `Animations.json` 读取，不再要求手写备注模板。 — by Zaun
  - 方案: [202604021339_enemy-property-panel](archive/2026-04/202604021339_enemy-property-panel/)
  - 决策: enemy-property-panel#D001(敌人扩展字段改为顶层结构化属性)

### Fixed
- **[前后端交互与性能修复记录]**: 敌人扩展卡片已补齐 `reactionSkillId` 编辑能力，迎击技能候选项直接从 `Skills.json` 读取；`EnemyPropertyService` 的读写、变更检测和测试也已同步到 `classId / level / levelScope / isBoss / bounty / attackAnimationId / reactionSkillId` 的现行顶层契约。 — by Zaun
  - 方案: [202604022345_enemy-reaction-field-editor-sync](archive/2026-04/202604022345_enemy-reaction-field-editor-sync/)
  - 决策: enemy-reaction-field-editor-sync#D001(敌人扩展卡片只覆盖运行时当前实际读取字段)
- **[前后端交互与性能修复记录]**: 敌人扩展字段保存时会优先迁移旧 `note/meta` 中的数据到敌人顶层属性，并将 `note` 清空、`meta` 重置为 `{}`；像 `reactionSkillId` 这类未纳入当前卡片的遗留字段也会先提升为顶层属性，避免静默丢失。 — by Zaun
  - 方案: [202604021339_enemy-property-panel](archive/2026-04/202604021339_enemy-property-panel/)
  - 决策: enemy-property-panel#D002(遗留未知 meta 字段按顶层属性保留)
- **[前后端交互与性能修复记录]**: 敌人属性面板已删除对旧 `note/meta` 敌人扩展字段的读取迁移逻辑；`EnemyPropertyService` 现在只读取敌人顶层 `classId / level / levelScope / isBoss / bounty / attackAnimationId`，保存时也只按当前顶层契约回写。 — by Zaun
  - 类型: 快速修改（无方案包）
  - 文件: `frontend/src/services/EnemyPropertyService.ts`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/services/EnemyPropertyService.test.ts`

## [0.9.2] - 2026-03-31

### Fixed
- **[弹道预览静态帧规则]**: 弹道预览中的 actor 不再固定裁 `sv_actors` 9x6 左上第一帧；现在会先读取条目 `meta.isStaticImage`，静态战车直接显示整张静态帧，普通 actor 继续保留首帧裁切。 — by Zaun
  - 方案: [202603310107_projectile-preview-static-battler-frame](archive/2026-03/202603310107_projectile-preview-static-battler-frame/)
  - 决策: projectile-preview-static-battler-frame#D001(编辑器直接复用 meta.isStaticImage 口径)
- **[弹道与保存防回归基线]**: 纹理缓存 key 已加入 renderMode，防止同一张 actor 图在静态整图和动态首帧之间串缓存；同时补入 `meta.isStaticImage` 的纯函数测试覆盖。 — by Zaun
  - 方案: [202603310107_projectile-preview-static-battler-frame](archive/2026-03/202603310107_projectile-preview-static-battler-frame/)
  - 决策: projectile-preview-static-battler-frame#D001(编辑器直接复用 meta.isStaticImage 口径)

## [0.9.1] - 2026-03-24

### Fixed
- **[前后端交互与性能修复记录]**: 纠正稀有标记归属；`isRare` 不再属于 `Items.json` 物品本体，而是改为 `enemyDrops[].isRare`，掉落面板单行同步调整为“类型 / 掉率 / 是否稀有 / 掉落目标”四列布局。 — by Zaun
  - 方案: [202603241930_drop-entry-is-rare-flag](archive/2026-03/202603241930_drop-entry-is-rare-flag/)
  - 决策: drop-entry-is-rare-flag#D001(稀有标记只属于 enemyDrops 单项)
- **[测试稳定性与 Logger 兼容修复]**: 前端测试基线补齐内存版 `localStorage` 和 `window.matchMedia` mock 后，掉落面板组件测试已稳定覆盖 `enemyDrops[].isRare` 的默认值与切换保存行为。 — by Zaun
  - 方案: [202603241930_drop-entry-is-rare-flag](archive/2026-03/202603241930_drop-entry-is-rare-flag/)
  - 决策: drop-entry-is-rare-flag#D001(稀有标记只属于 enemyDrops 单项)

## [0.9.0] - 2026-03-24

### Added
- **[前后端交互与性能修复记录]**: 新增敌人“掉落模式”；模式菜单已接入 `drop`，切换时会自动回到 `Enemies.json`，左侧列表固定为敌人列表，右侧 `DropPanel` 直接编辑当前敌人的 `enemyDrops`，并在当前敌人缺失该字段时按进入编辑态惰性补齐空数组后标脏。 — by Zaun
  - 方案: [202603240737_drop-mode-enemy-drops](archive/2026-03/202603240737_drop-mode-enemy-drops/)
  - 决策: drop-mode-enemy-drops#D001(掉落模式采用 Enemies 主文件而不是独立聚合 fileType)
- **[数据加载与地图管理]**: 掉落模式已接入 `Enemies.json / Items.json / Weapons.json / Armors.json` 外部变更命中规则；失效掉落引用不再被静默清空，而是保留原 `dropId` 并在候选项中显示为失效引用，继续纳入现有 SaveAll 链路。 — by Zaun
  - 方案: [202603240737_drop-mode-enemy-drops](archive/2026-03/202603240737_drop-mode-enemy-drops/)
  - 决策: drop-mode-enemy-drops#D002(缺失 enemyDrops 仅在选中当前敌人时初始化)

## [0.8.3] - 2026-03-23

### Fixed
- **[前后端交互与性能修复记录]**: 效果面板已按 `OPS_EDITOR_PANEL_SPEC.md` 去掉 `ops(JSON 数组)` 文本输入，改为结构化 `statId / opId / value` 行编辑；固定为共享 `effect` 的模块控件也已移除，避免继续误导为可切换脚本模块。 — by Zaun
  - 方案: [202603230302_effect-ops-panel-and-strict-protocol](archive/2026-03/202603230302_effect-ops-panel-and-strict-protocol/)
  - 决策: effect-ops-panel-and-strict-protocol#D001(ops 编辑按行模型实现，不再保留 JSON 文本框)
- **[数据加载与地图管理]**: `GameEffectService` 已删除旧 effectType/旧字段兼容迁移层；旧 `custom_script_effect` 和其他废弃模板不再做语义映射，而是直接按当前共享模板协议清理后标脏，`ops` 的模板约束和序列化统一下沉到协议层。 — by Zaun
  - 方案: [202603230302_effect-ops-panel-and-strict-protocol](archive/2026-03/202603230302_effect-ops-panel-and-strict-protocol/)
  - 决策: effect-ops-panel-and-strict-protocol#D002(删除旧兼容迁移层，旧结构直接清理并标脏)

## [0.8.2] - 2026-03-23

### Fixed
- **[前后端交互与性能修复记录]**: 效果面板已按 `EFFECT_TYPE_TEMPLATES.md + CONFIG_SPEC.md` 补齐 `single_cunit_bonus / pair_same_cunit_owner_bonus`，并把 `isStatic` 收紧为模板级固定或可编辑策略；`custom_script_effect` 的 `selector` 保持自定义脚本语义，不再被共享模板规则清空。 — by Zaun
  - 方案: [202603230128_effect-config-spec-sync](archive/2026-03/202603230128_effect-config-spec-sync/)
  - 决策: effect-config-spec-sync#D001(以 CONFIG_SPEC 为准把效果编辑器收口为严格协议)
- **[数据加载与地图管理]**: `gameEffects` 归一化与保存校验已同步到严格协议；编辑器不再生成 `sameBaseId`，会直接清理旧 `sameBaseId/slotIndex/tags/metaEquals`，并对 `selector/args` 字段类型、`ops` 三元组结构、模板允许的 `statId/opId` 做保存拦截。 — by Zaun
  - 方案: [202603230128_effect-config-spec-sync](archive/2026-03/202603230128_effect-config-spec-sync/)
  - 决策: effect-config-spec-sync#D001(以 CONFIG_SPEC 为准把效果编辑器收口为严格协议)

## [0.8.1] - 2026-03-22

### Fixed
- **[数据加载与地图管理]**: 外部运行时 `D:/RMProjects/MyGame/effects/effect.js` 已与编辑器生成的新模板数据对齐；`single_engine_bonus` 直接复用 owner 的 `_engineCount`，`pair_same_engine_bonus / pair_same_cunit_bonus` 先分别用 `_engineCount / _computerCount` 做数量预判，再进行同基础 id 扫描，避免继续走泛型装备类型计数。 — by Zaun
  - 方案: [202603222354_effect-runtime-count-sync](archive/2026-03/202603222354_effect-runtime-count-sync/)
  - 决策: effect-runtime-count-sync#D001(运行时按业务专用引擎/C 装计数收口，而不是继续保留泛型计数主路径)

## [0.8.0] - 2026-03-20

### Added
- **[前后端交互与性能修复记录]**: 效果模式已重构为 `module + config` 结构；面板只展示当前条目 `scripts` 的键名，不再解析脚本导出，也不再保留 `condition/execute`。 — by Zaun
  - 方案: [202603202326_effect-module-config-migration](archive/2026-03/202603202326_effect-module-config-migration/)
  - 决策: effect-module-config-migration#D001(效果模式改为 scriptName + config 结构)
- **[数据加载与地图管理]**: 旧 `gameEffects.condition/execute` 进入效果模式时会直接迁移并删除，迁移后标记当前数据为脏；脚本重命名/删除时会同步维护 `gameEffects.module` 引用。 — by Zaun
  - 方案: [202603202326_effect-module-config-migration](archive/2026-03/202603202326_effect-module-config-migration/)
  - 决策: effect-module-config-migration#D001(效果模式改为 scriptName + config 结构)

## [0.7.0] - 2026-03-20

### Added
- **[前后端交互与性能修复记录]**: 新增普通数据库条目的“效果模式”；进入模式时会自动补齐 `gameEffects[]` 并标记当前数据为脏，支持按当前条目的脚本导出函数编辑 `condition/execute` 与 `isStatic`。 — by Zaun
  - 方案: [202603201956_effect-mode-and-script-dirty-sync](archive/2026-03/202603201956_effect-mode-and-script-dirty-sync/)
  - 决策: effect-mode-and-script-dirty-sync#D001(独立 EffectPanel + GameEffectService 接入效果模式)
- **[数据加载与地图管理]**: `effect` 模式已接入模式菜单与 `editorStore` 模式保持规则，只允许普通数据库条目进入；切到任务/弹道文件时会自动回退到对应专用模式。 — by Zaun
  - 方案: [202603201956_effect-mode-and-script-dirty-sync](archive/2026-03/202603201956_effect-mode-and-script-dirty-sync/)
  - 决策: effect-mode-and-script-dirty-sync#D001(独立 EffectPanel + GameEffectService 接入效果模式)

### Fixed
- **[前后端交互与性能修复记录]**: 效果编辑器已按新版 `EFFECT_TYPE_TEMPLATES.md` 改为类型驱动表单；新增 owner/cunit/engine 模板，移除通用 `config JSON` 主编辑，并按模板决定 selector/args 字段显示与保存。 — by Zaun
  - 方案: [202603221632_effect-type-form-editor-sync](archive/2026-03/202603221632_effect-type-form-editor-sync/)
  - 决策: effect-type-form-editor-sync#D001(效果编辑器改为类型驱动表单而不是继续保留 JSON 主编辑)
- **[数据加载与地图管理]**: `custom_script_effect` 默认结构已收紧为 `{ selector: {}, args: {} }`；effectType 模板定义新增 `selectorMode/argsMode`，统一承担默认值生成、字段白名单和旧字段清理。 — by Zaun
  - 方案: [202603221632_effect-type-form-editor-sync](archive/2026-03/202603221632_effect-type-form-editor-sync/)
  - 决策: effect-type-form-editor-sync#D001(效果编辑器改为类型驱动表单而不是继续保留 JSON 主编辑)
- **[前后端交互与性能修复记录]**: 效果模板注册表已按新版 `EFFECT_TYPE_TEMPLATES.md` 收缩到 8 种；新增 `meta_present_bonus`，移除旧标签类模板，并把废弃模板类型统一收敛为 `custom_script_effect`。 — by Zaun
  - 方案: [202603220337_effect-type-template-sync-v2](archive/2026-03/202603220337_effect-type-template-sync-v2/)
  - 决策: effect-type-template-sync-v2#D001(旧 effectType 统一收敛到 custom_script_effect，不保留兼容层)
- **[数据加载与地图管理]**: `gameEffects` 归一化链路现在会直接删除 `slotIndex/tags/metaEquals/requiredTags/requiredBaseIds` 等旧字段；发生清理时会把当前数据标记为脏并纳入现有保存链路。 — by Zaun
  - 方案: [202603220337_effect-type-template-sync-v2](archive/2026-03/202603220337_effect-type-template-sync-v2/)
  - 决策: effect-type-template-sync-v2#D001(旧 effectType 统一收敛到 custom_script_effect，不保留兼容层)
- **[前后端交互与性能修复记录]**: 效果模式已接入 `effectType` 模板注册表；新增效果和切换模板时都会直接填入完整示例级默认数据，非 `custom_script_effect` 模板的 `module` 固定为 `effect`，保存时会校验模板字段范围。 — by Zaun
  - 方案: [202603220111_effect-type-registry-editor-design](archive/2026-03/202603220111_effect-type-registry-editor-design/)
  - 决策: effect-type-registry-editor-design#D001(效果编辑继续保留 JSON 主编辑，但由模板注册表生成完整示例)
- **[前后端交互与性能修复记录]**: 效果模式顶部“当前条目脚本模块”展示区已移除；新增效果时 `config` 默认模板改为 `{ selector: {}, args: {} }`，保存前会强制校验这两个字段存在且为对象。 — by Zaun
  - 方案: [202603210016_effect-config-template-validation](archive/2026-03/202603210016_effect-config-template-validation/)
  - 决策: effect-config-template-validation#D001(config 默认模板与校验逻辑下沉到服务层)
- **[前后端交互与性能修复记录]**: 脚本新建/复制文件名移除时间戳，旧“保存时间”头注释兼容同步删除；新建或复制脚本后当前数据文件会标记为脏，避免脚本模式下新增脚本引用绕过统一保存提示。 — by Zaun
  - 方案: [202603201956_effect-mode-and-script-dirty-sync](archive/2026-03/202603201956_effect-mode-and-script-dirty-sync/)
  - 决策: effect-mode-and-script-dirty-sync#D001(独立 EffectPanel + GameEffectService 接入效果模式)
- **[前后端交互与性能修复记录]**: 修复脚本缓存 dirty 状态沿用导致“未修改也被保存”的回归；`SaveAll` 现在会清理旧版时间戳脚本缓存，并拒绝继续加载/保存 `2_actionSequence_1766338208382.js` 这类旧路径。 — by Zaun
  - 类型: 快速修改（无方案包）
  - 文件: `frontend/src/services/ScriptCacheManager.ts`, `frontend/src/services/ScriptOperations.ts`, `frontend/src/services/ScriptPathCompat.ts`, `frontend/src/components/panels/CodeEditorPanel.tsx`, `frontend/src/services/ScriptCacheManager.test.ts`, `frontend/src/services/ScriptPathCompat.test.ts`
- **[前后端交互与性能修复记录]**: 修复切换到无脚本条目时 Monaco 程序化清空内容被误判为用户修改的问题；现在不会再把上一个角色脚本写成空缓存并在后续切换数据时触发保存提示。 — by Zaun
  - 类型: 快速修改（无方案包）
  - 文件: `frontend/src/components/panels/CodeEditorPanel.tsx`

## [0.6.0] - 2026-03-18

### Added
- **[装备模式与系统规则]**: 属性面板为 `Items.json`、`Weapons.json`、`Armors.json` 统一新增 `price` 编辑入口；武器额外支持 `attackSkillId` 与 `attackElementId` 下拉编辑，分别从 `Skills.json` 和 `System.json.elements` 派生选项。 — by Zaun
  - 方案: [202603182046_property-weapon-attack-fields](archive/2026-03/202603182046_property-weapon-attack-fields/)
  - 决策: property-weapon-attack-fields#D001(复用现有属性面板与依赖重载链路扩展武器字段)
- **[数据加载与地图管理]**: 武器属性/备注模式的外部依赖白名单新增 `Skills.json`，技能数据变化现在会和 `System.json`、`EquipExtensions.json` 一样触发重新加载确认。 — by Zaun
  - 方案: [202603182046_property-weapon-attack-fields](archive/2026-03/202603182046_property-weapon-attack-fields/)
  - 决策: property-weapon-attack-fields#D001(复用现有属性面板与依赖重载链路扩展武器字段)

## [0.5.0] - 2026-03-18

### Added
- **[前后端交互与性能修复记录]**: 模式切换、数据文件切换和程序关闭现在统一使用“保存全部 / 不保存 / 取消”三选项未保存保护；关闭程序改为走 Wails `OnBeforeClose` 与前端确认联动，取消时不会退出。 — by Zaun
  - 方案: [202603182005_unsaved-guard-and-animation-reload-prompts](archive/2026-03/202603182005_unsaved-guard-and-animation-reload-prompts/)
  - 决策: unsaved-guard-and-animation-reload-prompts#D001(未保存提示统一采用三选项并复用 SaveAll)
- **[数据加载与地图管理]**: 为弹道模式补充 `Animations.json` 依赖命中回归，明确动画数据外部变化时需要触发重新加载确认。 — by Zaun
  - 方案: [202603182005_unsaved-guard-and-animation-reload-prompts](archive/2026-03/202603182005_unsaved-guard-and-animation-reload-prompts/)
  - 决策: unsaved-guard-and-animation-reload-prompts#D001(未保存提示统一采用三选项并复用 SaveAll)

## [0.4.0] - 2026-03-18

### Added
- **[弹道与保存防回归基线]**: 弹道编辑器新增“弹道模板”模块，补齐“新建 / 复制 / 删除”入口；交互对齐任务编辑器，支持默认模板回落、复制命名框和删除后的自动重选逻辑。 — by Zaun
  - 方案: [202603181925_projectile-template-actions](archive/2026-03/202603181925_projectile-template-actions/)
  - 决策: projectile-template-actions#D001(弹道模板管理交互对齐 QuestPanel)
- **[弹道与保存防回归基线]**: 新增 `ProjectileTemplateService`，统一默认弹道模板与深拷贝逻辑，并补充对应单元测试，避免模板复制时嵌套轨迹数据串引用。 — by Zaun
  - 方案: [202603181925_projectile-template-actions](archive/2026-03/202603181925_projectile-template-actions/)
  - 决策: projectile-template-actions#D001(弹道模板管理交互对齐 QuestPanel)

## [0.3.0] - 2026-03-12

### Added
- **[装备模式与系统规则]**: 新增 `equip` 模式，以 `Actors.json` 为主文件编辑角色装备槽和当前装备；面板联动读取 `Weapons.json`、`Armors.json`、`System.json`，并按装备类型索引筛选候选装备。
  - 方案: [202603121635_add-equip-mode-and-system-equip-type-config](archive/2026-03/202603121635_add-equip-mode-and-system-equip-type-config/)
  - 决策: add-equip-mode-and-system-equip-type-config#D001(装备模式采用 Actors 主文件而不是独立聚合 fileType)
- **[装备模式与系统规则]**: `System.json` 新增 `weaponEquipTypeIds` 规则编辑能力，用于声明哪些装备类型属于武器；同时补齐装备模式的外部数据变化命中判定与纯函数测试覆盖。
  - 方案: [202603121635_add-equip-mode-and-system-equip-type-config](archive/2026-03/202603121635_add-equip-mode-and-system-equip-type-config/)
  - 决策: add-equip-mode-and-system-equip-type-config#D002(系统侧新增 weaponEquipTypeIds 作为装备类型来源判定)

### Fixed
- **[前后端交互与性能修复记录]**: 统一收紧 JSON 写盘格式；根层保持多行，内部短数组与短对象尽量行内压缩，避免数组每一项都单独占一行导致文件篇幅过长。
  - 类型: 快速修改
  - 文件: `backend/services/file_service.go`, `backend/services/file_service_test.go`
- **[装备模式与系统规则]**: 装备模式补充“保存当前角色”按钮；当前面板仍为单实例重渲染模型，切换角色不会持续堆积旧面板实例。
  - 类型: 快速修改
  - 文件: `frontend/src/components/panels/EquipPanel.tsx`, `frontend/src/components/layout/MainContent.tsx`
- **[装备模式与系统规则]**: 修复装备模式修改角色装备/装备槽后看不到脏标记的问题；面板内部的当前角色脏状态改为通过 `editorStore.getDirtyItemIndexes()` 读取规范化路径，左侧列表在 `equip` 模式下也会改看 `EquipExtensions.json` 的脏状态，不再误以 `Actors.json` 为准。
  - 类型: 快速修改
  - 文件: `frontend/src/components/panels/EquipPanel.tsx`, `frontend/src/components/layout/LeftPanel.tsx`
- **[前后端交互与性能修复记录]**: 模式切换前新增未保存保护；若当前模式存在脏数据或脏脚本，会先弹确认框，确认后立即保存，保存失败则取消切换，避免因切模式丢失修改。
  - 类型: 快速修改
  - 文件: `frontend/src/hooks/useFileOperations.ts`
- **[前后端交互与性能修复记录]**: 备注模式加载条目时若缺少 `meta` 属性，会按当前 `note` 自动生成 `meta` 并标记对应文件为脏，避免只有进入保存流程才补元数据。
  - 类型: 快速修改
  - 文件: `frontend/src/components/panels/NotePanel.tsx`, `frontend/src/services/NoteMetadataService.ts`, `frontend/src/services/NoteMetadataService.test.ts`
- **[装备模式与系统规则]**: 装备扩展数据源迁移到 `EquipExtensions.json`；角色装备槽、默认装备、武器装备类型与武器型装备类型集合不再写回 `Actors.json / Weapons.json / System.json`，避免被 RPG Maker 原生编辑器覆盖或污染。
  - 类型: 快速修改
  - 文件: `frontend/src/services/DataLoaderService.ts`, `frontend/src/services/EquipExtensionsService.ts`, `frontend/src/services/EquipExtensionsService.test.ts`, `frontend/src/services/EquipDataService.ts`, `frontend/src/services/EquipDataService.test.ts`, `frontend/src/components/panels/EquipPanel.tsx`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/hooks/useFileOperations.ts`
- **[数据加载与地图管理]**: 后端 watcher 与前端外部变化判定已接入 `EquipExtensions.json`，装备模式现在会跟随扩展文件的外部改动一起刷新。
  - 类型: 快速修改
  - 文件: `backend/services/workspace_service.go`, `backend/services/workspace_service_test.go`, `frontend/src/services/BaseDataReloadService.ts`, `frontend/src/services/BaseDataReloadService.test.ts`
- **[装备模式与系统规则]**: 修正装备模式的槽位判断与系统配置交互；角色槽位数量现在以 `equips` 为基线，`equipSlots` 仅保存槽位类型，系统侧字段统一为 `weaponEquipTypes`，并补上 `equipTypes / weaponEquipTypes` 的增删与保存入口。
  - 类型: 快速修改
  - 文件: `frontend/src/components/panels/EquipPanel.tsx`, `frontend/src/services/EquipDataService.ts`, `frontend/src/services/EquipDataService.test.ts`
- **[装备模式与系统规则]**: 修复 `System.json` 保存边界；编辑器内部仍可把系统数据包装为 `[null, systemObject]` 供通用面板使用，但 `saveFile/SaveAll` 写盘前会强制解包为顶层对象，避免保存后破坏真实系统文件结构。
  - 类型: 快速修改
  - 文件: `frontend/src/services/DataFileFormatService.ts`, `frontend/src/services/DataFileFormatService.test.ts`, `frontend/src/hooks/useFileOperations.ts`, `frontend/src/services/DataLoaderService.ts`, `frontend/src/components/panels/EquipPanel.tsx`, `frontend/src/services/EquipDataService.ts`
- **[装备模式与系统规则]**: 收紧角色装备区规则；装备行数量现在只由 `Actors.json.equips.length` 决定，`equipSlots` 仅按相同行数补齐默认 `0`，装备槽与装备改为一行左右对称展示，删除时同步删除该行的槽位和装备。
  - 类型: 快速修改
  - 文件: `frontend/src/components/panels/EquipPanel.tsx`, `frontend/src/services/EquipDataService.ts`, `frontend/src/services/EquipDataService.test.ts`
- **[装备模式与系统规则]**: 修正装备候选筛选规则；`System.json.weaponEquipTypes` 现在只负责决定去武器库还是防具库，具体候选统一按装备顶层 `etypeId === slotTypeId` 精确匹配，不再错误使用 `wtypeId/atypeId`。
  - 类型: 快速修改
  - 文件: `frontend/src/services/EquipDataService.ts`, `frontend/src/services/EquipDataService.test.ts`
- **[装备模式与系统规则]**: 属性面板新增武器 `etypeId` 编辑入口；武器现在可以先在 `Weapons.json` 属性界面绑定装备类型，再由装备模式按该顶层字段筛选候选装备。
  - 类型: 快速修改
  - 文件: `frontend/src/components/panels/PropertyPanel.tsx`
- **[装备模式与系统规则]**: 武器数据缺失顶层 `etypeId` 时会自动补成 `0`；属性面板和装备模式都会把补齐后的 `Weapons.json` 标记为已修改，避免界面可编辑但文件里没有该字段、后续无法保存。
  - 类型: 快速修改
  - 文件: `frontend/src/services/EquipDataService.ts`, `frontend/src/services/EquipDataService.test.ts`, `frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/components/panels/EquipPanel.tsx`

## [0.2.0] - 2026-03-11

### Added
- **[数据加载与地图管理]**: 新增工作区 `data/` 目录基础数据文件监听，后端会把受支持 JSON 文件变化统一发为 `data:file-changed` 事件，供前端按文件粒度刷新缓存。
  - 方案: [202603111530_add-base-data-file-watch-and-reload](archive/2026-03/202603111530_add-base-data-file-watch-and-reload/)
  - 决策: add-base-data-file-watch-and-reload#D001(使用后端文件监听而不是前端轮询)
- **[数据加载与地图管理]**: 新增外部数据变化处理链路，非当前激活面板依赖的数据会静默重载；命中当前面板时先弹确认框，确认后再重载当前文件、任务依赖、弹道依赖或地图索引。
  - 方案: [202603111530_add-base-data-file-watch-and-reload](archive/2026-03/202603111530_add-base-data-file-watch-and-reload/)
  - 决策: add-base-data-file-watch-and-reload#D002(当前面板判定采用白名单，不做全量依赖图)

### Changed
- **[数据加载与地图管理]**: 收紧地图监听范围，后端不再扫描全部 `MapXXX.json`，仅跟踪当前已经打开的地图文件；同时放宽 watcher 轮询周期，降低地图数量较多项目的后台 I/O 压力。
  - 方案: [202603111530_add-base-data-file-watch-and-reload](archive/2026-03/202603111530_add-base-data-file-watch-and-reload/)
  - 决策: add-base-data-file-watch-and-reload#D001(使用后端文件监听而不是前端轮询)

### Fixed
- **[数据加载与地图管理]**: 修复应用自身保存数据后仍触发外部变更检测的问题；本地写入抑制窗口现在会覆盖至少一个 watcher 轮询周期，避免 `SaveAll` 后被下一轮扫描误判。
  - 类型: 快速修改
  - 文件: `backend/services/workspace_service.go`, `backend/services/workspace_service_test.go`
- **[数据加载与地图管理]**: 修复从地图索引浏览态切换到普通数据文件时仍停留在 `map` 模式的问题；现在加载角色、职业、公共事件等文件会正确恢复普通面板和左侧列表。
  - 方案: [202603111431_add-map-module-and-extra-data-loading](archive/2026-03/202603111431_add-map-module-and-extra-data-loading/)
  - 决策: add-map-module-and-extra-data-loading#D001(地图采用索引与内容分层加载)

### Added
- **[数据加载与地图管理]**: 新增 `Classes.json`、`CommonEvents.json` 菜单与普通数据接入，补齐职业和公共事件文件的统一管理入口。
  - 方案: [202603111431_add-map-module-and-extra-data-loading](archive/2026-03/202603111431_add-map-module-and-extra-data-loading/)
  - 决策: add-map-module-and-extra-data-loading#D001(地图采用索引与内容分层加载)
- **[数据加载与地图管理]**: 新增地图模块，先加载 `MapInfos.json` 建立地图索引，再按需读取 `MapXXX.json`，避免工作区启动时全量导入地图。
  - 方案: [202603111431_add-map-module-and-extra-data-loading](archive/2026-03/202603111431_add-map-module-and-extra-data-loading/)
  - 决策: add-map-module-and-extra-data-loading#D001(地图采用索引与内容分层加载)
- **[数据加载与地图管理]**: `editorStore`、`LeftPanel`、`MainContent` 与 `MapPanel` 接入地图状态、地图列表和地图基础信息编辑，地图修改可纳入现有 SaveAll 链路。
  - 方案: [202603111431_add-map-module-and-extra-data-loading](archive/2026-03/202603111431_add-map-module-and-extra-data-loading/)
  - 决策: add-map-module-and-extra-data-loading#D001(地图采用索引与内容分层加载)

## [0.1.0] - 2026-02-10

### Added
- 初始化 HelloAGENTS 知识库目录与基础文档：
  - `helloagents/INDEX.md`
  - `helloagents/context.md`
  - `helloagents/CHANGELOG.md`
  - `helloagents/modules/_index.md`
  - `helloagents/modules/frontend-interaction-and-performance.md`
  - `helloagents/modules/testing-and-stability.md`

### Fixed
- 修复菜单事件监听缺少销毁导致的重复注册问题（`frontend/src/hooks/useFileOperations.ts`, `frontend/src/App.tsx`）。
- 修复保存操作读取过期状态，导致写回内容非最新编辑态的问题（`frontend/src/hooks/useFileOperations.ts`）。
- 修复“保存全部”仅处理当前数据文件的问题，改为处理全部脏数据文件 + 脏脚本文件（`frontend/src/hooks/useFileOperations.ts`）。
- 修复跨文件保存丢失问题：在武器/防具等数据文件间切换后，“保存属性/保存备注”未回写缓存，导致“保存项目文件”只落盘最后编辑文件（`frontend/src/components/panels/PropertyPanel.tsx`, `frontend/src/components/panels/NotePanel.tsx`）。
- 修复跨文件 SaveAll 二次遗漏：脏文件路径与缓存路径在 Windows 下可能存在大小写/分隔符不一致，导致非当前文件缓存命中失败；新增路径标准化与按文件脏索引记录（`frontend/src/stores/editorStore.ts`, `frontend/src/hooks/useFileOperations.ts`）。
- 调整属性面板保存语义：按钮“保存属性修改”统一保存基础属性 + 自定义属性，并记录修改条目索引（`frontend/src/components/panels/PropertyPanel.tsx`）。
- 修复弹道预览我方贴图来源：改为使用 `sv_actors`（9x6）并取左上第一帧作为待机帧，替代错误的 `characters` 来源（`frontend/src/components/common/ProjectileCanvas.tsx`）。

### Added
- 新增弹道“发射偏移配置”板块（位于预览前），支持：
  - 角色 + 武器（按 `wtypeId`）保存到 `Actors.json.projectileOffset`
  - 敌人 + 技能（按 `skillId`）保存到 `Enemies.json.projectileOffset`
  - 保存时标记对应数据文件和索引为脏，供 SaveAll 统一落盘
  - 预览起点实时应用偏移设置（`frontend/src/components/panels/ProjectilePanel.tsx`, `frontend/src/components/common/ProjectileCanvas.tsx`）。
- 调整弹道预览配置区布局：拆分为“发射方配置/目标方配置”左右小面板；目标方面板仅保留类型与目标 ID，不再出现武器/技能选择（`frontend/src/components/panels/ProjectilePanel.tsx`）。
- 修复旧数据兼容问题：支持 `sourceType/targetType` 使用 `"角色" / "敌人"` 的旧值并归一化为 `actor/enemy`，避免角色状态下误显示“技能”而非“武器”（`frontend/src/components/panels/ProjectilePanel.tsx`, `frontend/src/components/common/ProjectileCanvas.tsx`, `frontend/src/services/ProjectilePreviewUtils.ts`）。
- 修复发射偏移作用域错误：偏移仅影响弹道起始点与轨迹，不再移动发射者精灵本体位置（`frontend/src/components/common/ProjectileCanvas.tsx`）。
- 修复弹道预览层级：轨迹与弹道精灵层位提升到角色/敌人图层之上，便于校准发射点（`frontend/src/components/common/ProjectileCanvas.tsx`）。

### Added
- 弹道预览新增“发射方位置”切换（左侧发射/右侧发射）：
  - 同一时刻仅允许一侧为发射方，另一侧自动作为目标方；
  - 同步影响单位站位、朝向、轨迹起点与弹道播放起点（`frontend/src/components/panels/ProjectilePanel.tsx`, `frontend/src/components/common/ProjectileCanvas.tsx`）。
- 弹道预览“交换”按钮改为“一键交换发射方/目标方数据”（不改左右位置）：
  - 交换 `sourceType/sourceId` 与 `targetType/targetId`；
  - 左右位置继续仅由“发射方位置（左/右）”下拉控制；
  - 增加发射方参数记忆：角色的 `weaponId`、敌人的 `skillId` 在来回交换后可恢复，不会丢失（`frontend/src/components/panels/ProjectilePanel.tsx`）。
- 明确偏移保存脏标记范围：
  - “保存角色偏移”仅标记 `Actors.json`；
  - “保存敌人偏移”仅标记 `Enemies.json`（`frontend/src/components/panels/ProjectilePanel.tsx`）。
- 修复同文件重载后条目选中状态异常重置的问题（`frontend/src/stores/editorStore.ts`）。
- 修复缓存路径分隔符不一致导致缓存命中不稳定（`frontend/src/services/DataLoaderService.ts`）。
- 修复弹道偏移保存后 SaveAll 偶发“无变更/单文件保存失败”：
  - `DataLoaderService` 的路径键与文件名索引改为大小写兼容（Windows 路径按盘符规则归一化）；
  - 解决 `dirtyFiles` 键与缓存键大小写不一致导致 payload 丢失的问题（`frontend/src/services/DataLoaderService.ts`）。
- 修复弹道发射点与游戏内锚点不一致：
  - 预览单位改为持久化 `Sprite(anchor=0.5,0.5)`，并直接按锚点计算起点；
  - 移除每次更新时销毁/重建单位精灵，改为纹理复用与切换；
  - 轨迹与弹道起点改为读取发射方精灵全局锚点坐标，再叠加 `projectileOffset`；
  - 避免因 `Graphics` 无锚点语义与重复重建导致的起点误差与抖动（`frontend/src/components/common/ProjectileCanvas.tsx`）。
- 对齐游戏内锚点语义：
  - 我方/敌方单位精灵取消 `anchor` 设定（保持原点坐标逻辑）；
  - 弹道精灵仍使用 `anchor=(0.5,0.5)`；
  - 单位摆放改为“按目标中心反推左上角”，发射点从单位原点坐标取值（`frontend/src/components/common/ProjectileCanvas.tsx`）。
- 对齐 `Zaun_Projectile.js` 的弹道坐标规则：
  - 起点采用 `player.sprite()._position + projectileOffset`；
  - 终点采用 `target.sprite()._position` 且 `Y` 额外减去 `targetHeight/2`；
  - 发射方与目标方基准站位改为同一基线，避免无业务含义的预设斜率偏差；
  - 轨迹段 `segment.targetX/Y` 改为绝对坐标语义（非累加/非缩放）（`frontend/src/components/common/ProjectileCanvas.tsx`, `frontend/src/services/ProjectilePreviewUtils.ts`）。
- 进一步修正坐标基准：
  - 单位摆放与目标高度计算统一使用原始帧宽高（不乘缩放系数）；
  - 预览中双方单位坐标增加统一的右移/下移微调量，用于对齐游戏内战斗场景（`frontend/src/components/common/ProjectileCanvas.tsx`）。
- 修复 Logger 在测试环境 localStorage 能力不完整时抛错的问题（`frontend/src/services/Logger.ts`）。
- 修复测试初始化 mock 路径与接口定义不准确的问题，避免后续涉及 Wails API 的测试出现误判（`frontend/src/__tests__/setup.ts`）。
- 修复弹道预览缓动函数覆盖不完整的问题，补齐面板里所有缓动类型（`frontend/src/components/common/ProjectileCanvas.tsx`）。
- 修复弹道持续时间单位混用导致预览与面板不一致的问题（`frontend/src/services/ProjectilePreviewUtils.ts`, `frontend/src/components/panels/ProjectilePanel.tsx`, `frontend/src/components/common/ProjectileCanvas.tsx`）。

### Performance
- 优化左侧列表渲染索引计算，移除 `indexOf` 造成的 O(n²)（`frontend/src/components/layout/LeftPanel.tsx`）。
- 优化弹道预览画布生命周期，避免 Pixi 实例因依赖变化被反复销毁重建（`frontend/src/components/common/ProjectileCanvas.tsx`）。
- 优化工作区 `.d.ts` 扫描，跳过 `node_modules/.git/dist/build` 等大目录（`backend/services/file_service.go`）。
- 修复动态背景强调色表达式优先级问题，避免错误配色分支（`frontend/src/components/effects/DynamicBackground.tsx`）。
- 数据清单预加载改为并发处理，缩短工作区加载耗时（`frontend/src/services/DataLoaderService.ts`）。
- 组件订阅改为精细 selector（替代全量 store 订阅），减少非必要重渲染（`frontend/src/components/layout/MainContent.tsx`, `frontend/src/components/layout/LeftPanel.tsx`, `frontend/src/components/panels/*.tsx`, `frontend/src/components/common/ProjectileCanvas.tsx`）。
- 构建分包策略调整为 `vendor-antd/vendor-pixi/vendor-monaco`，降低首屏主包体积（`frontend/vite.config.ts`）。
- 新增弹道预览工具函数与测试，降低重复计算与回归风险（`frontend/src/services/ProjectilePreviewUtils.ts`, `frontend/src/services/ProjectilePreviewUtils.test.ts`）。

### Validation
- `bun run build` ✅
- `bun run test --run` ✅（32 passed）
- `bunx tsc --noEmit` ✅
- `go test ./...` ✅
- `go build ./...` ✅

### Validation (增量补丁)
- `bunx tsc --noEmit` ✅
- `bun run test --run` ⚠️ 当前环境失败（`spawn EPERM`，Vite/esbuild 进程拉起被系统拒绝）
- `bun run build` ⚠️ 当前环境失败（`spawn EPERM`，Vite/esbuild 进程拉起被系统拒绝）

### Validation (本次继续修复)
- `bunx tsc --noEmit` ✅

## 增量调整（2026-03-10，属性保存语义拆分）
- 按当前编辑流程拆分属性面板保存入口：
  - “保存基础属性”仅写入 `params/floatParams`
  - “保存自定义属性”仅写入 `customParams`
- 两类保存继续共用 `loadData + markFileDirty + markItemDirty` 回写链路，仍可被 `SaveAll` 统一落盘。
- 修复拆分后可能出现的草稿覆盖问题：
  - 当基础属性与自定义属性都存在未保存修改时，保存其中一侧不会覆盖另一侧尚未保存的本地草稿。
- 涉及文件：
  - `frontend/src/components/panels/PropertyPanel.tsx`
  - `helloagents/context.md`

## 增量调整（2026-03-10，代码编辑器主题与脚本头部）
- 修复代码编辑器主题未正确跟随全局主题的问题：
  - Monaco 主题改为同时跟随 `theme` 与 `themePreset`
  - 新增 `cyberpunk-light` 主题，并为 `minimal/high-contrast` 映射亮暗模式
  - 编辑器外层面板与脚本列表改为使用主题变量，而非固定深色样式
- 移除脚本顶部“保存时间”写入逻辑：
  - 新建脚本不再生成时间头部
  - 保存当前脚本/保存全部脚本/复制脚本时不再注入时间头部
  - 旧脚本若含历史时间头部，后续保存会自动剥离
- 涉及文件：
  - `frontend/src/components/panels/CodeEditorPanel.tsx`
  - `frontend/src/services/MonacoLoader.ts`
  - `frontend/src/services/ScriptOperations.ts`
  - `frontend/src/services/ScriptContentUtils.ts`

## 增量修复（2026-03-10，脚本保存失败保护）
- 修复脚本保存失败时可能继续走空内容写盘的问题：
  - 保存前统一先做内容归一化和非空校验
  - 校验失败或写盘失败时直接中止，保留编辑器内容与缓存内容，不再覆盖磁盘文件
- 新增可复制错误日志弹窗：
  - 保存失败时弹出日志窗口，包含操作、脚本键、路径、内容长度、失败原因和原始错误
  - 用户可直接复制日志排查问题
- 涉及文件：
  - `frontend/src/services/ScriptOperations.ts`
  - `frontend/src/components/common/InputDialog.tsx`

### Validation (弹道偏移功能)
- `bunx tsc --noEmit` ✅
## 增量修复（2026-02-12，预览坐标模型进一步对齐）
- 依据你确认的语义：`_position` 与 `position` 是同一坐标，仅为性能读取字段差异；预览不再做额外坐标系换算。
- 发射方/目标方精灵对齐模型改为与战斗内一致：
  - 单位精灵锚点统一 `anchor=(0.5,1)`；
  - 站位以“底部中心”为基准点；
  - 目标命中高度继续按原始帧高的 `height/2` 计算。
- 修复大帧角色/敌人易出画布：
  - 站位计算加入基于双方原始帧尺寸的动态边距与夹取；
  - 保证左右最小间距与边界安全范围。
- 预览整体基线再次右移/下移微调，减少与游戏内观感偏差。
- 涉及文件：
  - `frontend/src/components/common/ProjectileCanvas.tsx`
- 验证：
  - `bunx tsc --noEmit`：通过

### Documentation
- 新增弹道与保存防回归基线文档（`helloagents/modules/projectile-regression-baseline.md`），固化以下规则：
  - `_position`/`position` 坐标语义一致；
  - 起点/终点/中间段坐标公式与 `Zaun_Projectile.js` 一致；
  - 发射方/目标方面板交互与交换语义；
  - 偏移保存只标记对应文件，SaveAll 统一落盘；
  - 预览性能约束与回归验收清单（8项）。
- 更新模块索引与知识库入口：
  - `helloagents/modules/_index.md`
  - `helloagents/INDEX.md`
## 增量修复（2026-02-12，脚本列表创建入口）
- 修复脚本编辑模式缺少“新建脚本”入口的问题：
  - 在脚本列表底部固定增加 `+ 新建脚本` 项（始终位于最后一项）；
  - 点击后复用现有 `createScript` 流程，弹出脚本键名输入（脚本命名）；
  - 创建中增加禁用态与文案反馈，避免重复触发。
- 涉及文件：
  - `frontend/src/components/panels/CodeEditorPanel.tsx`
- 验证：
  - `bunx tsc --noEmit`：通过
## 增量修复（2026-02-12，脚本新建后列表与编辑器同步）
- 修复脚本新建后列表不刷新的问题：
  - `ScriptOperations` 的新建/删除/复制改为不可变更新（克隆 `currentItem` 与 `scripts`），避免复用同一对象引用导致 Zustand 选择器不触发重渲染。
- 修复脚本新建后编辑器内容为空的问题：
  - `CodeEditorPanel` 新增基于 `currentScriptKey` 的自动加载 effect；
  - 程序化选中脚本后会优先读取缓存并渲染当前脚本内容（含头部注释），缓存命中不再要求 `length > 0`。
- 涉及文件：
  - `frontend/src/services/ScriptOperations.ts`
  - `frontend/src/components/panels/CodeEditorPanel.tsx`
- 验证：
  - `bunx tsc --noEmit`：通过
  - `wails build`：通过（产物 `build/bin/MyNewEditor.exe`）
## 增量修复（2026-02-12，脚本未保存状态与激活态）
- 修复脚本编辑未保存状态不实时的问题：
  - `CodeEditorPanel` 新增对 `script:dirty/script:clean/script:cache-cleared` 的事件订阅，输入时实时触发面板重渲染；
  - 保存按钮与列表“未保存”标记不再依赖点击脚本列表才更新。
- 修复脏标记判定错误：
  - 编辑器内容变化时，按 `content === originalContent` 判定 clean/dirty；
  - 避免仅因程序化加载内容导致误判为 dirty。
- 修复新建脚本后激活态/加载链路：
  - 新增基于 `currentScriptKey` 的自动加载 effect，程序化选中后立即加载并渲染；
  - 新建/删除/复制继续采用不可变更新，确保列表与激活项即时刷新。
- 涉及文件：
  - `frontend/src/components/panels/CodeEditorPanel.tsx`
  - `frontend/src/services/ScriptOperations.ts`
- 验证：
  - `bunx tsc --noEmit`：通过
  - `wails build`：通过（产物 `build/bin/MyNewEditor.exe`）
## 增量调整（2026-02-12，脚本保存改为人工控制）
- 按需求移除脚本编辑器“输入即自动脏标记”逻辑：
  - 编辑内容变化仅更新缓存内容，不再自动 `markDirty/markClean`；
  - 脚本列表与头部的“未保存”标记不再依赖自动脏标记显示。
- 保存按钮行为改为人工控制：
  - 只要编辑器就绪且有当前脚本即可点击保存（不再受 dirty 标记门控）。
- 新增删除当前脚本快捷键：
  - `Ctrl + D`（复用现有 `deleteScript()`，包含删除确认流程）。
- 同步清理 `CodeEditorPanel` 中重复的脚本自动加载 effect，避免重复触发。
- 涉及文件：
  - `frontend/src/components/panels/CodeEditorPanel.tsx`
- 验证：
  - `bunx tsc --noEmit`：通过
  - `wails build`：通过（产物 `build/bin/MyNewEditor.exe`）

## 增量修复（2026-02-20，脚本批量保存与事件链补齐）
- 按最新交互要求调整脚本编辑面板：
  - 移除顶部“保存按钮”；
  - 移除脚本列表底部“新建脚本”入口（改由菜单事件触发）；
  - 移除 `Ctrl + D` 删除快捷键，避免与编辑器默认快捷键冲突；
  - `Ctrl + S` 保留为保存当前脚本。
- 恢复并修正脚本 dirty 标记语义：
  - 编辑时按 `content !== originalContent` 标记脚本 dirty；
  - 编辑恢复到原始内容时自动 clean；
  - dirty 列表可被“保存全部脚本/保存全部文件”统一消费。
- 修复脚本切换时原始基线丢失问题：
  - 缓存命中时恢复 `originalContent` 作为比较基线；
  - 保证跨脚本/跨数据切换后未保存内容仍在内存中且 dirty 状态稳定。
- 新增脚本菜单事件能力并打通前后端监听：
  - `script:save-current`
  - `script:save-all`
  - `script:rename`
  - `script:delete-all`
  - 对应接入 `useFileOperations` 与 `ScriptOperations`。
- 修复 Monaco 命令重复注册隐患：
  - `Ctrl + S` 改为只注册一次，避免脚本切换后重复绑定导致一次按键触发多次保存。
- 涉及文件：
  - `frontend/src/components/panels/CodeEditorPanel.tsx`
  - `frontend/src/services/ScriptOperations.ts`
  - `frontend/src/hooks/useFileOperations.ts`
  - `app.go`
- 验证：
  - `bun x tsc --noEmit`：通过（`frontend/`）
  - `wails build`：通过（产物 `build/bin/MyNewEditor.exe`）

## 增量修复（2026-03-02，属性/备注模式与元数据转换）
- 备注模式布局改为三栏均分：
  - 附加描述
  - 备注内容
  - 元数据预览
- 属性模式移除元数据卡片，避免与备注模式重复展示。
- 新增备注元数据转换服务（对齐旧项目 `D:/RMProjects/MyGame-master`）：
  - 标签提取规则：`/<([^<>:]+)(:?)([^>]*)>/g`
  - 转换规则：有 `:` 时按 `toParse` 语义解析（数字/布尔/JSON + 递归），无 `:` 则为 `true`
- 备注保存时新增元数据自动对比：
  - 若 `note` 解析出的 `meta` 与当前 `item.meta` 不同，则保存时写入新元数据；
  - 若相同，则仅保存备注内容，不重复生成元数据。
- 涉及文件：
  - `frontend/src/components/panels/NotePanel.tsx`
  - `frontend/src/components/panels/PropertyPanel.tsx`
  - `frontend/src/services/NoteMetadataService.ts`
  - `frontend/src/services/NoteMetadataService.test.ts`
  - `helloagents/INDEX.md`
  - `helloagents/modules/frontend-interaction-and-performance.md`
- 验证：
  - `bunx tsc --noEmit`：通过
  - `bun run test --run src/services/NoteMetadataService.test.ts`：通过

## 快速修改（2026-05-31，项目公开命名与开源许可）
- **项目定位**: 将公开项目名从 `MyNewEditor` 调整为 `RM Data Workbench`，同步 README、Wails 应用名、窗口标题、网页标题、Go module 路径与日志前缀。
- **开源许可**: 新增 MPL-2.0 `LICENSE` 与 `NOTICE`，分发时要求保留项目致谢信息。
- 涉及文件：`README.md`、`wails.json`、`go.mod`、`main.go`、`app.go`、`backend/services/quest_service.go`、`frontend/index.html`、`frontend/src/hooks/useFileOperations.ts`、`frontend/src/services/ScriptOperations.ts`、`RM_DATA_WORKBENCH_TASKS.md`、`LICENSE`、`NOTICE`。
