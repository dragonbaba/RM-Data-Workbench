# 变更提案: protocol-repair-mode-wave2

## 元信息
```yaml
类型: 修复/重构
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-04-09
```

---

## 1. 需求

### 背景
上一轮已经把技能消耗协议收口为“编辑器修复模式补齐固定字段，运行时直接信任结构”。当前仍有三组正式维护的协议还残留同类问题：

- 技能目标与选区/弹道关联字段虽然在编辑器里已有结构化入口，但编辑器保存链、修复模式、`MyGame` 运行时消费点还没有完全统一为固定协议。
- 敌人扩展字段已经迁移到顶层，但运行时和编辑器中仍保留部分历史推导和默认兜底。
- 效果模式已经切到 `effectType + config` 严格模板，但修复模式还没有覆盖 `Effects.json`，而运行时编译链仍保留对缺失 `config / selector / args / ops` 的防御式兜底。

### 目标
- 把技能目标/选区协议、敌人扩展协议、效果模式协议统一纳入“修复模式补齐固定字段”的口径。
- 让 `MyNewEditor` 的归一化、保存、修复模式和测试基线一致。
- 让 `MyGame` 的加载期和运行时热路径直接读取当前协议，不再继续堆字段缺失兜底。

### 约束条件
```yaml
时间约束: 本轮在现有 MyNewEditor + MyGame 双工程结构内完成，不新开第三套中间协议。
性能约束: MyGame 热路径不得因为兼容层继续增加分支；优先固定结构 + 表驱动/直读。
兼容性约束: 不回退到 note/meta/legacy effect 协议；旧数据修复由编辑器 repair mode 承担。
业务约束: 仅收口当前编辑器正式维护的字段集合，不把 Skills/Enemies/Effects 扩写成无限模板。
```

### 验收标准
- [ ] `Skills.json` 的目标/选区/弹道关联字段由编辑器和修复模式统一补齐，`MyGame` 相关读取点不再以缺失字段默认值为主路径。
- [ ] `Enemies.json` 的扩展字段由编辑器和修复模式统一补齐，`MyGame` 不再依赖 `reactionSkillId` 推导 `canReaction` 或 `classId/level` 旧兜底。
- [ ] `Effects.json` 进入修复模式目标集合；效果条目会补齐固定 `selector/args` 结构，运行时编译和执行链不再把缺失配置当作常规输入。
- [ ] 针对三组协议的服务测试、修复模式测试、构建/语法检查通过，知识库和 CHANGELOG 同步更新。

---

## 2. 方案

### 技术方案
本轮继续沿用上一轮已经确认的路线：

1. `MyNewEditor` 侧先定义当前协议的固定结构。
2. 通过 `normalize*DataEntry()`、`build*SaveData()` 和 `DataAuditService` 把旧数据修复到固定结构。
3. `MyGame` 侧把这些协议视为加载期已规范化的数据，删除运行时字段缺失兜底，只保留必要的运行时编译与数值裁剪。

具体分三组推进：

- 技能目标/选区协议：
  - 收紧 `SkillPropertyService` 的正式字段集合，补上 targeting 相关保存/比较口径。
  - 对齐 `PropertyPanel` 与修复模式，让 `targetCamp / targetLifeState / selectMode / areaMode / projectileId / skillProjectileTag / reactionSuccessRate / reactionPriority / skillCosts` 形成同一技能协议面。
  - 收紧 `Zaun_ItemCore / Zaun_Resource / Zaun_GameAction / Zaun_ProjectileReaction` 中这组字段的缺失默认兜底。

- 敌人扩展协议：
  - 让 `EnemyPropertyService` 产出固定顶层结构，不再把 `canReaction` 视为可省略并由 `reactionSkillId` 临时推导。
  - 修复模式批量补齐 `classId / level / levelScope / isBoss / allowBreak / canReaction / bounty / attackAnimationId / reactionSkillId`。
  - 收紧 `Zaun_Resource / Zaun_GameBattler / Zaun_ProjectileReaction / Zaun_EnemyBook` 中对这组字段的历史兜底。

- 效果模式协议：
  - 把 `GameEffectSelector / GameEffectArgs` 收口为固定字段对象，未使用字段也有确定默认值。
  - 把 `Effects.json` 纳入 `DataAuditService` 修复范围，让每条 effect 按其 `effectType` 模板补齐固定 `config.selector / config.args`。
  - 收紧 `Zaun_Resource / baseEffect / effects/effect.js` 中对 `config / selector / args / ops` 的缺失兜底。

### 影响范围
```yaml
涉及模块:
  - SkillPropertyService / PropertyPanel / DataAuditService: 技能目标协议固定结构与修复模式写回
  - EnemyPropertyService / PropertyPanel / DataAuditService: 敌人扩展固定结构与修复模式写回
  - GameEffectService / EffectPanel / DataAuditService: 效果配置固定结构与 repair mode 纳入
  - Zaun_ItemCore / Zaun_Resource / Zaun_GameAction / Zaun_ProjectileReaction: 技能与敌人协议运行时直读
  - baseEffect / effects/effect.js: 效果配置编译与执行链直读
预计变更文件: 12~18
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 技能 targeting 保存链和通用范围保存链重复写字段，导致保存后互相覆盖 | 中 | 先梳理 `PropertyPanel` 实际保存顺序，再决定是否把 targeting 正式并入 `SkillPropertyService` |
| 敌人 `canReaction` 取消推导后，旧数据在未修复时会失去迎击能力 | 中 | 以 repair mode 和 `normalizeEnemyDataEntry()` 先补齐，再删运行时主路径兜底 |
| 效果模式如果直接去掉 `config/args/ops` 兜底，旧 `Effects.json` 会在运行时编译报错 | 高 | 先把 `Effects.json` 纳入 `DataAuditService` 和 `GameEffectService` 固定结构，再收运行时 |

---

## 3. 技术设计

### 数据模型
| 字段组 | 固定结构 |
|------|------|
| 技能协议 | `projectileId / skillProjectileTag / reactionSuccessRate / reactionPriority / targetCamp / targetLifeState / selectMode / areaMode / skillCosts[]` |
| 敌人扩展协议 | `classId / level / levelScope / isBoss / allowBreak / canReaction / bounty / attackAnimationId / reactionSkillId` |
| 效果配置协议 | `config.selector.slotIndexes / etypeIds / wtypeIds / atypeIds` + `config.args.ops / requiredCount / weaponIds / armorIds` |

### 运行时边界
- 编辑器 repair mode 负责把旧数据修成当前协议。
- 运行时允许做：
  - 编译缓存
  - 数值裁剪
  - 派生只读缓存（如 `_compiled`、`_staticEffects`）
- 运行时不再承担：
  - 缺失字段补默认值作为主路径
  - 从别的字段推导正式协议字段
  - legacy note/meta/custom 结构兼容回填

---

## 4. 核心场景

### 场景: 修复模式批量固化三组协议
**模块**: `DataAuditService`
**条件**: 用户在编辑器里执行数据体检/修复
**行为**: 读取 `Skills.json / Enemies.json / Weapons.json / Armors.json / Projectiles.json / Effects.json`，对正式维护协议字段补齐固定结构
**结果**: 运行时后续可以直接信任结构化字段

### 场景: 运行时直读技能目标与敌人扩展
**模块**: `Zaun_ItemCore / Zaun_GameAction / Zaun_GameBattler / Zaun_ProjectileReaction`
**条件**: 游戏加载后执行技能选择、敌人初始化或迎击判定
**行为**: 直接读取已规范化顶层字段
**结果**: 热路径分支减少，不再依赖缺失字段默认兜底

### 场景: 效果系统按固定模板执行
**模块**: `GameEffectService / Zaun_Resource / baseEffect / effects/effect.js`
**条件**: 编辑效果条目或运行时编译/执行 effect
**行为**: effect 条目固定包含 `config.selector` 与 `config.args` 的模板字段
**结果**: 编译链与执行链只处理当前模板，不再容忍协议缺口

---

## 5. 技术决策

### protocol-repair-mode-wave2#D001: 第二波协议继续采用“repair mode 补齐，运行时直读”
**日期**: 2026-04-09
**状态**: ✅采纳
**背景**: 技能消耗已经证明这条路线能把旧兼容从热路径里移走；三组剩余协议需要按同一原则继续收口。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 编辑器修复模式补齐固定结构，运行时直读 | 口径单一，热路径更干净，后续协议扩展更稳定 | 需要同步补测试和 repair mode |
| B: 保持运行时兜底，编辑器只做部分规范化 | 改动分散时看起来更省事 | 协议事实源继续分裂，热路径长期堆分支 |
**决策**: 选择方案A
**理由**: 这是你已经明确要求的长期规则，且当前代码结构已经具备 repair mode 和服务层归一化基础。
**影响**: `MyNewEditor` 的服务层/体检链和 `MyGame` 的数据加载/运行时消费点

### protocol-repair-mode-wave2#D002: 效果配置采用“全键固定对象 + 模板约束决定可编辑子集”
**日期**: 2026-04-09
**状态**: ✅采纳
**背景**: 效果模式虽然已经切到模板协议，但 `selector/args` 仍是半可选对象，运行时编译还在默认兜底。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: `selector/args` 使用全键固定对象，面板只显示当前模板允许字段 | repair mode、测试、运行时编译口径一致 | 数据体积略增 |
| B: 继续保留“按模板只输出部分键” | 表面更精简 | 编译链仍需假设键可能缺失 |
**决策**: 选择方案A
**理由**: 这能把 effect 模式也纳入与技能消耗同一类固定协议，不再让运行时承担对象缺口。
**影响**: `GameEffectService`、`Effects.json` repair mode、`Zaun_Resource` 编译链、`baseEffect/effect.js`

---

## 6. 成果设计

N/A。本轮为协议、修复模式与运行时收口，不涉及新增视觉风格设计。
