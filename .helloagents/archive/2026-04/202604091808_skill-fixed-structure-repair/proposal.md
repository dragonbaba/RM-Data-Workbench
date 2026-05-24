# 变更提案: skill-fixed-structure-repair

## 元信息
```yaml
类型: 修复+重构
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-04-09
```

---

## 1. 需求

### 背景
当前 `skillCosts` 已经进入结构化协议，但运行时和展示层仍残留“字段可能缺失/非法”的兜底读取。你明确要求把这类问题前置到编辑器“修复模式”解决，不再在运行时堆积兜底。

你同时选择了更激进的方案：不仅 `skillCosts`，连技能条目当前已经纳入结构化维护的 `projectile / reaction / targeting` 字段，也统一在修复模式中补齐成固定结构。

### 目标
- 修复模式批量处理 `Skills.json` 时，把当前技能协议字段补齐成固定结构。
- `skillCosts[]` 每条消耗记录补成固定 shape，运行时和展示层可以直接读取，不再为缺失字段兜底。
- 删除 `baseSkillUtils` 与 `Zaun_WindowCore` 中残留的技能消耗字段兜底读法。
- 把“协议扩展优先在编辑器修复模式补齐，运行时直接信任结构化数据”固化进知识库。

### 约束条件
```yaml
时间约束: 本轮直接在现有 skillCosts/projection/reaction/targeting 协议上收紧
性能约束: 运行时不为技能消耗继续保留字段缺失兜底逻辑
兼容性约束: 固定结构仅覆盖当前编辑器已正式维护的技能协议字段，不扩散到无关旧字段
业务约束: 修复模式写回后的 Skills.json 应成为运行时的唯一事实来源
```

### 验收标准
- [ ] `normalizeSkillDataEntry()` 会把当前技能协议字段补齐成固定结构。
- [ ] 修复模式处理 `Skills.json` 时，`skillCosts[]` 内部字段会被补齐为固定 shape。
- [ ] `baseSkillUtils.js` 不再通过 `readDatabaseId <= 0 -> null` 这类方式为技能消耗做字段兜底。
- [ ] `Zaun_WindowCore.js` 的技能消耗展示同样改为直接信任固定结构。
- [ ] 数据修复测试和技能属性测试覆盖新的固定结构约束。

---

## 2. 方案

### 技术方案
采用“编辑器补齐固定结构，运行时直读协议”的收紧方案：

1. 在 `SkillPropertyService` 中定义固定技能结构：
   - 技能顶层固定字段：`projectileId / skillProjectileTag / reactionSuccessRate / reactionPriority / targetCamp / targetLifeState / selectMode / areaMode / skillCosts`
   - `skillCosts[]` 固定字段：每条记录都带完整键集，由类型决定哪些值生效
2. `normalizeSkillDataEntry()` 和保存链路统一写出固定结构；修复模式复用该规范批量修复 `Skills.json`。
3. `DataAuditService.test.ts` 补充断言，确保修复模式真实写回固定字段，而不是只做局部缺省。
4. `baseSkillUtils.js` 与 `Zaun_WindowCore.js` 删除技能消耗字段缺失兜底，直接按固定结构读取。

### 影响范围
```yaml
涉及模块:
  - frontend/src/services/SkillPropertyService.ts: 固定结构定义、规范化和保存
  - frontend/src/services/SkillPropertyService.test.ts: 固定结构测试
  - frontend/src/services/DataAuditService.test.ts: 修复模式写回测试
  - base/baseSkillUtils.js: 删除技能消耗字段兜底，直接读取固定结构
  - js/plugins/Zaun_WindowCore.js: 删除展示层技能消耗字段兜底
  - .helloagents/modules/frontend-interaction-and-performance.md: 固化“修复模式补齐，运行时直读”原则
预计变更文件: 6-7
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 旧项目未执行修复模式时直接运行导致崩溃 | 中 | 通过知识库明确要求先走修复模式；当前代码仅对 skillCosts 路径收紧 |
| 固定结构补齐范围过大导致数据膨胀 | 中 | 只覆盖当前编辑器正式维护的技能协议字段 |
| 修复模式与手动保存链路写出结构不一致 | 高 | 所有写回都复用 `normalizeSkillDataEntry()` 同一套固定结构 |

---

## 3. 技术设计

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| `projectileId` | `number` | 固定存在 |
| `skillProjectileTag` | `number` | 固定存在 |
| `reactionSuccessRate` | `number` | 固定存在 |
| `reactionPriority` | `number` | 固定存在 |
| `targetCamp` | `number` | 固定存在 |
| `targetLifeState` | `number` | 固定存在 |
| `selectMode` | `number` | 固定存在 |
| `areaMode` | `number` | 固定存在 |
| `skillCosts` | `SkillCostEntry[]` | 固定存在，默认空数组 |
| `SkillCostEntry` 固定字段 | `type/value/variableId/itemId/weaponId/armorId/amount` | 每条都写全，避免运行时再猜字段是否存在 |

### 固定结构边界
- 本轮“整个技能条目固定结构化”仅覆盖当前编辑器已经正式维护的技能协议字段。
- 不把 `Skills.json` 扩写成无限模板，不触碰无关旧字段。

---

## 4. 核心场景

### 场景: 修复模式批量补齐技能协议
**模块**: DataAuditService / SkillPropertyService
**条件**: 用户执行数据体检/修复
**行为**: `Skills.json` 中的旧技能条目进入 `normalizeSkillDataEntry()`
**结果**: 写回固定的 projectile/reaction/targeting/skillCosts 结构

### 场景: 运行时直接读取技能消耗
**模块**: baseSkillUtils
**条件**: 技能数据已由编辑器修复模式或保存链路收口
**行为**: 运行时按固定字段直接读取 `skillCosts`
**结果**: 不再为缺失 id/amount/value 做兜底判断

### 场景: 技能说明窗口直接读取固定结构
**模块**: Window_ItemInfo
**条件**: 查看经过修复模式或编辑器保存后的技能
**行为**: 展示层直接读取 `skillCosts` 固定结构
**结果**: 不再保留字段缺失回退分支

---

## 5. 技术决策

### skill-fixed-structure-repair#D001: 运行时不为技能协议继续保留字段兜底，改由编辑器修复模式补齐
**日期**: 2026-04-09
**状态**: ✅采纳
**背景**: 你明确要求“以后所有的修改都要这样”，即协议问题优先在编辑器修复模式解决，而不是运行时长期背兜底债务。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 修复模式补齐固定结构，运行时直读 | 热路径更干净，协议边界明确 | 对数据规范化链路要求更高 |
| B: 编辑器和运行时两边都保留兜底 | 更宽容 | 长期维护成本高，运行时继续背历史债 |
**决策**: 选择方案 A
**理由**: 这和你对当前实现的要求完全一致，也能把技能协议真正收口成单一事实源。
**影响**: `SkillPropertyService`、`DataAuditService`、`baseSkillUtils`、`Zaun_WindowCore`

---

## 6. 成果设计

N/A。本轮为数据协议收紧与修复模式策略固化，不涉及视觉设计。
