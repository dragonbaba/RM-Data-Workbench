# 任务清单: projectile-preview-static-battler-frame

> **@status:** completed | 2026-03-31 01:12

```yaml
@feature: projectile-preview-static-battler-frame
@created: 2026-03-31
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 3 | 0 | 0 | 3 |

---

## 任务列表

### 1. ProjectilePreviewUtils

- [√] 1.1 在 `frontend/src/services/ProjectilePreviewUtils.ts` 中新增 actor 静态帧判断 helper | depends_on: []
- [√] 1.2 在 `frontend/src/services/ProjectilePreviewUtils.test.ts` 中补充 `meta.isStaticImage` 测试覆盖 | depends_on: [1.1]

### 2. ProjectileCanvas

- [√] 2.1 在 `frontend/src/components/common/ProjectileCanvas.tsx` 中按 `meta.isStaticImage` 切换 actor 的整图静态帧/9x6 首帧，并修正纹理缓存 key | depends_on: [1.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-31 01:07:00 | 方案包初始化 | completed | 已确认：编辑器直接复用 `meta.isStaticImage` |
| 2026-03-31 01:09:00 | 1.1 | completed | 已新增 `shouldUseStaticActorPreviewFrame()` |
| 2026-03-31 01:09:00 | 1.2 | completed | 已补静态帧判断测试 |
| 2026-03-31 01:10:00 | 2.1 | completed | `ProjectileCanvas` 已按 meta 切换 actor 取帧并隔离缓存 key |
| 2026-03-31 01:10:30 | 验证 | completed | `bunx tsc --noEmit` 与目标单测均通过 |

---

## 执行备注

- 当前修复只影响 actor 预览的取帧模式，不改变 enemy 预览与弹道位移链。
- 纹理缓存已按 `type + renderMode + imagePath` 隔离，避免静态/动态模式下复用错误纹理。
