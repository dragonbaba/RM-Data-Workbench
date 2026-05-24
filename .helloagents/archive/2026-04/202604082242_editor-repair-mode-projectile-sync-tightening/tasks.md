# 任务清单: editor-repair-mode-projectile-sync-tightening

> **@status:** completed | 2026-04-08 22:42

```yaml
@feature: editor-repair-mode-projectile-sync-tightening
@created: 2026-04-08
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 6 | 0 | 0 | 6 |

---

## 任务列表

### 1. 数据修复模式收口

- [√] 1.1 把 `Projectiles.json` 纳入 `DataAuditService` 体检与修复范围 | depends_on: []
- [√] 1.2 在 `ProjectileTemplateService` 中实现遗留弹道字段规范化与默认值补齐 | depends_on: [1.1]
- [√] 1.3 在 `SkillPropertyService` 中补齐 targeting 缺省字段，不再依赖旧来源兜底 | depends_on: [1.1]

### 2. 弹道性能与交互修复

- [√] 2.1 在 `ProjectileCanvas` 与 `ProjectilePreviewUtils` 中完成弹道预览热路径优化 | depends_on: []
- [√] 2.2 修复 `LeftPanel` 在弹道偏移编辑后的“未保存”显示缺口 | depends_on: [2.1]
- [√] 2.3 在 `BaseDataReloadService` 中补齐技能面板对 `Projectiles.json` 外部变更提示 | depends_on: [1.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-08 22:33 | 1.1-1.3 | completed | 修复模式已覆盖 `Projectiles.json`，技能缺失 targeting 字段补默认值 |
| 2026-04-08 22:39 | 2.1-2.3 | completed | 弹道预览链路优化、脏标记显示修复、技能依赖提示补齐 |
| 2026-04-08 22:42 | 验证 | completed | `npm run build` 通过；`vitest --run` 指定 4 文件共 28 测试通过 |

---

## 执行备注

- 本轮以“修复模式补齐默认值、运行时不保留旧字段兜底”为边界。
- 构建仍提示存在单 chunk >500k 警告，但不影响本轮需求验收。

