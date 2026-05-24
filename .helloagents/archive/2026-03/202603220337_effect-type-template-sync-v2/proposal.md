# 变更提案: effect-type-template-sync-v2

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
`EFFECT_TYPE_TEMPLATES.md` 已更新，效果模板体系从上一版的大而散清单收缩为 8 个模板，并删除了 `slotIndex/tags/metaEquals` 等旧 selector 字段。当前编辑器侧仍停留在上一版 registry，会继续生成已废弃模板和旧字段，已经和新的运行时实现脱节。

### 目标
- 把编辑器侧 `effectType`、模板注册表、默认示例和保存校验同步到新版文档
- 删除文档已废弃的模板类型和旧 selector/args 字段
- 新增 `meta_present_bonus`
- 对旧模板类型条目统一收敛为 `custom_script_effect`，并删除旧字段、标记为脏

### 约束条件
```yaml
时间约束: 无
性能约束: 不增加新的扫描链路
兼容性约束: 不做兼容层；旧模板类型统一收敛为 custom_script_effect
业务约束: 已废弃的 selector/args 字段必须直接删除，不保留旧含义
```

### 验收标准
- [ ] `GameEffectType` 只保留新版文档中的 8 个模板
- [ ] registry 默认示例与新版文档一致
- [ ] 旧模板类型进入效果模式时会被收敛为 `custom_script_effect`
- [ ] `slotIndex/tags/metaEquals/requiredTags/requiredBaseIds` 等旧字段会被删除并标脏
- [ ] 类型检查、单测、构建全部通过

---

## 2. 方案

### 技术方案
继续以 `GameEffectService` 作为唯一规则入口，收缩 `GameEffectType` 与 `GAME_EFFECT_TYPE_DEFINITIONS`，新增旧模板类型识别与迁移函数。迁移时若命中已废弃模板类型，直接转成 `custom_script_effect`，保留 `module/isStatic/config` 主体，但清理已废弃字段。`EffectPanel` 继续复用 registry 自动生成菜单和下拉，因此只需跟随 registry 收缩即可。

### 影响范围
```yaml
涉及模块:
  - 前后端交互与性能修复记录: 效果类型菜单、模板示例与保存校验
  - 数据加载与地图管理: gameEffects 旧模板类型收敛与旧字段清理
预计变更文件: 6
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 旧模板条目迁移后示例与用户预期不一致 | 中 | 统一转为 custom_script_effect，仅保留核心主体，避免错误映射到新语义 |
| 删除旧字段导致历史配置丢失 | 中 | 仅删除文档明确废弃的字段，同时保留其余 config 主体 |
| registry 收缩后 UI 选项变化影响现有编辑习惯 | 低 | 面板继续保留相同交互模型，只收缩模板项和默认示例 |

---

## 3. 技术设计

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| GameEffectType | union | 收缩为 8 个新模板类型 |
| legacyEffectType | string | 仅在归一化阶段识别旧模板类型并迁移，不进入最终结构 |
| config.selector | Record<string, unknown> | 删除 `slotIndex/tags/metaEquals`，保留新版字段 |
| config.args | Record<string, unknown> | 删除 `requiredTags/requiredBaseIds`，新增 `requiredMetaKeys` |

---

## 4. 核心场景

### 场景: 旧模板类型迁移
**模块**: 数据加载与地图管理
**条件**: 当前条目存在已废弃的旧模板类型
**行为**: 编辑器将其迁移为 `custom_script_effect`，并清理已废弃字段
**结果**: 数据结构与新版文档一致，当前文件被标记为脏

### 场景: 新版模板创建
**模块**: 前后端交互与性能修复记录
**条件**: 用户在效果模式新增效果
**行为**: registry 只展示新版 8 个模板，并生成新版示例
**结果**: 编辑器与当前运行时模板体系一致

---

## 5. 技术决策

### effect-type-template-sync-v2#D001: 已废弃模板类型统一迁移到 custom_script_effect
**日期**: 2026-03-22
**状态**: ✅采纳
**背景**: 新文档已经移除了多种旧模板类型，但这些历史数据仍可能存在于项目文件中。直接报错会阻断编辑；强行映射到某个新模板又容易误改语义。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 统一迁移到 `custom_script_effect` | 收口简单，不误判新语义，保留 module/config 主体 | 需要用户后续人工整理 |
| B: 尝试自动映射到新版模板 | 用户感知更少 | 容易错映射，风险高 |
**决策**: 选择方案A
**理由**: 这是最保守且不失真的迁移方式，也符合你明确确认的策略。
**影响**: `frontend/src/services/GameEffectService.ts`、测试、效果模式脏标记链路

---

## 6. 成果设计

N/A
