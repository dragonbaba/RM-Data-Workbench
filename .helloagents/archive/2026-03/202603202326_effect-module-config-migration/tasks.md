# 任务清单: effect-module-config-migration

> **@status:** completed | 2026-03-20 23:34

```yaml
@feature: effect-module-config-migration
@created: 2026-03-20
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 7 | 0 | 0 | 7 |

---

## 任务列表

### 1. 效果数据模型迁移

- [√] 1.1 在 `frontend/src/types/index.ts` 中删除 `GameEffectActionRef`，把 `GameEffectEntry` 重构为 `name/description/module/isStatic/config` | depends_on: []
- [√] 1.2 在 `frontend/src/services/GameEffectService.ts` 中删除导出解析逻辑，改为脚本键名候选、旧字段迁移和新结构归一化 | depends_on: [1.1]
- [√] 1.3 在 `frontend/src/services/GameEffectService.test.ts` 中补充旧字段迁移、config 默认值和脚本键名候选测试 | depends_on: [1.2]

### 2. 效果面板重构

- [√] 2.1 在 `frontend/src/components/panels/EffectPanel.tsx` 中移除导出函数候选区，改为 `module` 下拉和 `config` JSON 编辑框，并在保存前校验 JSON | depends_on: [1.2]

### 3. 脚本引用联动

- [√] 3.1 在 `frontend/src/services/ScriptOperations.ts` 中补充脚本重命名对 `gameEffects.module` 的同步更新 | depends_on: [1.2]
- [√] 3.2 在 `frontend/src/services/ScriptOperations.ts` 中补充脚本删除影响检查，弹窗展示受影响效果项并在删除后清空对应 `module`、标记当前数据为脏 | depends_on: [1.2]

### 4. 验证与收尾

- [√] 4.1 完成类型检查、相关测试、前端构建验证，并同步知识库文档与归档方案包 | depends_on: [1.3, 2.1, 3.1, 3.2]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-20 23:28 | 方案设计 | completed | 已确认不做兼容层；旧字段 condition/execute 直接删除并标脏，脚本删除时需提示受影响效果项 |
| 2026-03-20 23:33 | 开发实施 | completed | 已完成 effect 数据结构重构、旧字段迁移、module/config UI 和脚本删除/重命名联动 |
| 2026-03-20 23:33 | 验证与知识库同步 | completed | `bunx tsc --noEmit`、`bun run test --run src/services/GameEffectService.test.ts`、`bun run build` 均通过 |

---

## 执行备注

> 记录执行过程中的重要说明、决策变更、风险提示等

- 编辑器不扫描、创建或管理 `effects/` 目录中的文件。
- `gameEffects.module` 只保存当前条目 `scripts` 的键名，不保存路径也不保存导出函数名。
- 删除脚本时若命中效果引用，会在确认框里列出受影响效果项；确认删除后对应 `module` 会被清空并标记当前数据为脏。
