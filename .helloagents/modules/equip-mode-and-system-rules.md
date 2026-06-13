# 装备模式与系统规则

## 职责
- 为 `Actors.json` 提供专用的装备编辑模式。
- 统一管理角色装备槽类型、当前装备选择，以及装备扩展规则。
- 基于 `Weapons.json`、`Armors.json`、`System.json` 与 `EquipExtensions.json` 缓存派生装备候选项。

## 行为规范
- 模式接入：
  - `app.go` 的“模式”菜单新增“装备模式”。
  - `useFileOperations` 在切换到 `equip` 模式时会优先确保已加载 `Actors.json` 与 `EquipExtensions.json`。
  - `editorStore` 在 `uiMode === 'equip'` 时，若继续加载 `Actors.json`，保持装备模式；若切换到其他普通数据文件，则恢复到普通属性模式。
- 角色数据：
  - 装备模式始终以 `Actors.json` 为当前文件。
  - 左侧列表继续复用角色列表，切换角色时右侧装备面板同步刷新。
  - `MainContent` 始终只渲染一个当前 `EquipPanel`；切换角色只是同一面板实例随 `currentItem` 重渲染，不会按点击次数持续累积旧面板实例。
  - 角色装备扩展不再写回 `Actors.json`，统一写入 `EquipExtensions.json.actorEquipSlots / actorEquips`。
  - 槽位显示数量严格以 `EquipExtensions.json.actorEquips[index].length` 为准；只要 `actorEquips[index]` 有 N 个元素，就补齐并显示 N 个 `actorEquipSlots[index]`，缺失槽位类型默认补 `0`。
  - `actorEquipSlots` 仅表示每个槽位的类型定义，不再参与“是否存在槽位”的主判断，也不会单独生成额外行。
  - 角色装备配置进入现有 `dirtyFiles + SaveAll` 链路，但保存目标是 `EquipExtensions.json`。
  - 装备模式的脏标记来源于 `EquipExtensions.json`，不是当前只读参考文件 `Actors.json`；因此左侧“已修改”和面板头部“当前角色已修改”都应以扩展文件的脏状态为准。
  - 面板头部提供“保存当前角色”按钮，用于把当前缓存中的 `EquipExtensions.json` 立即落盘。
  - 装备区按行左右对称显示：左侧槽位类型、右侧装备选择；删除任意一行时，同时删除该行的 `equipSlots[index]` 与 `equips[index]`。
- 系统规则：
  - 装备槽类型来源于 `System.equipTypes`。
  - 索引 `0` 视为“无类型”，不参与武器/防具筛选。
  - `EquipExtensions.json.systemWeaponEquipTypes` 记录哪些装备类型索引属于武器。
  - 系统区支持对 `System.json.equipTypes` 与 `EquipExtensions.json.systemWeaponEquipTypes` 两个数组分别做增加、删除和统一保存。
  - 编辑器内部允许把 `System.json` 以 `[null, systemObject]` 形式接入通用数组面板，但写回磁盘时必须解包成顶层对象，不能把包装数组直接保存到 `data/System.json`。
- 候选装备筛选：
  - 若槽位类型索引属于 `systemWeaponEquipTypes`，则候选项来自 `Weapons.json`。
  - 其余非零槽位类型默认来自 `Armors.json`。
  - 武器候选项统一按 `EquipExtensions.json.weaponEquipTypes[weaponIndex] === slotTypeId` 精确匹配。
  - 防具候选项统一按顶层 `etypeId === slotTypeId` 精确匹配。
  - 任意候选列表都保留 `0 : 无装备` 占位项。
- 属性编辑联动：
  - `PropertyPanel` 会在武器数据（`Weapons.json`）上额外显示“装备类型”下拉。
  - `PropertyPanel` 会在物品、武器、防具数据上统一显示 `price` 输入框，并直接写回原生 `price` 字段。
  - `PropertyPanel` 会在武器数据上额外显示“攻击技能”和“攻击元素”下拉：
    - `attackSkillId` 选项来源于 `Skills.json`；
    - `attackElementId` 选项来源于 `System.json.elements`，保存值为元素索引 ID。
  - `PropertyPanel` 会在武器、防具属性模式下维护顶层 `upgradeCosts[]`：
    - `upgradeCosts[index]` 对应目标强化等级 `index + 1`；
    - 单级字段固定为 `successRate / goldCost / requiredItemId / requiredItemAmount / protectItemId / protectItemAmount`；
    - `successRate` 是该目标强化等级的基础成功率百分比，范围 `0-100`，缺失时按旧公式 `100 / 目标强化等级` 补齐；
    - 金币和必需物品属于普通强化消耗，失败也消耗；保底物品仅在玩家选择保底强化时消耗，并使本次成功率视为 100%；
    - 缺失 `upgradeCosts` 时，标准化链和修复模式统一补为空数组。
  - `PropertyPanel` 会在武器、防具属性模式下维护顶级 `qualityLock + qualityLevel`：
    - `qualityLock` 为布尔值，表示游戏内新生成独立装备实例是否锁定品质。
    - `qualityLevel` 是整数等级，固定 clamp 到 `0-6`，缺失或非法值归一为 `0`。
    - 属性面板初始化、变更判断和保存写回统一调用 `EquipmentQualityProtocolService` 的归一化规则。
    - `EquipmentPropertyService.normalizeEquipmentDataEntry()` 与 `DataAuditService` 修复模式会为 `Weapons.json`、`Armors.json` 补齐并收敛这两个字段。
    - 游戏运行时规则为：显式实例品质优先；未显式传入时，锁定品质读取基础装备 `qualityLevel`，未锁定品质一律随机。`0` 是合法品质等级，不是无品质兜底。
  - 下拉选项来源于 `System.json.equipTypes`。
  - 武器装备类型不再写回 RPG Maker 原生 `etypeId`，统一写入 `EquipExtensions.json.weaponEquipTypes[weaponIndex]`。
  - 这样可以避免 RPG Maker 编辑器重写原生 `etypeId` 时污染扩展装备逻辑。
- 扩展数据文件：
  - `DataLoaderService` 会确保 `data/EquipExtensions.json` 存在；缺失时自动创建默认结构。
  - “保存当前文件”在武器属性界面和装备模式下，会额外把当前面板关联的 `EquipExtensions.json`（以及装备模式下的 `System.json`）一并落盘，不再只能依赖 `SaveAll`。
  - 默认结构：
    - `weaponEquipTypes: [null, ...]`
    - `systemWeaponEquipTypes: []`
    - `actorEquipSlots: [null, ...]`
    - `actorEquips: [null, ...]`
  - `weaponEquipTypes` 与 `Weapons.json` 索引一一对应。
  - `actorEquipSlots / actorEquips` 与 `Actors.json` 索引一一对应。
- 派生服务：
  - `frontend/src/services/EquipDataService.ts` 提供装备类型、武器型类型索引和候选装备列表的纯函数派生。
- `frontend/src/services/EquipExtensionsService.ts` 负责扩展文件默认结构、规范化和按角色/武器索引读取。
- `frontend/src/services/EquipExtensionsService.ts` 的 `normalizeEquipExtensions()` 负责补齐改造模式数据：同一槽位内已经配置到的正数装备类型会生成互相转换 transition，新增规则按目标类型已有 transition 复制 `goldCost` 与 `conditions`，让游戏运行时保持简单的 `slotIndex/from/to` 显式读取。
- 修复模式通过 `DataAuditService` 把 `EquipExtensions.json` 纳入检查；当 `Actors.json` 中角色 `isTank === true` 且该角色 `actorRefitRules` 缺失或没有任何 transition 时，会按 `actorEquipSlots[actorId]` 生成默认战车改造模板。模板价格随 actorId 单调递增，并对同一 `slotIndex/from/to` transition 不低于前一角色，避免后续新增战车缺少改造数据。
  - 派生逻辑不依赖 React，可独立做单元测试。
- `RefitPanel` 只展示当前槽位类型对应的 `fromEquipTypeId` 转换目标；同槽位里的其它互转规则作为数据保留，不在当前槽位视图中重复铺开，也不会在保存时被改写来源类型。
- 跨条目复制:
  - 装备模式、改造模式和属性模式（强化耗材）各自提供"复制到…"按钮，通过共享组件 `CopyToTargetModal` 批量复制当前条目数据到其他目标条目。
  - 装备模式复制 `actorEquipSlots[index]` 和 `actorEquips[index]`（纯数组深拷贝）。
  - 改造模式复制 `actorRefitRules[index]`（slots + transitions + conditions 逐层深拷贝）；目标角色打开时由 `getActorRefitSlotsFromExtensions` 按自身 equipSlots 重派生 `fromEquipTypeId`，transitions 中的互转规则作为数据保留。
  - 属性模式仅复制武器/防具的 `upgradeCosts`（强化耗材），不连带 `upgradeParams` 或其他属性。
  - 目标候选自动排除 index 0 和当前条目；支持多选、搜索过滤；复制后通过 `markFileDirty + markItemDirty` 标记每个目标为已修改。

## 依赖关系
- `frontend/src/components/panels/EquipPanel.tsx`
- `frontend/src/components/common/CopyToTargetModal.tsx`
- `frontend/src/services/EquipDataService.ts`
- `frontend/src/services/EquipExtensionsService.ts`
- `frontend/src/hooks/useFileOperations.ts`
- `frontend/src/stores/editorStore.ts`
- `frontend/src/services/BaseDataReloadService.ts`
- `frontend/src/types/index.ts`
- `app.go`

## 当前约束
- 装备模式支持角色维度的装备槽和当前装备编辑，并通过"复制到…"提供跨角色批量复制装备槽与初始装备数据的能力。
- `EquipExtensions.json` 为项目自定义扩展数据源，当前由编辑器负责创建、读写和外部变化监听。
- 装备模式不新增独立 `fileType`，仍复用普通 `data` 文件保存链路。
- 当前角色槽位数量完全由 `EquipExtensions.json.actorEquips[index].length` 驱动；若某角色扩展数据为空，面板将视为无装备行，而不会再退回到原生 `Actors.json`。
- 当前装备模式按统一扩展数据来源工作：角色使用 `actorEquips/actorEquipSlots`，武器候选使用 `weaponEquipTypes`；不再解析 `note/meta`，也不再把扩展语义写回原生 RPG Maker 字段。

## 验证
- `npx tsc --noEmit` ✅
- `npm run test -- --run` ✅（65/65）
- `npm run build` ✅
- `go test ./...` ✅
- `go build ./...` ✅
