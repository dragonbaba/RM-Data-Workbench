# 变更提案: 武器范围修复模式保留协议

## 元信息
```yaml
类型: 修复
方案类型: implementation
优先级: P1
状态: completed
创建: 2026-05-09
```

---

## 1. 需求

### 背景
`MyGame` 使用编辑器修复模式后，部分武器范围被错误改写，例如原本应为扇形的武器在游戏中表现成圆形；同时贯穿、全体、受控线形等模式存在被统一当成范围形状重建的风险。

### 目标
- 修复 `RangePropertyService` 与 `EquipmentPropertyService` 对武器范围协议的推断和标准化。
- 修复 `DataAuditService` 修复模式，避免将合法 `areaMode=3` 贯穿和 `areaMode=4` 全体改写成普通范围。
- 增加回归测试，覆盖扇形、圆形、受控线形、贯穿、全体、连发和目标数保留。
- 为 `MyGame` 后续数据修复提供稳定编辑器协议基础。

### 约束条件
```yaml
兼容性约束: 不改变数据库协议字段名
业务约束: 编辑器修复模式只能补齐缺失字段，不应改变有效范围语义
非目标: 不调整游戏运行时战斗公式，不调整商店掉落
```

### 验收标准
- [x] `RangePropertyService` 保留扇形/圆形/线形的既有语义。
- [x] `EquipmentPropertyService` 不再把 `areaMode=3/4` 当普通范围修复。
- [x] `DataAuditService` 修复模式覆盖范围协议回归。
- [x] 目标测试与构建通过。

---

## 2. 方案

### 技术方案
将编辑器范围修复收口为“缺失补齐 + 有效协议保留”：只在缺字段或字段不合法时补默认，不用 `shapeParams` 反推覆盖 `areaMode`。对 `areaMode=2` 下的 `shapeType` 分别维护圆形、扇形、受控线形；对 `areaMode=3` 和 `areaMode=4` 直接保留。

### 影响范围
```yaml
涉及模块:
  - frontend/src/services/RangePropertyService.ts: 范围参数标准化
  - frontend/src/services/EquipmentPropertyService.ts: 装备范围字段修复
  - frontend/src/services/DataAuditService.test.ts: 数据修复回归
  - frontend/src/services/RangePropertyService.test.ts: 范围服务回归
  - frontend/src/services/EquipmentPropertyService.test.ts: 装备修复回归
预计变更文件: 5
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 修复模式再次覆盖有效范围 | 高 | 为 `areaMode=2/3/4` 分别加测试 |
| 编辑器表单默认值覆盖真实值 | 中 | 收口逻辑读取现值后再纠正 |
| 旧存档装备实例仍保留旧范围 | 低 | 标注数据库修复不等于存档实例迁移 |

---

## 5. 技术决策

### weapon-range-repair-mode-preserve-protocol#D001: 修复模式保留有效协议
**日期**: 2026-05-09
**状态**: 采纳
**背景**: 武器范围协议中 `areaMode` 是行为语义，`shapeType/shapeParams` 是几何参数；把几何参数反推成行为模式会破坏数据。
**决策**: 修复模式保留有效 `areaMode/shapeType/areaTargetCount/repeatTime`，只修缺失字段和非法值。
**理由**: 能避免扇形变圆形、贯穿变线形、全体变圆形等回归。
**影响**: 后续 `MyGame` 数据修复以编辑器协议为可信基础。

---

## 6. 成果设计

N/A，非视觉任务。
