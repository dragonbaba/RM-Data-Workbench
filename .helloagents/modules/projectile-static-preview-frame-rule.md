# 弹道预览静态帧规则

## 作用范围

- `frontend/src/components/common/ProjectileCanvas.tsx`
- `frontend/src/services/ProjectilePreviewUtils.ts`
- `frontend/src/services/ProjectilePreviewUtils.test.ts`

## 当前规则

- actor 预览不再固定按 `sv_actors` 的 9x6 图裁左上第一帧。
- 预览会先读取 actor 条目的 `meta.isStaticImage`：
  - `true`：直接使用整张 actor 贴图作为静态帧
  - `false` 或缺失：继续按 9x6 动态图裁左上第一帧
- enemy 预览保持原有整图逻辑，不参与本规则分支。

## 设计原因

- 当前项目要求编辑器弹道预览与游戏运行时口径一致。
- 运行时已用 `meta.isStaticImage` 决定部分战车是否走静态帧，因此编辑器不得继续维护独立的预览开关。

## 缓存约束

- 纹理缓存 key 必须包含 `renderMode`。
- 同一张 actor 图在“静态整图”和“动态首帧”两种模式下，不能共用同一个缓存 key，否则会出现串图。

## 验收要求

- `ProjectilePreviewUtils.test.ts` 必须覆盖 `meta.isStaticImage` 的 true/false/缺失三种情况。
- 修改后仍需通过：
  - `bunx tsc --noEmit`
  - `bun run test --run src/services/ProjectilePreviewUtils.test.ts`
