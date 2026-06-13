# HelloAGENTS 知识库索引

## 项目
- 名称：RM Data Workbench
- 类型：RPG Maker 数据扩展编辑器（Wails + Go + React + TypeScript）
- 最近更新：2026-06-12

## 入口文件
- 项目上下文：`helloagents/context.md`
- 变更记录：`helloagents/CHANGELOG.md`
- 模块索引：`helloagents/modules/_index.md`
- 归档索引：`helloagents/archive/_index.md`

## 当前系统摘要
- 编辑器当前已覆盖普通数据、地图、任务、弹道、装备、掉落、脚本与效果模式。
- 技能属性模式现已支持结构化 `skillCosts`，可统一编辑 HP、HP%、金钱固定值/百分比、变量固定值/百分比、物品、武器、防具等多来源消耗，并与 `MyGame` 运行时/信息窗口共用同一协议。
- 技能属性模式现已继续扩展到结构化 `skillEffectSpec`：伤害类型、伤害元素、暴击、分散、公式来源、耐久变化和技能耐久统一在编辑器中维护，旧 `damage` 迁移只保留在修复模式。
- 敌人属性模式现已支持结构化维护职业、等级区间、Boss、赏金、攻击动画和迎击技能，不再依赖备注模板手写。
- 数据加载采用“普通数据库预载 + 地图按需加载”的双层模型。
- 模式切换、数据切换、程序关闭已统一到同一套未保存保护。
- 脚本编辑器已收口为无时间戳命名与真实 dirty 判定。
- 效果模式已收口为严格模板协议与结构化 `ops` 编辑，不再保留旧 effect 兼容层。
- 属性与相邻模式已完成一轮高收益性能收紧：引用数据改为 `referenceRevision` 驱动，多个大列表/选项构建路径已 memo 化。
- 弹道模板持久化协议已移除预览态来源/目标/武器/技能字段；预览上下文仅由编辑器临时 view model 提供。
- 武器/防具属性模式已新增顶层 `upgradeCosts[]` 强化耗材协议，用于逐级维护金币、必需物品和保底物品消耗。
- 职业属性模式的 `ClassLevelExtensions.json` 已升级为曲线配置协议：按最大等级、经验四参数、每项属性目标值和成长模式派生 99 级以后经验与基础属性；保存链只标脏扩展文件，不改写 `Classes.json.params` 原始矩阵。

## 模块导航
- [项目上下文](/D:/RMProjects/MyNewEditor/.helloagents/context.md)
- [变更记录](/D:/RMProjects/MyNewEditor/.helloagents/CHANGELOG.md)
- [模块索引](/D:/RMProjects/MyNewEditor/.helloagents/modules/_index.md)
- [归档索引](/D:/RMProjects/MyNewEditor/.helloagents/archive/_index.md)

## 当前重点模块
- `frontend-interaction-and-performance.md`
  - 当前前后端交互、脚本编辑器、效果面板与 SaveAll 行为约束。
- `data-loading-and-map-management.md`
  - 当前数据加载、地图管理、外部变化确认与效果协议规则。
- `projectile-regression-baseline.md`
  - 弹道预览、偏移保存和坐标语义的回归基线。
- `equip-mode-and-system-rules.md`
  - 装备模式、槽位规则与系统装备扩展约束。
- `drop-mode-and-enemy-drop-rules.md`
  - 掉落模式、enemyDrops 结构与敌人掉落联动规则。

## 使用原则
- `modules/` 记录当前真实状态。
- `CHANGELOG.md` 与 `archive/` 记录历史演进和方案包。
- 若知识库与代码冲突，以代码为准。
