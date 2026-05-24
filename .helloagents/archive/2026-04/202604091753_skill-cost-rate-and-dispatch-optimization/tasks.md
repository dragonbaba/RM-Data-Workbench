# 任务清单: skill-cost-rate-and-dispatch-optimization

> **@status:** completed | 2026-04-09 18:00

```yaml
@feature: skill-cost-rate-and-dispatch-optimization
@created: 2026-04-09
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 6 | 0 | 0 | 6 |

## LIVE_STATUS

- 状态: completed
- 当前任务: 已完成
- 进度: 6/6 (100%)
- 更新时间: 2026-04-09 18:00:00

---

## 任务列表

### 1. 协议与编辑器同步

- [√] 1.1 在 `frontend/src/types/index.ts` 中扩展 `SkillCostType`，新增 `goldRate / variableRate` | depends_on: []
- [√] 1.2 在 `frontend/src/services/SkillPropertyService.ts` 中接入新类型规范化、比较与保存 | depends_on: [1.1]
- [√] 1.3 在 `frontend/src/components/panels/PropertyPanel.tsx` 中补齐新类型选项与表单输入 | depends_on: [1.2]

### 2. 运行时与展示收口

- [√] 2.1 在 `base/baseSkillUtils.js` 中改为类型表驱动，实现 `goldRate / variableRate` 百分比结算 | depends_on: [1.2]
- [√] 2.2 在 `js/plugins/Zaun_WindowCore.js` 中改为展示层类型映射，并补齐百分比显示 | depends_on: [1.2]

### 3. 验证

- [√] 3.1 在 `frontend/src/services/SkillPropertyService.test.ts` 中补充新类型测试，并完成类型检查/测试/构建验证 | depends_on: [1.3, 2.1, 2.2]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-09 17:53:00 | 方案包初始化 | completed | 已创建 proposal.md 与 tasks.md |
| 2026-04-09 17:56:00 | 1.1-1.3 | completed | 编辑器已接入 `goldRate / variableRate` 协议、规范化和表单输入 |
| 2026-04-09 17:59:00 | 2.1-2.2 | completed | 运行时与技能信息窗口已改为类型表驱动，并补齐百分比显示 |
| 2026-04-09 18:00:00 | 3.1 验证 | completed | `npm exec tsc -- --noEmit`、`vitest run src/services/SkillPropertyService.test.ts`、`npm run build`、两份运行时文件语法检查通过 |

---

## 执行备注

> 本轮是对上一轮 `skillCosts` 的协议迭代和运行时优化，不新增兼容层；金币和变量百分比按“当前值百分比，向上取整”处理。
