# 变更提案: effect-config-spec-sync

## 元信息
```yaml
类型: 重构/修复
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-03-23
```

---

## 1. 需求

### 背景
`D:/RMProjects/MyGame/effects/EFFECT_TYPE_TEMPLATES.md` 与 `D:/RMProjects/MyGame/effects/CONFIG_SPEC.md` 已进一步收紧 `gameEffects` 协议。当前编辑器虽然已经切到 effectType 驱动表单，但仍存在几处偏差：前端未接入 `single_cunit_bonus / pair_same_cunit_owner_bonus`，旧 `sameBaseId` 字段仍在模板默认值里继续生成，`selector/args` 的字段类型还没有完全按严格协议校验，且 `ops` 仍允许所有模板自由填写 `101/102` 这类只应暴露给 owner 类模板的 statId。

### 目标
- 让编辑器侧 effectType、selector、args 和两份最新文档保持一致。
- 新增 `single_cunit_bonus`、`pair_same_cunit_owner_bonus` 的类型、模板和面板支持。
- 彻底移除 `sameBaseId` 等旧协议残留，发现旧数据时直接删除并标记当前数据为脏。
- 把 CONFIG 规格里的严格约束下沉到编辑器保存链路，避免继续写出运行时不再兼容的数据。

### 约束条件
```yaml
时间约束: 无硬性截止，按当前 effect 编辑器链路一次收口
性能约束: 仅限编辑器侧校验与表单约束，不引入运行时额外开销
兼容性约束: 不做兼容层；旧字段发现后直接删除并标记为脏
业务约束:
  - selector 只允许保存预规范化字段
  - 共享模板 args 不再保留 sameBaseId
  - owner_stat_bonus 支持 static/runtime，其他共享模板按模板默认值收口
  - 101/102 仅允许在 owner 类和引擎类模板中通过校验
```

### 验收标准
- [ ] 前端 `GameEffectType`、模板注册表和效果面板支持 `single_cunit_bonus`、`pair_same_cunit_owner_bonus`
- [ ] 旧 `sameBaseId`、`slotIndex`、`tags`、`metaEquals` 等旧字段进入效果模式时会被清理并标记为脏
- [ ] 保存时会校验 selector/args 字段类型与模板允许的 statId，非法数据不能写回
- [ ] `owner_stat_bonus` 的 `isStatic` 可切换，其他共享模板按协议限制为固定值

---

## 2. 方案

### 技术方案
以 `GameEffectService` 作为编辑器侧协议单一事实源，统一维护：
- `GameEffectType` 联合类型与模板注册表
- selector/args 模板默认值与旧字段清理
- `isStatic` 可编辑策略
- `ops.statId` 允许范围
- selector/args 的严格类型校验

`EffectPanel` 继续保留当前类型驱动表单框架，但把 `isStatic` 开关、保存校验和错误提示改为依赖 service 元数据。`GameEffectService.test.ts` 补齐新增模板、旧字段清理和 statId 约束的回归覆盖。

### 影响范围
```yaml
涉及模块:
  - frontend-interaction-and-performance: 效果面板交互、isStatic 限制、保存校验提示
  - data-loading-and-map-management: gameEffects 严格协议、旧字段清理与模板同步记录
预计变更文件: 6-9
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 旧效果数据进入面板后被严格归一化，用户会看到脏标记 | 中 | 仅删除已废弃字段，保留有效 selector/args 内容，并在文档中记录 |
| statId 约束收紧后，已有不合规模板可能无法保存 | 中 | 在保存提示中明确指出 effect 序号和非法 statId |
| isStatic 从自由切换收紧到模板规则后，可能影响现有编辑习惯 | 低 | 仅对文档已明确固定值的模板禁用切换，保留 owner/custom 的自由度 |

---

## 3. 技术设计（可选）

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| `effectType` | union string | 新增前端缺失的 `single_cunit_bonus`、`pair_same_cunit_owner_bonus` |
| `selector` | `Record<string, number[] \| string[]>` | 只允许 `slotIndexes/etypeIds/equipTypes/wtypeIds/atypeIds/metaKeys` |
| `args.requiredCount` | `number` | 仅 count 类模板允许 |
| `args.requiredMetaKeys` | `string[]` | 仅 `meta_present_bonus` 允许 |
| `args.ops` | `Array<[number, number, number]>` | 共享模板统一使用，按模板校验可用 statId |

---

## 4. 核心场景

> 执行完成后同步到对应模块文档

### 场景: 旧效果进入效果模式
**模块**: data-loading-and-map-management
**条件**: 当前条目存在旧 `sameBaseId` 或旧 selector 字段
**行为**: 编辑器归一化当前条目 `gameEffects`
**结果**: 旧字段被删除，条目标记为脏，但保留有效模板内容

### 场景: 保存 owner/cunit/engine 模板
**模块**: frontend-interaction-and-performance
**条件**: 用户在效果面板编辑共享模板
**行为**: 保存前校验模板允许的 statId 与 isStatic
**结果**: 非法 `101/102` 或非法 isStatic 组合被阻止保存

---

## 5. 技术决策

> 本方案涉及的技术决策，归档后成为决策的唯一完整记录

### effect-config-spec-sync#D001: 以 CONFIG_SPEC 为准把效果编辑器收口为严格协议
**日期**: 2026-03-23
**状态**: ✅采纳
**背景**: 当前 effect 编辑器虽然已是模板驱动，但仍残留旧字段和宽松校验；运行时已不再做兼容转换，因此编辑器必须承担协议约束。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 继续局部打补丁 | 改动小、见效快 | 会继续留下旧字段和模板约束分散问题 |
| B: 以 `GameEffectService` 为唯一协议源统一收口 | 类型、模板、校验和 UI 规则一致，后续更稳 | 本轮改动面更大，需要同步测试 |
**决策**: 选择方案 B
**理由**: 两份文档都已把协议收紧到编辑器侧预规范化，继续局部修补会反复回归；统一下沉到 service 才能保证模板、校验、UI 和旧数据清理同源。
**影响**: `frontend/src/types/index.ts`、`frontend/src/services/GameEffectService.ts`、`frontend/src/components/panels/EffectPanel.tsx`、`frontend/src/services/GameEffectService.test.ts`

---

## 6. 成果设计

N/A。本轮为现有效果编辑器的协议与交互约束收口，不新增独立视觉设计方向。
