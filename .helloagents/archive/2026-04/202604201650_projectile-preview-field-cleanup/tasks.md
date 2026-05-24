# 任务清单: projectile-preview-field-cleanup

> **@status:** completed | 2026-04-20 17:01

```yaml
@feature: projectile-preview-field-cleanup
@created: 2026-04-20
@status: completed
@mode: R2
```

## LIVE_STATUS

```json
{"status":"completed","completed":5,"failed":0,"pending":0,"total":5,"done":5,"percent":100,"current":"弹道预览字段清理完成","updated_at":"2026-04-20 17:02:00"}
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 5 | 0 | 0 | 5 |

---

## 任务列表

### 1. 协议收口

- [√] 1.1 更新 `frontend/src/services/ProjectileTemplateService.ts` 与 `frontend/src/types/index.ts`，删除弹道模板持久化预览字段 | depends_on: []
- [√] 1.2 调整 `frontend/src/components/panels/ProjectilePanel.tsx` / `ProjectileCanvas.tsx` 的预览 view model 类型边界 | depends_on: [1.1]

### 2. 修复模式与测试

- [√] 2.1 更新 `ProjectileTemplateService.test.ts` 与 `DataAuditService.test.ts`，覆盖历史字段清理 | depends_on: [1.1]

### 3. 当前数据清理

- [√] 3.1 批量清理当前 `Projectiles.json` 中的 `sourceType/sourceId/targetType/targetId/weaponId/skillId` | depends_on: [2.1]

### 4. 文档与验证

- [√] 4.1 同步知识库并运行类型检查、相关测试和构建验证 | depends_on: [3.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-20 17:39 | 保存入口复核 | completed | 普通编辑保存也会剥离旧预览字段；相关单测增至 7 个并通过 |
| 2026-04-20 17:02 | 验证与知识库 | completed | 相关单测、tsc、build 通过；lint 仍有项目既有错误 |
| 2026-04-20 17:00 | 二次兜底清理 | completed | `ProjectileCanvas` 不再从 `ProjectileTemplate` 或 store fallback 旧预览字段 |
| 2026-04-20 16:58 | 数据清理 | completed | 两份 MyGame `Projectiles.json` 的 6 个预览字段计数已归零 |
| 2026-04-20 16:57 | 代码实现 | completed | 模板协议与修复模式已剥离预览字段，预览改为 view model |

---

## 执行备注

- 清理字段：`sourceType/sourceId/targetType/targetId/weaponId/skillId`。
- 用户已手动备份，执行时不再额外生成备份文件。
