# 任务清单: effect-ops-panel-and-strict-protocol

> **@status:** completed | 2026-03-23 03:11

```yaml
@feature: effect-ops-panel-and-strict-protocol
@created: 2026-03-23
@status: completed
@mode: R2
```

## LIVE_STATUS

```json
{"status":"completed","completed":4,"failed":0,"pending":0,"total":4,"done":4,"percent":100,"current":"方案已完成，等待归档","updated_at":"2026-03-23 03:12:00"}
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 0 | 0 | 4 |

---

## 任务列表

### 1. 协议层收口

- [√] 1.1 在 `frontend/src/services/GameEffectService.ts` 中删除旧 effectType/旧字段兼容迁移逻辑，并补充 ops 行模型与枚举/转换辅助 | depends_on: []
- [√] 1.2 在 `frontend/src/services/GameEffectService.test.ts` 中更新旧兼容层测试，并补充 ops 行模型、模板约束与序列化校验 | depends_on: [1.1]

### 2. 面板改造与验收

- [√] 2.1 在 `frontend/src/components/panels/EffectPanel.tsx` 中按 `OPS_EDITOR_PANEL_SPEC.md` 改为结构化 ops 编辑面板 | depends_on: [1.1]
- [√] 2.2 运行类型检查/测试/构建，随后同步知识库与归档方案包 | depends_on: [1.2, 2.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-23 03:03:00 | 初始化方案包 | 完成 | 已创建 proposal/tasks，并锁定本轮协议与 ops 面板目标 |
| 2026-03-23 03:10:00 | 协议层与面板改造 | 完成 | 已删除旧兼容层，ops 改为结构化行编辑 |
| 2026-03-23 03:11:00 | 前端验证 | 完成 | `bunx tsc --noEmit`、`bun run test --run src/services/GameEffectService.test.ts`、`bun run build` 通过 |

---

## 执行备注

> 本轮不新增兼容层；发现旧协议结构时按当前文档直接清理并标记为变更。
