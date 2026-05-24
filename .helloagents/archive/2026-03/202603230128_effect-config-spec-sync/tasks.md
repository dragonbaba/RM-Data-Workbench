# 任务清单: effect-config-spec-sync

```yaml
@feature: effect-config-spec-sync
@created: 2026-03-23
@status: completed
@mode: R2
```

## LIVE_STATUS

```yaml
current_stage: DEVELOP
workflow_mode: INTERACTIVE
current_task: 已完成 effect 配置严格协议与模板收口
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 6 | 0 | 0 | 6 |

---

## 任务列表

### 1. 方案包与上下文收口

- [√] 1.1 创建方案包并结合 `EFFECT_TYPE_TEMPLATES.md` 与 `CONFIG_SPEC.md` 明确本轮协议收口范围 | depends_on: []

### 2. 类型与协议收口

- [√] 2.1 在 `frontend/src/types/index.ts` 与 `frontend/src/services/GameEffectService.ts` 中补齐 `single_cunit_bonus`、`pair_same_cunit_owner_bonus` 并同步模板注册表 | depends_on: [1.1]
- [√] 2.2 在 `frontend/src/services/GameEffectService.ts` 中移除 `sameBaseId` 等旧协议残留，补 selector/args 严格类型归一化与模板级 `isStatic`/`statId` 约束 | depends_on: [2.1]

### 3. 面板与测试同步

- [√] 3.1 在 `frontend/src/components/panels/EffectPanel.tsx` 中接入新的模板类型、`isStatic` 可编辑策略和保存拦截提示 | depends_on: [2.2]
- [√] 3.2 在 `frontend/src/services/GameEffectService.test.ts` 中补齐新模板、旧字段清理和协议校验的回归测试 | depends_on: [2.2]

### 4. 验证与归档

- [√] 4.1 执行类型检查、定向测试与构建验证 | depends_on: [3.1, 3.2]
- [√] 4.2 同步知识库、CHANGELOG 并归档方案包 | depends_on: [4.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-23 01:28 | 方案设计 | completed | 已结合 `EFFECT_TYPE_TEMPLATES.md` 与 `CONFIG_SPEC.md` 明确本轮为编辑器协议收口 |
| 2026-03-23 01:34 | 协议与模板收口 | completed | 已补齐 `single_cunit_bonus / pair_same_cunit_owner_bonus`，并删除 `sameBaseId` 残留 |
| 2026-03-23 01:35 | 面板与测试同步 | completed | `isStatic` 按模板固定或开放，新增严格协议回归测试 |
| 2026-03-23 01:36 | 基础验证 | completed | `bunx tsc --noEmit`、`bun run test --run src/services/GameEffectService.test.ts`、`bun run build` 通过 |

---

## 执行备注

> 记录执行过程中的重要说明、决策变更、风险提示等

- 本轮默认不改运行时 `effect.js`，除非实现中发现与最新协议仍存在实际不一致。
