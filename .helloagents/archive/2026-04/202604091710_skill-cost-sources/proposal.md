# 变更提案: skill-cost-sources

## 元信息
```yaml
类型: 新功能
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-04-09
```

---

## 1. 需求

### 背景
当前技能数据只有原生或零散的消耗语义，编辑器中缺少统一的“技能消耗来源”结构化模块，无法直接表达生命值、金钱、变量与物品/装备类消耗，也无法让运行时和信息窗口基于同一份结构化数据工作。

### 目标
- 在 `MyNewEditor` 的技能属性模式中新增结构化 `skillCosts` 编辑模块。
- 支持多条消耗并行生效，覆盖生命值固定值、生命值百分比、金钱、变量值、指定物品、武器、防具（均带数量）。
- 将技能数据类型、归一化、保存逻辑和面板展示统一到同一协议。
- 在 `MyGame` 运行时接入 `canPaySkillCost/paySkillCost`，让技能释放条件与真实扣除都读取 `skillCosts`。
- 在 `Zaun_WindowCore -> Window_ItemInfo` 的技能信息窗口中增加“消耗”模块，左右对称显示，优先于描述区；物品/装备消耗显示“数量 + 名称”，变量消耗显示 `$dataSystem.variables[variableId]` 对应变量名。

### 约束条件
```yaml
时间约束: 本次直接落地，不额外拆分阶段发布
性能约束: 运行时技能消耗检查需保持轻量，不引入战斗热路径的额外复杂对象分配
兼容性约束: 未配置 skillCosts 的技能保持现有行为；保留现有弹道/迎击等结构化字段
业务约束: 多条 skillCosts 同时配置时必须全部满足、全部扣除
```

### 验收标准
- [ ] 编辑器技能属性面板可增删多条 `skillCosts`，并支持 7 类消耗来源及对应引用数据选择。
- [ ] `SkillPropertyService`、`types` 与保存链路可稳定读写 `skillCosts`，未配置时输出空数组或缺省安全值。
- [ ] 运行时 `canPaySkillCost/paySkillCost` 可正确校验并扣除 HP、金钱、变量、物品、武器、防具消耗，多条规则并行生效。
- [ ] `Window_ItemInfo` 技能面板在描述前显示消耗区，变量显示变量名，物品/武器/防具显示“数量 + 名称”。
- [ ] 相关前端测试通过，至少覆盖技能消耗字段规范化与保存。

---

## 2. 方案

### 技术方案
采用“编辑器与运行时共用同一结构化数组协议”的方案：

1. 在编辑器类型层新增 `SkillCostEntry` 与消耗来源枚举语义，挂到 `RPGItem.skillCosts`。
2. 在 `SkillPropertyService` 中新增技能消耗归一化、差异比较与保存写回，继续和弹道/迎击字段一并维护。
3. 在 `PropertyPanel` 技能模式中新增“技能消耗规则”卡片，使用 `Form.List` 支持多条消耗并行编辑，并复用当前缓存中的 `System.json / Items.json / Weapons.json / Armors.json` 构建选择项。
4. 在 `base/baseSkillUtils.js` 中扩展默认 `canPaySkillCost/paySkillCost`，让结构化 `skillCosts` 成为技能释放条件和真实扣除的事实源。
5. 在 `Zaun_WindowCore.js` 中新增技能消耗格式化与绘制逻辑，将消耗区放在描述区之前，保持窗口信息布局一致。

### 影响范围
```yaml
涉及模块:
  - frontend/src/types/index.ts: 新增技能消耗类型定义与 RPGItem 扩展字段
  - frontend/src/services/SkillPropertyService.ts: 技能消耗规范化、差异判断、保存写回
  - frontend/src/components/panels/PropertyPanel.tsx: 技能属性模式新增 skillCosts 编辑 UI
  - frontend/src/services/SkillPropertyService.test.ts: 补充技能消耗字段测试
  - base/baseSkillUtils.js: 运行时技能消耗校验与支付
  - js/plugins/Zaun_WindowCore.js: 技能信息窗口新增消耗模块与格式化展示
预计变更文件: 6-8
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 编辑器结构与运行时协议不一致导致可配不可用 | 高 | 使用统一字段名 `skillCosts`，同时改编辑器与运行时 |
| 物品/武器/防具数据在窗口中名称解析失败 | 中 | 展示层做空值兜底，缺失时回退到类型名 + id |
| 变量消耗语义歧义（是否扣减变量） | 中 | 本次按“消耗变量值 = 当前变量至少达到数值且支付时做减法”实现 |
| 老技能没有新字段导致报错 | 低 | 归一化默认输出空数组，运行时空数组直接走旧逻辑 |

---

## 3. 技术设计

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| `skillCosts` | `SkillCostEntry[]` | 技能的结构化消耗规则数组 |
| `SkillCostEntry.type` | `'hp' \| 'hpRate' \| 'gold' \| 'variable' \| 'item' \| 'weapon' \| 'armor'` | 消耗来源类型 |
| `SkillCostEntry.value` | `number` | 固定值、百分比值或变量消耗值 |
| `SkillCostEntry.variableId` | `number` | 变量消耗时对应变量 id |
| `SkillCostEntry.itemId` | `number` | 物品消耗时对应物品 id |
| `SkillCostEntry.weaponId` | `number` | 武器消耗时对应武器 id |
| `SkillCostEntry.armorId` | `number` | 防具消耗时对应防具 id |
| `SkillCostEntry.amount` | `number` | 物品/武器/防具消耗数量 |

### 运行时规则
- `hp`: 需满足 `user.hp > value`，支付时直接扣除固定 HP，至少保留 1 HP。
- `hpRate`: 基于 `user.mhp` 计算向上取整的固定消耗，需满足 `user.hp > costHp`。
- `gold`: 需满足 `$gameParty.gold() >= value`，支付时调用 `$gameParty.loseGold(value)`。
- `variable`: 需满足 `$gameVariables.value(variableId) >= value`，支付时写回 `当前值 - value`。
- `item/weapon/armor`: 需满足 `$gameParty.numItems(data) >= amount`，支付时调用 `$gameParty.loseItem(data, amount)`。
- 多条规则同时存在时全部检查通过后再统一扣除，避免半支付状态。

### 展示规则
- 信息窗口新增“消耗”区，优先于描述区绘制。
- 每行左右两列对称展示，左列是 `消耗:` 标签或空标签，右列显示格式化文本。
- 文本格式：
  - `HP 120`
  - `HP 15%`
  - `120 G`
  - `变量: 任务积分 x5`
  - `2 个药草`
  - `1 把猎枪`
  - `3 件钢甲`

---

## 4. 核心场景

### 场景: 编辑技能多重消耗
**模块**: PropertyPanel / SkillPropertyService
**条件**: 打开 `Skills.json` 任意技能并进入属性模式
**行为**: 添加多条 skillCosts，分别配置 HP%、金钱和物品消耗
**结果**: 保存后技能条目写回结构化 `skillCosts` 数组

### 场景: 技能释放条件判定
**模块**: baseSkillUtils
**条件**: 战斗者尝试释放带 `skillCosts` 的技能
**行为**: 系统逐条检查所有消耗来源是否满足
**结果**: 任一不足则不可释放；全部满足则统一扣除

### 场景: 技能信息窗口查看消耗
**模块**: Window_ItemInfo
**条件**: 菜单或战斗中查看技能详情
**行为**: 窗口先显示范围，再显示消耗模块，最后显示描述
**结果**: 玩家可直接看到变量名、物品/装备名与数量

---

## 5. 技术决策

### skill-cost-sources#D001: 使用结构化 `skillCosts[]` 统一编辑器和运行时协议
**日期**: 2026-04-09
**状态**: ✅采纳
**背景**: 技能消耗需要同时支持多来源并行、编辑器可视化编辑、运行时校验/扣除和信息窗口展示，继续依赖零散字段或备注会导致协议分裂。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 单一结构化 `skillCosts[]` | 可同时表达多种消耗，编辑器/运行时/展示共用一份数据 | 需要一次性改动多个链路 |
| B: 拆成多个顶层字段 | 单字段理解直接 | 字段膨胀，运行时与 UI 判断分支杂乱 |
| C: 继续写备注字符串 | 实现快 | 不可视化、不可测试、运行时解析脆弱 |
**决策**: 选择方案 A
**理由**: 这是唯一能同时满足“多条并行”“结构化编辑”“稳定显示”“运行时统一校验”的方案，后续若扩展 SP/TP/状态类消耗也能继续沿用。
**影响**: 影响编辑器技能数据协议、运行时默认技能消耗结算、技能说明窗口展示。

---

## 6. 成果设计

N/A。本次以现有编辑器视觉系统和游戏窗口风格为准，只做结构化能力扩展与局部信息布局调整。
