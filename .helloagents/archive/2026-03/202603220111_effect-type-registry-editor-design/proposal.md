# 变更提案: effect-type-registry-editor-design

## 元信息
```yaml
类型: 重构
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-03-22
```

---

## 1. 需求

### 背景
当前效果模式仍然是“自由 `module/isStatic/config`”编辑模型，缺少统一的 `effectType` 体系。这样会导致每条效果的 JSON 形状都可能不同，新增效果时也只能从空壳开始填，不利于统一模板、自动生成默认值和后续运行时收敛。

### 目标
- 为 `gameEffects[*]` 顶层结构新增 `effectType`
- 在编辑器内置完整 `effectTypeRegistry`，覆盖文档列出的所有模板
- 新增效果或切换 `effectType` 时，直接生成“完整示例级”模板数据，便于用户基于示例修改
- 保存前按 `effectType` 校验 `module/isStatic/config.selector/config.args` 结构
- 只做编辑器侧重构，不改运行时 `effect` 模块分派逻辑

### 约束条件
```yaml
时间约束: 无
性能约束: 不扫描脚本文件内容，不增加运行时逻辑
兼容性约束: 不保留兼容层；旧字段发现后直接删除并标脏
业务约束: 所有模板都要内置，且默认值优先采用文档中的完整示例，而不是空壳
```

### 验收标准
- [ ] `GameEffectEntry` 新增 `effectType`，并有统一模板注册表来源
- [ ] 编辑器新增效果时必须先确定 `effectType`，且自动写入完整示例级 `module/isStatic/config`
- [ ] 所有文档模板都能在编辑器中选到并生成默认结构
- [ ] `custom_script_effect` 允许用户继续改自定义脚本模块，其余模板默认使用 `effect`
- [ ] 旧效果数据进入效果模式时，会删除旧字段并收敛为新结构，同时标记当前数据文件为脏

---

## 2. 方案

### 技术方案
以 `GameEffectService` 为中心新增模板注册表和模板工具函数，统一负责：
- `effectType` 定义与默认示例生成
- 顶层 `module/isStatic/effectType/config` 归一化
- 按模板校验 `selector/args` 结构
- 旧条目迁移时删除旧字段，并把缺少 `effectType` 的旧数据收敛为 `custom_script_effect`

`EffectPanel` 改为 effectType 驱动：
- 新增效果时先选择模板类型
- 每个效果项显示 `effectType` 选择框
- 当用户切换 `effectType` 时，整条效果自动替换为该模板完整示例
- `config` 继续保留 JSON 主编辑方式，但默认文本直接来自模板完整示例，便于手改

### 影响范围
```yaml
涉及模块:
  - 前后端交互与性能修复记录: 效果模式交互从自由结构切换为模板驱动
  - 数据加载与地图管理: gameEffects 数据结构新增 effectType 并统一模板化
预计变更文件: 4
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 旧效果数据无法可靠推断所属模板 | 中 | 缺失 `effectType` 时统一收敛为 `custom_script_effect`，保留 `module/config` 主体并标脏 |
| 模板 JSON 与用户手改内容冲突 | 中 | 切换 `effectType` 时明确重置整条效果为新模板示例，避免混杂旧字段 |
| 文档模板较多，手写默认值容易分叉 | 中 | 通过统一 registry 常量集中维护，测试校验关键模板默认值 |

---

## 3. 技术设计

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| gameEffects[].effectType | string | 效果模板类型，唯一决定模板结构 |
| gameEffects[].module | string | 默认来自模板；常规模板固定为 `effect` |
| gameEffects[].isStatic | boolean | 默认来自模板；用户可调整 |
| gameEffects[].config.selector | Record<string, unknown> | 来自模板完整示例 |
| gameEffects[].config.args | Record<string, unknown> | 来自模板完整示例 |

### 注册表设计
- 在 `GameEffectService` 内置 `effectTypeRegistry`
- 每个模板项至少包含：
  - `effectType`
  - `label`
  - `module`
  - `isStatic`
  - `config`
  - `allowCustomModule`
- 默认值优先直接按文档中的完整示例落地

---

## 4. 核心场景

### 场景: 新增模板化效果
**模块**: 前后端交互与性能修复记录
**条件**: 用户在效果模式点击“添加效果”
**行为**: 编辑器要求选择 `effectType`，并立即写入该模板的完整示例结构
**结果**: 用户无需从空壳 JSON 开始，直接在完整示例上修改

### 场景: 旧效果数据收敛
**模块**: 数据加载与地图管理
**条件**: 当前条目的旧 `gameEffects` 缺少 `effectType` 或包含旧字段
**行为**: 编辑器删除旧字段，把旧条目收敛为新结构并标记当前数据文件为脏
**结果**: 编辑器内不再存在旧结构兼容分支

---

## 5. 技术决策

### effect-type-registry-editor-design#D001: 效果编辑继续保留 JSON 主编辑，但由模板注册表生成完整示例
**日期**: 2026-03-22
**状态**: ✅采纳
**背景**: 用户明确表示“模板直接按照完整示例给，我直接修改示例会更方便”，而不是要求每个模板都做成完全字段化表单。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 模板注册表 + JSON 主编辑 | 实现集中，符合“直接改示例”习惯，所有模板可快速接入 | 结构化体验不如动态表单 |
| B: 每个模板做动态字段化表单 | 用户交互更直观 | 改动面大，模板增多后维护成本高 |
**决策**: 选择方案A
**理由**: 这次目标是先把模板体系和数据结构做稳，JSON 主编辑正好符合当前使用习惯，也能最小成本覆盖全部模板。
**影响**: `frontend/src/types/index.ts`、`frontend/src/services/GameEffectService.ts`、`frontend/src/components/panels/EffectPanel.tsx`、测试与知识库文档

---

## 6. 成果设计

N/A
