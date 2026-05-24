# 任务清单: property-weapon-attack-fields

> **@status:** completed | 2026-03-18 20:52

```yaml
@feature: property-weapon-attack-fields
@created: 2026-03-18
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 0 | 0 | 4 |

---

## 任务列表

### 1. 属性模式字段扩展

- [√] 1.1 在 `frontend/src/types/index.ts` 中补充 `price`、`attackSkillId`、`attackElementId` 字段定义 | depends_on: []
- [√] 1.2 在 `frontend/src/components/panels/PropertyPanel.tsx` 中增加价格、攻击技能、攻击元素的引用数据加载、表单渲染与保存逻辑 | depends_on: [1.1]

### 2. 依赖刷新与回归验证

- [√] 2.1 在 `frontend/src/services/BaseDataReloadService.ts` 中补充武器属性模式对 `Skills.json` 的依赖监听 | depends_on: [1.2]
- [√] 2.2 为依赖刷新或属性逻辑补充回归测试并完成类型检查/构建验证 | depends_on: [2.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-18 20:47 | 方案设计 | completed | 已确认范围：跳过启动写文件问题，仅实现属性模式字段扩展与依赖刷新 |
| 2026-03-18 20:50 | 1.1 / 1.2 | completed | 已补充 RPGItem 新字段，并完成 PropertyPanel 表单、选项来源与保存逻辑扩展 |
| 2026-03-18 20:50 | 2.1 / 2.2 | completed | 已补充武器属性模式对 Skills.json 的依赖命中，并通过 targeted test、tsc、build 验证 |

---

## 执行备注

> 记录执行过程中的重要说明、决策变更、风险提示等

- 用户已明确排除“启动时自动修改文件”问题，本方案不包含该部分修复。
- 新字段采用现有属性面板“保存基础属性”入口统一提交，不新增独立保存按钮。
