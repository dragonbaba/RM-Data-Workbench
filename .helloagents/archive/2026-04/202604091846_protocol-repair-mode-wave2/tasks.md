# 任务清单: protocol-repair-mode-wave2

> **@status:** completed | 2026-04-11 10:42

```yaml
@feature: protocol-repair-mode-wave2
@created: 2026-04-09
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 0 | 0 | 10 | 10 |

## LIVE_STATUS

```json
{"status":"completed","completed":0,"failed":0,"pending":0,"total":10,"done":10,"percent":100,"current":"方案包已拆分并归档","updated_at":"2026-04-11 10:42:00"}
```

---

---

## 任务列表

### 1. 技能目标与选区协议

- [-] 1.1 在 `frontend/src/services/SkillPropertyService.ts`、`frontend/src/types/index.ts` 与 `frontend/src/components/panels/PropertyPanel.tsx` 中收口技能 targeting/弹道关联字段为固定协议，并统一保存口径 | depends_on: []
  > 备注: 未在本总包内单独执行；相关实现已拆分并归档到 `202604080122_projectile-skill-editor-struct-sync` 与 `202604082242_editor-repair-mode-projectile-sync-tightening`
- [-] 1.2 在 `frontend/src/services/SkillPropertyService.test.ts` 与 `frontend/src/services/DataAuditService.test.ts` 中补充技能 targeting 固定结构与 repair mode 断言 | depends_on: [1.1]
  > 备注: 已并入 `202604082242_editor-repair-mode-projectile-sync-tightening`
- [-] 1.3 在 `js/plugins/Zaun_ItemCore.js`、`js/plugins/Zaun_Resource.js`、`js/plugins/Zaun_GameAction.js`、`js/plugins/Zaun_ProjectileReaction.js` 中删除技能目标/选区/弹道关联字段的主路径兜底 | depends_on: [1.1]
  > 备注: 已并入 `202604080122_projectile-skill-editor-struct-sync` 与 `MyGame` 对应运行时归档包

### 2. 敌人扩展协议

- [-] 2.1 在 `frontend/src/services/EnemyPropertyService.ts`、`frontend/src/types/index.ts` 与 `frontend/src/components/panels/PropertyPanel.tsx` 中把敌人扩展字段补齐为固定顶层结构，并去掉 `canReaction` 的保存侧推导语义 | depends_on: []
  > 备注: 已并入 `202604021339_enemy-property-panel` 与 `202604022345_enemy-reaction-field-editor-sync`
- [-] 2.2 在 `frontend/src/services/EnemyPropertyService.test.ts` 与 `frontend/src/services/DataAuditService.test.ts` 中补充敌人扩展固定结构与 repair mode 断言 | depends_on: [2.1]
  > 备注: 已并入 `202604021339_enemy-property-panel` 与 `202604022345_enemy-reaction-field-editor-sync`
- [-] 2.3 在 `js/plugins/Zaun_Resource.js`、`js/plugins/Zaun_GameBattler.js`、`js/plugins/Zaun_ProjectileReaction.js`、`js/plugins/Zaun_EnemyBook.js` 中删除敌人扩展字段缺失兜底/推导主路径 | depends_on: [2.1]
  > 备注: 已由对应运行时归档包和敌人顶层字段切换包覆盖

### 3. 效果模式协议

- [-] 3.1 在 `frontend/src/services/GameEffectService.ts`、`frontend/src/types/index.ts` 与 `frontend/src/components/panels/EffectPanel.tsx` 中把 `selector/args` 收口为固定键对象，并保持模板级字段约束 | depends_on: []
  > 备注: 已并入 `202603230128_effect-config-spec-sync` 与 `202603230302_effect-ops-panel-and-strict-protocol`
- [-] 3.2 在 `frontend/src/services/DataAuditService.ts`、`frontend/src/services/GameEffectService.test.ts` 与 `frontend/src/services/DataAuditService.test.ts` 中把 `Effects.json` 纳入 repair mode，并补充固定结构断言 | depends_on: [3.1]
  > 备注: 已并入 `202603230128_effect-config-spec-sync`
- [-] 3.3 在 `js/plugins/Zaun_Resource.js`、`base/baseEffect.js`、`effects/effect.js` 中删除效果配置缺失兜底，改为直接编译和执行固定结构 | depends_on: [3.1, 3.2]
  > 备注: 已由相关运行时归档包与后续 effect 协议收口覆盖

### 4. 验证与知识库

- [-] 4.1 运行类型检查、目标测试、前端构建与 MyGame 语法检查，并同步知识库/CHANGELOG/归档方案包 | depends_on: [1.2, 1.3, 2.2, 2.3, 3.2, 3.3]
  > 备注: 本总包未单独进入实施；验证与知识库同步已分别落在拆分后的正式归档包中

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-09 18:46:00 | 方案包初始化 | completed | 已创建 proposal.md 与 tasks.md |
| 2026-04-11 10:42:00 | 方案包收口 | skipped | 作为中间总包保留；实际实现已拆分并并入多个正式归档包 |

---

## 执行备注

> 本包作为中间总包保留，用于记录 2026-04-09 这一轮“协议修复 wave2”的收口意图；后续真实实现已拆分并落入多个独立归档包，避免重复归档和重复记账。
