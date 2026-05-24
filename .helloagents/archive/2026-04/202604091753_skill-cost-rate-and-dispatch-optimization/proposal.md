# 变更提案: skill-cost-rate-and-dispatch-optimization

## 元信息
```yaml
类型: 新功能+优化
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-04-09
```

---

## 1. 需求

### 背景
上一轮 `skillCosts` 已完成结构化接入，但运行时和展示层仍偏保守：
- 运行时大量使用 `toIntOrZero()` 与字符串 `switch` 分发。
- 金钱和变量目前只有固定值消耗，无法表达百分比语义。
- 信息窗口显示层也沿用了同一批字符串分支和数值兜底。

你已经明确希望把运行时逻辑收口成更直接、热路径更轻的实现：减少过度防御式转换，类型分发改为稳定映射与方法缓存，同时把金币/变量百分比作为正式协议。

### 目标
- 扩展 `skillCosts` 协议，新增 `goldRate` 与 `variableRate` 两种独立类型。
- 编辑器同步支持这两种新类型的编辑、规范化、保存与测试。
- 运行时去掉不必要的 `toIntOrZero` 风格保守转换，收口为稳定类型表驱动。
- 技能信息窗口同步显示金币/变量百分比，并沿用既有“消耗先于描述”的展示顺序。

### 约束条件
```yaml
时间约束: 本轮直接在既有 skillCosts 实现上迭代，不另起兼容层
性能约束: 运行时热路径避免重复 switch 分发和无意义数值归一化
兼容性约束: 旧的 hp/hpRate/gold/variable/item/weapon/armor 配置继续可用
业务约束: goldRate 按当前金币百分比结算；variableRate 按当前变量值百分比结算；物品/武器/防具仍为固定数量
```

### 验收标准
- [ ] 编辑器 `SkillCostType`、`SkillPropertyService` 和技能面板已支持 `goldRate / variableRate`。
- [ ] `SkillPropertyService` 测试已覆盖新类型的规范化与保存比较。
- [ ] 运行时 `baseSkillUtils` 已改为类型表驱动，移除当前技能消耗链路里多余的 `toIntOrZero + switch` 组合。
- [ ] `goldRate` 与 `variableRate` 在释放校验和支付时按“当前值百分比，向上取整”结算。
- [ ] `Window_ItemInfo` 能正确显示金币/变量百分比文案。

---

## 2. 方案

### 技术方案
沿用当前 `skillCosts[]` 作为唯一协议，不新增嵌套模式字段，直接增加两个独立类型：

1. 编辑器类型层把 `SkillCostType` 扩展为 `goldRate / variableRate`。
2. `SkillPropertyService` 按类型表规范化不同条目：
   - `hp / gold / variable` 为固定值
   - `hpRate / goldRate / variableRate` 为 0~100 百分比
   - `item / weapon / armor` 为固定数量
3. `PropertyPanel` 补充两种类型选项，并在变量百分比场景下复用“变量 + 百分比”输入结构。
4. `baseSkillUtils` 把字符串 `switch` 改为稳定 handler registry：
   - `canPayHandlers[type]`
   - `payHandlers[type]`
   - `display/resolve` 需要的通用解析函数按类型表复用
5. `Zaun_WindowCore` 同步改为展示层 handler map，避免重复 switch，并补齐 `%` 文案。

### 影响范围
```yaml
涉及模块:
  - frontend/src/types/index.ts: skillCosts 协议新增 goldRate / variableRate
  - frontend/src/services/SkillPropertyService.ts: 新类型规范化、保存与比较
  - frontend/src/components/panels/PropertyPanel.tsx: 新类型选项与表单输入
  - frontend/src/services/SkillPropertyService.test.ts: 新类型测试覆盖
  - base/baseSkillUtils.js: 运行时 handler registry 与百分比结算
  - js/plugins/Zaun_WindowCore.js: 展示层类型映射与新文案
预计变更文件: 6
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 百分比基准理解不一致 | 中 | 在 proposal 和实现中固定为“当前值百分比，向上取整” |
| 运行时去掉保守转换后暴露脏数据 | 中 | 依赖编辑器规范化为主，运行时保留最小必要边界，不再做泛化兜底 |
| 编辑器/运行时/展示协议再次分裂 | 高 | 所有改动都围绕同一 `SkillCostType` 扩展，三侧同步修改 |

---

## 3. 技术设计

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| `SkillCostType` | `'hp' \| 'hpRate' \| 'gold' \| 'goldRate' \| 'variable' \| 'variableRate' \| 'item' \| 'weapon' \| 'armor'` | 技能消耗类型 |
| `SkillCostEntry.value` | `number` | 固定值或百分比值 |
| `SkillCostEntry.variableId` | `number` | 变量类消耗的目标变量 |
| `SkillCostEntry.amount` | `number` | 物品/武器/防具固定数量 |

### 运行时规则
- `gold`: 扣固定金币值。
- `goldRate`: 按 `$gameParty.gold()` 的当前值计算 `ceil(currentGold * rate / 100)`。
- `variable`: 扣固定变量值。
- `variableRate`: 按 `$gameVariables.value(variableId)` 的当前值计算 `ceil(currentValue * rate / 100)`。
- `hpRate` 继续按当前最大 HP 百分比结算。
- 所有百分比类型统一限制为 `0~100`。
- 多条消耗继续保持“全部满足后再统一支付”。

### 分发设计
- 运行时新增稳定的类型映射常量，避免每次 `switch(type)`。
- 信息窗口展示层复用独立格式化 handler map，减少和运行时规则的分叉。

---

## 4. 核心场景

### 场景: 技能配置金币/变量百分比消耗
**模块**: PropertyPanel / SkillPropertyService
**条件**: 在 `Skills.json` 的属性模式中编辑技能
**行为**: 选择 `goldRate` 或 `variableRate`，填写百分比和变量目标
**结果**: 保存后写回结构化 `skillCosts[]`

### 场景: 技能释放按当前值百分比扣费
**模块**: baseSkillUtils
**条件**: 释放携带 `goldRate / variableRate` 的技能
**行为**: 运行时按当前金币/变量值计算向上取整的实际消耗
**结果**: 不足则不可释放，满足则统一扣除

### 场景: 技能详情查看百分比消耗
**模块**: Window_ItemInfo
**条件**: 查看技能详情
**行为**: 消耗区格式化 `goldRate / variableRate`
**结果**: 玩家可直接看到百分比语义

---

## 5. 技术决策

### skill-cost-rate-and-dispatch-optimization#D001: 金币和变量百分比采用独立类型而不是 mode 字段
**日期**: 2026-04-09
**状态**: ✅采纳
**背景**: 你明确要求选择“新增独立类型”，并希望运行时分发更稳定直接。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: `goldRate / variableRate` 独立类型 | 分发直接，编辑器和展示层判断最简单 | 类型数量增加 |
| B: `gold / variable + mode` | 协议更抽象统一 | 运行时和 UI 都要额外判断 mode |
**决策**: 选择方案 A
**理由**: 这最符合当前你对“减少分支”和“让运行时更直接”的要求，后续 handler registry 也更自然。
**影响**: `types`、`SkillPropertyService`、`PropertyPanel`、`baseSkillUtils`、`Zaun_WindowCore`

### skill-cost-rate-and-dispatch-optimization#D002: 技能消耗分发改为类型表驱动
**日期**: 2026-04-09
**状态**: ✅采纳
**背景**: 当前实现依赖多处 `switch(type)`，扩展新类型后维护成本继续升高。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: handler map / registry | 扩展新类型时只追加映射，热路径更平直 | 需要重排现有实现 |
| B: 继续 switch 扩展 | 改动小 | 分支继续堆积，展示层和运行时容易再次分叉 |
**决策**: 选择方案 A
**理由**: 与本轮“增加类型同时降低分支噪音”的目标一致。
**影响**: `baseSkillUtils`、`Zaun_WindowCore`

---

## 6. 成果设计

N/A。本轮为结构化协议迭代和运行时/展示层优化，不新增视觉设计方向。
