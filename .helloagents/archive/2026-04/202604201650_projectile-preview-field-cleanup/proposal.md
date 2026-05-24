# 变更提案: projectile-preview-field-cleanup

## 元信息
```yaml
类型: 修复
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-04-20
```

---

## 1. 需求

### 背景
弹道模式的预览配置字段 `sourceType/sourceId/targetType/targetId/weaponId/skillId` 当前混入了 `Projectiles.json` 的弹道模板协议。它们只描述编辑器预览中的发射方、目标方和临时武器/技能选择，不属于运行时弹道模板本体。

### 目标
- 从 `ProjectileTemplate` 持久化协议中删除预览态字段。
- 修复模式不再为 `Projectiles.json` 生成这些字段，并会清理历史遗留字段。
- 弹道预览继续使用面板临时 state 组装 view model，不影响预览能力。
- 手动清理当前弹道数据中的这些字段。

### 约束条件
```yaml
时间约束: 无
性能约束: 不在预览热路径新增持久化写回或额外修复扫描
兼容性约束: 保留现有 launchAnimation/segments/startAnimationId/endAnimationId 协议
业务约束: Actors/Enemies 的 projectileOffset 归属不变，不随本次清理移动
```

### 验收标准
- [ ] 新建弹道模板不再包含 `sourceType/sourceId/targetType/targetId/weaponId/skillId`。
- [ ] 修复模式处理 `Projectiles.json` 时会移除历史预览态字段。
- [ ] 弹道预览仍能通过临时 view model 渲染来源、目标、武器/技能偏移。
- [ ] 当前 `D:/RMProjects/MyGame/Projectiles.json` 与 `D:/RMProjects/MyGame/data/Projectiles.json` 中的预览态字段已被批量移除。

---

## 2. 方案

### 技术方案
`ProjectileTemplateService` 移除默认模板中的预览字段，并在 `normalizeProjectileDataEntry()` 里显式剥离旧字段。`cloneProjectileTemplate()` 复制弹道时也不继承这些字段，防止旧数据复制后继续污染。

`ProjectilePanel` 初始化预览状态时不再从模板读取 `sourceType/sourceId/targetType/targetId/weaponId/skillId`，而是按面板临时状态和记忆缓存继续驱动 `previewTemplate`。`ProjectileCanvas` 仍接收临时 view model，因此预览渲染能力不需要迁移到持久化数据。

### 影响范围
```yaml
涉及模块:
  - ProjectileTemplateService: 收口弹道模板持久化协议
  - ProjectilePanel/ProjectileCanvas: 保持预览态为临时 view model
  - DataAuditService: 修复模式随 normalize 清理历史字段
  - Projectiles.json: 清理当前数据文件
预计变更文件: 7+
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 清理数据文件误删运行时需要字段 | 低 | 这些字段只用于编辑器预览，运行时弹道模板只需要动画和轨迹字段 |
| 预览默认来源丢失 | 中 | 面板保留临时 state 默认值，预览继续用 `previewTemplate` 注入 |
| 旧测试仍期待补齐字段 | 中 | 更新 `ProjectileTemplateService.test.ts` 和 `DataAuditService.test.ts` 到新协议 |

---

## 3. 技术设计

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 弹道模板名称 |
| `startAnimationId` | number | 起始动画 |
| `launchAnimation` | object | 发射动画与轨迹段 |
| `endAnimationId` | number | 结束动画 |

以下字段从持久化模板中删除，仅允许存在于预览 view model：
`sourceType/sourceId/targetType/targetId/weaponId/skillId`。

---

## 4. 核心场景

### 场景: 修复模式清理弹道预览字段
**模块**: 弹道与保存防回归基线  
**条件**: `Projectiles.json` 中存在旧预览态字段  
**行为**: 执行修复模式或本次数据清理  
**结果**: 弹道模板保留动画和轨迹字段，预览态字段被移除

---

## 5. 技术决策

### projectile-preview-field-cleanup#D001: 预览态不进入弹道持久化协议
**日期**: 2026-04-20  
**状态**: ✅采纳  
**背景**: 发射方、目标方、武器和技能只是预览上下文，保存进弹道模板会制造错误数据归属。  
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 从协议层删除并清理历史字段 | 数据归属正确，修复模式可持续防回归 | 需要同步服务、类型、测试和数据 |
| B: 只在 UI 保存前过滤 | 改动较小 | 修复模式和复制旧模板仍会复发 |
**决策**: 选择方案 A  
**理由**: 只有协议层收口才能保证新建、复制、修复和批量清理都不会再产生这些字段。  
**影响**: `ProjectileTemplateService`、`ProjectilePanel`、`ProjectileCanvas`、`DataAuditService`、当前 `Projectiles.json`。

---

## 6. 成果设计

N/A。该任务是数据协议和修复链收口，不引入新的视觉设计。
