# 弹道与保存防回归基线

## 目的
- 固化本轮弹道预览、偏移保存、跨文件 SaveAll 的最终行为。
- 后续改动必须满足本文件规则，避免重复出现“预览与游戏不一致”“保存丢文件”“交换后参数丢失”等问题。

## 一、坐标与渲染基线（必须一致）
- `_position` 与 `position` 语义一致；在本项目中 `_position` 仅是性能读取路径，不是另一套坐标系。
- 弹道起点规则：`player.sprite()._position + projectileOffset`。
- 弹道终点规则：`target.sprite()._position.y - target.sprite()._height / 2`。
- 轨迹段规则：`segment.targetX/targetY` 是绝对坐标中间点，末段锁定最终目标点。
- 单位站位规则：
  - 发射方与目标方在同一基线 Y。
  - 站位仅由“发射方在左/右”控制，不由数据交换按钮控制。
- 单位精灵锚点规则：
  - 预览单位使用 `anchor=(0.5,1)`（底部中心语义）。
  - 弹道动画精灵锚点独立于单位，不得混淆。
- 帧尺寸规则：
  - 与命中高度相关计算统一使用原始帧尺寸（`texture.frame.width/height` 语义），不使用缩放后尺寸。
- actor 取帧规则：
  - 默认按 `sv_actors` 的 9x6 动态图裁左上第一帧。
  - 若 actor 的 `meta.isStaticImage === true`，则必须改为整张静态帧，不再裁 9x6。
- 图层规则：
  - 弹道轨迹与弹道精灵图层必须高于敌我单位图层，便于校准发射点。

## 二、面板与交互基线（必须一致）
- 模板管理区规则：
  - 弹道编辑器必须提供独立“弹道模板”模块。
  - 模块内提供“新建 / 复制 / 删除”三个入口，交互语义与 `QuestPanel` 对齐。
  - 复制必须先弹出命名框；删除必须二次确认。
  - 当 `Projectiles.json` 只剩一条有效模板时，删除后必须自动回落为一条默认弹道模板，而不是留空。
- 预览配置为左右两栏：
  - 发射方：类型、ID、角色时显示武器、敌人时显示技能。
  - 目标方：仅类型与ID，不显示武器/技能。
- 发射方类型联动：
  - 发射方是角色时，第三项必须是武器选择。
  - 发射方是敌人时，第三项必须是技能选择。
- “交换发射/目标数据”按钮语义：
  - 交换 `sourceType/sourceId` 与 `targetType/targetId`。
  - 不改变左右站位（站位由“发射方在左/右”单独控制）。
  - 必须保留并恢复历史选择：
    - 角色的 `weaponId`
    - 敌人的 `skillId`

## 三、偏移保存与脏标记基线（必须一致）
- “保存角色偏移”只标记/影响 `Actors.json`。
- “保存敌人偏移”只标记/影响 `Enemies.json`。
- 保存偏移按钮行为：
  - 修改写入内存与缓存；
  - 记录文件脏状态与脏索引；
  - 不直接执行全项目落盘。
- “保存项目文件（SaveAll）”行为：
  - 按脏文件集合逐个落盘，不得仅保存当前页。
  - 必须兼容 Windows 路径大小写与分隔符差异，避免缓存查找失败。

## 四、弹道模板持久化协议（必须一致）
- `Projectiles.json` 只保存弹道模板本体：`id/name/startAnimationId/launchAnimation/endAnimationId` 以及轨迹段字段。
- `sourceType/sourceId/targetType/targetId/weaponId/skillId` 是弹道预览上下文，不属于 `ProjectileTemplate` 持久化协议。
- 弹道面板只能用临时 state 组装 `ProjectilePreviewTemplate` 传给预览画布，不得把预览上下文字段写回模板。
- 新建、复制、普通编辑保存、修复模式都必须剥离上述 6 个预览字段；历史 `Projectiles.json` 进入修复模式或被面板再次保存时应被清理到新协议。

## 五、性能与实现约束（必须遵守）
- 预览单位精灵对象应复用，不要在每次模板变化时销毁重建。
- 贴图切换后允许重绘轨迹，但不得引入对象抖动与引用失效。
- 纹理缓存可复用；清理时允许容错，但不能影响后续生命周期。
- 计算站位时必须做边界夹取，防止大帧单位出画布。

## 六、回归验收清单（每次改动后必测）
1. 角色作为发射方时，显示武器选择；敌人作为发射方时，显示技能选择。
2. 同一套数据切换左右发射位，轨迹方向与起点同步翻转，目标侧不出现武器/技能项。
3. 修改角色偏移并保存，再修改敌人偏移并保存，最后 SaveAll，两个文件都落盘成功。
4. 只保存角色偏移后，`dirtyFiles` 仅含 `Actors.json`；只保存敌人偏移后，`dirtyFiles` 仅含 `Enemies.json`。
5. 交换发射/目标数据两次后，角色武器与敌人技能选择可恢复，不丢失。
6. 轨迹终点落在目标 `_position.y - _height/2` 附近，且与游戏内执行视觉一致。
7. 大尺寸角色帧不会被裁出画布外，左右双方都可见且基线一致。
8. 轨迹与弹道图层始终在单位图层之上。
9. `meta.isStaticImage=true` 的 actor 在弹道预览中显示整张静态帧，而不是 9x6 首帧。
10. 点击“新建”后，`Projectiles.json` 末尾追加默认模板，当前编辑条目自动切到新增项。
11. 点击“复制”后，复制项的 `launchAnimation.segments` 必须是深拷贝，修改复制项不会反向污染原模板。
12. 删除当前模板后，当前选中项必须自动钳制到有效范围，不出现空选中或越界。
13. 新建、复制、修复后的 `Projectiles.json` 不得出现 `sourceType/sourceId/targetType/targetId/weaponId/skillId`。

## 七、关键文件定位
- `frontend/src/components/common/ProjectileCanvas.tsx`
- `frontend/src/components/panels/ProjectilePanel.tsx`
- `frontend/src/services/ProjectilePreviewUtils.ts`
- `frontend/src/services/ProjectileTemplateService.ts`
- `frontend/src/services/DataLoaderService.ts`
- `frontend/src/stores/editorStore.ts`
- `frontend/src/hooks/useFileOperations.ts`

## 八、增量记录（2026-03-18，弹道模板模块）
- 弹道编辑器补齐“弹道模板”模块，新增“新建 / 复制 / 删除”入口，对齐任务编辑器模板管理交互。
- 新建会追加默认弹道模板并自动选中新条目。
- 复制会通过 `InputDialog` 获取新名称，并深拷贝 `launchAnimation/segments` 后追加到列表末尾。
- 删除会优先删除当前条目；当只剩单条有效模板时，自动保留一条默认模板，避免 `Projectiles.json` 进入空列表状态。
- 默认模板与深拷贝逻辑已抽到 `frontend/src/services/ProjectileTemplateService.ts`，`DataLoaderService` 复用同一默认结构。
- 本次验证：
  - `bunx tsc --noEmit` ✅
  - `bun run test --run src/services/ProjectileTemplateService.test.ts` ✅
  - `bun run build` ✅

## 九、增量记录（2026-03-31，静态战车预览帧）
- actor 预览新增 `meta.isStaticImage` 判断：
  - 开启时直接使用整张静态帧
  - 未开启时继续裁 9x6 首帧
- 纹理缓存 key 已加入 `renderMode`，避免同一张 actor 图在静态/动态两种模式下串缓存。
- 本次验证：
  - `bunx tsc --noEmit` ✅
  - `bun run test --run src/services/ProjectilePreviewUtils.test.ts` ✅

## 十、增量记录（2026-04-20，预览字段清理）
- `ProjectileTemplate` 已从持久化协议中移除 `sourceType/sourceId/targetType/targetId/weaponId/skillId`。
- `ProjectilePanel` 继续用临时预览状态组装 `ProjectilePreviewTemplate`，预览能力不依赖保存数据。
- `ProjectileTemplateService` 的新建、复制、普通编辑保存剥离和 `normalizeProjectileDataEntry()` 会清理历史预览字段，`DataAuditService` 修复模式随之防回归。
- 已手动清理 `D:/RMProjects/MyGame/Projectiles.json` 与 `D:/RMProjects/MyGame/data/Projectiles.json` 中的上述字段。
- 本次验证：
  - `bun run test --run src/services/ProjectileTemplateService.test.ts src/services/DataAuditService.test.ts` ✅
  - `bunx tsc --noEmit` ✅
  - `bun run build` ✅
  - `bun run lint` ⚠️ 项目既有 lint 错误仍存在

## 十一、增量记录（2026-05-29，预览轨迹追溯）
- 弹道预览轨迹已与左侧弹道列表选中项解耦：
  - 左侧切换弹道模板不会重置预览面板的发射方、目标方、武器或技能选择。
  - 左侧模板编辑和轨迹节点编辑仍然只修改左侧当前模板。
  - 预览轨迹只读取当前预览配置追溯到的弹道模板。
- 角色预览链路固定为 `weapon.attackSkillId -> skill.projectileId -> Projectiles.json`。
- 敌人预览链路固定为 `skill.projectileId -> Projectiles.json`。
- `skill.projectileId` 只读取技能顶层字段，不读取 `meta`。
- 未选武器/技能、`attackSkillId=0`、`projectileId=0` 或模板不存在时，预览继续显示发射方/目标方精灵，但轨迹段为空。
- `totalFrames` 已改为读取预览模板段数，不再读取左侧编辑模板段数。
- 本次验证：
  - `bun run test --run src/services/ProjectilePreviewUtils.test.ts src/services/ScriptCacheManager.test.ts` ✅
  - `bunx tsc --noEmit` ✅
  - `bun run build` ✅（保留既有 Vite 大 chunk 警告）

## 十二、增量记录（2026-05-29，缓动轨迹线）
- 弹道预览辅助轨迹线现在按每段 `easeX/easeY/easing` 采样绘制，不再只用直线连接关键节点。
- 播放动画和轨迹线共用同一套 easing 函数解析逻辑，保证可视轨迹与实际弹道移动路径一致。
- 采样数按段距离钳制在 8~48，避免长轨迹过粗糙，也避免绘制节点过多。
- 节点圆点与编号仍显示在关键点位置，用于继续校准段端点。
- 本次验证：
  - `bun run test --run src/services/ProjectilePreviewUtils.test.ts` ✅
  - `bunx tsc --noEmit` ✅
  - `bun run build` ✅（保留既有 Vite 大 chunk 警告）
