# 任务清单: fix-external-change-prompt-dedup

> **@status:** completed | 2026-04-21 10:59

```yaml
@feature: fix-external-change-prompt-dedup
@created: 2026-04-21
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 0 | 0 | 4 |

---

## LIVE_STATUS

```yaml
status: completed
completed: 4
failed: 0
pending: 0
total: 4
done: 4
percent: 100
current: 已完成归档前收尾
updated_at: 2026-04-21 11:01:00
```

---

## 任务列表

### 1. 外部变更队列修复

- [√] 1.1 新增可测试的外部数据变更队列，统一处理路径标准化、会话内抑制和短时冷却 | depends_on: []
- [√] 1.2 在 `frontend/src/hooks/useFileOperations.ts` 中接入新队列，并收紧下一轮批次的聚合窗口，避免重复弹窗 | depends_on: [1.1]

### 2. 回归验证

- [√] 2.1 新增或补充测试，覆盖重复事件抑制与短时间多文件聚合行为 | depends_on: [1.1, 1.2]
- [√] 2.2 执行相关测试、类型检查与必要的 lint，确认未破坏现有外部重载规则 | depends_on: [2.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-21 10:53:00 | 方案包创建 | completed | 已生成 proposal.md 与 tasks.md |
| 2026-04-21 10:55:00 | 根因确认 | completed | 确认为确认弹窗期间同一路径可重新入队，触发后续重复提示 |
| 2026-04-21 10:57:00 | 1.1/1.2 | completed | 新增 `ExternalDataChangeQueue`，`useFileOperations` 改为按会话抑制和短时冷却聚合外部变更 |
| 2026-04-21 10:58:00 | 2.1 | completed | 新增队列单测，覆盖标准化去重、会话抑制、冷却恢复和非目标文件过滤 |
| 2026-04-21 11:00:00 | 2.2 | completed | `vitest` 与 `tsc` 通过；定向 `eslint` 仅剩 `useFileOperations.ts` 既有 warning |

---

## 执行备注

> 本次修复保持现有重载影响判定与提示文案不变，只收紧事件聚合与重复提示抑制策略。
