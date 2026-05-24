# 变更提案: effect-ops-panel-and-strict-protocol

## 元信息
```yaml
类型: 重构/优化
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-03-23
```

---

## 1. 需求

### 背景
`gameEffects` 编辑器已经按 `CONFIG_SPEC.md` 和 `EFFECT_TYPE_TEMPLATES.md` 收紧了模板与保存协议，但当前仍存在两处残差：一是 `GameEffectService` 里还保留旧 effectType 和旧字段的兼容迁移逻辑；二是 `ops` 仍然要求用户手写 JSON，不符合最新 `OPS_EDITOR_PANEL_SPEC.md` 定义的结构化编辑要求。

### 目标
- 删除效果编辑器中的旧协议兼容层，严格按当前文档协议运行。
- 为 `gameEffects[*].config.args.ops` 提供结构化编辑面板，保存时仍写回三元组数组。
- 在录入阶段按 `effectType` 限制 `statId/opId/value`，阻止明显错误。

### 约束条件
```yaml
时间约束: 无
性能约束: 不引入新的运行时协议，不增加无关状态管理
兼容性约束: 不保留旧字段兼容层；旧字段发现后直接清理并标记为脏
业务约束: 保存结果必须保持运行时要求的 [[statId, opId, value]] 数组格式
```

### 验收标准
- [ ] `GameEffectService` 不再保留旧 effectType/旧字段兼容迁移分支，旧结构会被清理并标记变更
- [ ] `EffectPanel` 不再要求用户手写 `ops` JSON，而是用结构化行编辑 `statId/opId/value`
- [ ] 保存前会阻止非法 `statId/opId/value`，并按 `effectType` 过滤可选 `statId`
- [ ] `bunx tsc --noEmit`、`bun run test --run src/services/GameEffectService.test.ts`、`bun run build` 通过

---

## 2. 方案

### 技术方案
在 `GameEffectService` 中新增 UI 侧 `ops` 行模型与枚举/转换能力，统一承担 `parseOpsToRows`、`serializeRowsToOps`、`getAllowedStatIds`、`getStatOptions`、`getOpOptions` 和行级校验，同时删除旧兼容 effectType 与旧字段推断逻辑。`EffectPanel` 则改为使用结构化 `opsRows` 状态，基于文档渲染“属性/操作/数值/删除”行面板，并在保存前先完成行级校验，再序列化回运行时三元组数组。

### 影响范围
```yaml
涉及模块:
  - effect-editor: 协议层与面板交互同步收紧
  - data-validation: effectType 下的 ops 校验和默认模板
预计变更文件: 8
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 旧数据进入效果模式后被重新归一化，导致条目自动标脏 | 中 | 保持现有 ensureItemGameEffects 链路，测试覆盖旧字段清理 |
| `ops` 从 JSON 改为结构化后，保存格式可能误写成对象数组 | 高 | service 层集中做 parse/serialize，测试覆盖最终写回结构 |
| effectType 切换时旧 `ops` 行不再合法 | 低 | 继续使用“切换模板时整条重建”的现有逻辑 |

---

## 3. 技术设计

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| `EffectOpRow.statId` | number | 目标属性 id |
| `EffectOpRow.opId` | number | 操作类型 id，固定为 1/2/3 |
| `EffectOpRow.value` | number | 数值，允许整数、小数、负数 |

### UI 行为
- `ops` 面板显示为可增删的结构化行列表。
- 每一行包含 `statId` 下拉、`opId` 下拉、`value` 数值输入框和删除按钮。
- 保存时把 `EffectOpRow[]` 序列化回 `Array<[number, number, number]>`。

---

## 4. 核心场景

### 场景: 结构化编辑效果操作
**模块**: effect-editor
**条件**: 用户打开效果模式并编辑带 `ops` 的共享模板
**行为**: 面板按模板展示结构化操作行，用户通过下拉和数字框录入操作
**结果**: 保存结果写回合法三元组数组，非法输入在保存前被阻止

### 场景: 旧字段清理
**模块**: effect-editor
**条件**: 当前条目的 `gameEffects` 含旧 effectType 或旧 selector/args 字段
**行为**: 进入效果模式时按新协议清理旧字段并归一化为当前模板结构
**结果**: 条目被标记为变更，后续保存只会写出新协议数据

---

## 5. 技术决策

### effect-ops-panel-and-strict-protocol#D001: ops 面板改为 UI 行模型而非保留 JSON 文本框
**日期**: 2026-03-23
**状态**: ✅采纳
**背景**: `OPS_EDITOR_PANEL_SPEC.md` 已要求用户不再手写 `ops` JSON，且 `statId` 必须按模板收紧
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 保留 JSON 输入，仅靠保存校验兜底 | 改动小 | 仍然不符合文档，错误发现晚 |
| B: 引入结构化行模型并统一序列化 | 交互与协议一致，校验更早 | 需要同步改 service 和 panel |
**决策**: 选择方案B
**理由**: 新文档已经把 `ops` 面板规则写死，继续保留 JSON 输入会让编辑器与协议长期分裂
**影响**: `GameEffectService.ts`、`EffectPanel.tsx`、`GameEffectService.test.ts`

### effect-ops-panel-and-strict-protocol#D002: 删除旧 effectType 兼容迁移层
**日期**: 2026-03-23
**状态**: ✅采纳
**背景**: 当前文档协议已经不再接受旧 effectType 和旧 selector/args 字段语义
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 保留迁移层 | 对旧数据更宽容 | 与当前协议冲突，逻辑持续膨胀 |
| B: 发现旧结构即清理并标脏 | 协议清晰，行为可预测 | 旧数据会更频繁触发脏标记 |
**决策**: 选择方案B
**理由**: 用户已明确要求不保留兼容层，且当前运行时/文档都已经按严格协议收口
**影响**: `GameEffectService.ts`、效果模式进入时的归一化链路

---

## 6. 成果设计

N/A。本次为现有编辑器表单收口，不引入新的视觉风格方向。
