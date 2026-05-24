# 任务清单: skill-cost-sources

> **@status:** completed | 2026-04-09 17:23

```yaml
@feature: skill-cost-sources
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
- 更新时间: 2026-04-09 17:23:00

---

## 任务列表

### 1. 编辑器数据模型

- [√] 1.1 在 `frontend/src/types/index.ts` 中定义 `SkillCostEntry` 并把 `skillCosts` 接入 `RPGItem` | depends_on: []
- [√] 1.2 在 `frontend/src/services/SkillPropertyService.ts` 中实现技能消耗的规范化、差异比较和保存写回 | depends_on: [1.1]

### 2. 编辑器技能面板

- [√] 2.1 在 `frontend/src/components/panels/PropertyPanel.tsx` 中新增技能消耗模块与多条配置 UI | depends_on: [1.2]

### 3. 编辑器验证

- [√] 3.1 在 `frontend/src/services/SkillPropertyService.test.ts` 中补充技能消耗字段测试 | depends_on: [1.2]

### 4. 运行时与展示

- [√] 4.1 在 `base/baseSkillUtils.js` 中实现 `skillCosts` 的运行时校验与支付逻辑 | depends_on: [1.2]
- [√] 4.2 在 `js/plugins/Zaun_WindowCore.js` 中增加技能消耗显示模块并调整描述顺序 | depends_on: [4.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-09 17:10:00 | 方案包初始化 | completed | 已创建 proposal.md 与 tasks.md |
| 2026-04-09 17:15:00 | 1.1-2.1 | completed | 编辑器已接入 `skillCosts` 类型、归一化与多条消耗配置 UI |
| 2026-04-09 17:19:00 | 3.1-4.2 | completed | 运行时支付与 `Window_ItemInfo` 消耗区已按统一协议接入 |
| 2026-04-09 17:22:00 | 验证 | completed | `npm exec tsc -- --noEmit`、`vitest run src/services/SkillPropertyService.test.ts`、`npm run build` 通过；`baseSkillUtils.js` 与 `Zaun_WindowCore.js` 语法检查通过 |
| 2026-04-09 17:23:00 | KB/CHANGELOG 同步 | completed | 已补充技能消耗协议、验证记录并准备归档 |

---

## 执行备注

> 本次变更跨 `MyNewEditor` 与 `MyGame` 两个工程：前者负责技能数据编辑，后者负责技能消耗判定和信息显示。实现时以统一 `skillCosts` 协议为唯一事实源。
