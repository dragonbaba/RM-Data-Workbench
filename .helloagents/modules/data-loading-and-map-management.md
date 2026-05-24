# 数据加载与地图管理

## 职责
- 统一管理普通数据库文件、地图索引与地图内容的加载、缓存、脏标记和保存入口。
- 为外部文件变化提供“静默重载 / 命中确认后重载”的统一判定链路。
- 维护效果模式依赖的数据归一化规则，保证 `gameEffects` 的结构、模板和保存协议与当前实现一致。

## 当前实现
- 普通数据库文件由 `frontend/src/services/DataLoaderService.ts` 负责预载。
- 地图走双层模型：
  - `MapInfos.json` 只作为索引加载；
  - `MapXXX.json` 按需打开并进入统一缓存。
- 地图属性面板 `MapPanel` 当前维护 `MapXXX.json` 的基础地图字段，并新增 `fixedWeather` 下拉字段：
  - 空值表示不固定天气，保存时写为 `undefined`；
  - 合法字符串为 `none/rain/snow/wind/bubble/blood_rain`；
  - 运行时由 MyGame 的 `Zaun_TimeSystem` 消费该字段，编辑器只负责字段编辑和保存。
- `System.json` 仍以编辑器内部兼容包装参与普通编辑链路，但保存前必须解包回真实对象。
- `EquipExtensions.json` 会被确保存在，并进入缓存与保存链路。
- `editorStore` 维护普通数据态与地图态：
  - 普通数据使用 `currentData/currentItem/currentItemIndex`
  - 地图使用 `currentMapInfos/currentMapData/currentMapId`
- 地图内容更新的 dirty 收口在 `editorStore.updateCurrentMapData()`：
  - 更新 `currentMapData/currentItem`
  - 同步 `DataLoaderService` 当前 `MapXXX.json` 缓存
  - 直接标记当前地图文件 dirty
  - 因此地图属性面板不再单独调用 `markFileDirty`，也不保留单独的“保存地图信息”按钮
- `uiMode === 'effect'` 时只允许普通数据库数组条目进入，不支持任务、弹道和地图。
- `uiMode === 'drop'` 时只允许 `Enemies.json` 普通数据库条目进入。

## 外部变更与未保存保护
- 后端 `WorkspaceService` 监听工作区 `data/` 目录中的受支持基础 JSON 文件。
- 前端通过 `BaseDataReloadService` 判定当前变化是否命中当前面板。
- 未命中当前面板时，`useFileOperations` 会静默刷新缓存。
- 命中当前面板时，会先弹确认框，再决定是否重载当前文件或依赖缓存。
- 外部数据变更队列当前由 `ExternalDataChangeQueue` 统一聚合：
  - 同一路径按标准化路径键去重；
  - 同一次确认/重载处理会话内，已提示过的路径不会再次入队；
  - 会话结束后保留一个短时冷却窗口，吞掉编辑器保存或外部工具落盘时常见的尾随重复事件。
- 若确认弹窗期间又收到新的外部变化：
  - 同一路径重复事件会被抑制；
  - 新路径事件会进入下一轮批次；
  - 下一轮批次开始前会额外等待一个短聚合窗口，尽量把同批次多文件变化合并成更少轮提示。
- 模式切换、数据文件切换、程序关闭统一走“保存全部 / 不保存 / 取消”三态未保存保护。
- 地图属性字段变化时必须立即通过 `updateCurrentMapData()` 进入 dirtyFiles，SaveAll 才会把对应 `MapXXX.json` 写回；不要等额外保存按钮再提交。
- 弹道模式当前依赖白名单必须包含 `Animations.json`，动画数据外部变化会触发重新加载确认。
- 武器属性/备注模式当前依赖白名单必须包含：
  - `System.json`
  - `Skills.json`
  - `EquipExtensions.json`
- 掉落模式当前依赖白名单必须包含：
  - `Enemies.json`
  - `Items.json`
  - `Weapons.json`
  - `Armors.json`

## 修复模式当前补齐规则
- `DataAuditService` 对 `Weapons.json` 当前会复用 `normalizeEquipmentDataEntry(..., { isWeapon: true })`。
- 因此武器修复模式除了既有范围、模板参数和被动状态协议外，还会补齐顶层 `weaponImageId`。
- 当前规则：
  - 缺失 `weaponImageId` → 补为 `1`
  - 该字段进入正式结构化协议后，不再依赖备注里的 `<weaponImageId:...>` 作为编辑器主写入口

## 效果数据协议
- 当前效果条目结构固定为：
  - `name`
  - `description`
  - `effectType`
  - `isStatic`
  - `config`
- 顶层不再保存 `module`，也不再支持 `custom_script_effect`。
- 当前支持的 `effectType` 为：
  - `equip_stat_bonus`
  - `runtime_stat_bonus`
  - `single_engine_bonus`
  - `single_cunit_bonus`
  - `equip_count_bonus`
  - `same_base_id_count_bonus`
  - `pair_same_engine_bonus`
  - `pair_same_cunit_bonus`
  - `pair_same_cunit_owner_bonus`
  - `cunit_slot_action_repeat_bonus`
  - `equip_id_set_bonus`
- `owner_stat_bonus / owner_scalar_bonus / owner_param_rate_bonus / owner_element_rate_bonus / cunit_owner_stat_bonus`
  - 不再作为正式 `GameEffectType` 暴露
  - 仅保留给 `DataAuditService` 做旧数据迁移输入
- `config` 的结构固定为：
  - `selector`
  - `args`
- `selector` 当前只允许：
  - `slotIndexes`
  - `etypeIds`
  - `wtypeIds`
  - `atypeIds`
- `args` 当前只允许：
  - `ops`
  - `requiredCount`
  - `weaponIds`
  - `armorIds`
- `ops` 的最终落盘格式固定为对象数组：`[{ group, key, op, value }]`。

## 效果归一化与保存规则
- `GameEffectService` 是当前效果协议的唯一事实源，负责：
  - 模板注册表
  - 默认模板生成
  - 归一化
  - 保存校验
  - `ops` 行模型与序列化
- `OwnerParamsPropertyService` 会在保存 owner 固定属性时收紧概率类字段：
  - `hitRate / evadeRate / critRate / interceptRate` 最大值为 `100`
  - `0-1` 的兼容旧数据写法会保留，不会在编辑器保存链中被强制改成整数百分比
- 进入效果模式时：
  - 若当前条目缺少 `gameEffects`，会补为空数组并标记当前数据文件为脏；
  - 若条目存在非法或缺失 `effectType` 的旧效果项，该条目会被直接剔除；
  - 不再保留旧 effect 协议的语义迁移层。
- 保存效果时：
  - `selector` 中的字段必须是数值数组；
  - `requiredCount` 必须是数字；
  - `ops` 必须是合法三元组数组；
  - `statId` 只能使用当前模板允许的属性；
  - `opId` 仅允许 `1 / 2 / 3`。

## 相关依赖
- 后端：
  - `app.go`
  - `backend/services/workspace_service.go`
- 前端：
- `frontend/src/services/DataLoaderService.ts`
- `frontend/src/services/BaseDataReloadService.ts`
- `frontend/src/services/ExternalDataChangeQueue.ts`
- `frontend/src/services/GameEffectService.ts`
- `frontend/src/hooks/useFileOperations.ts`
- `frontend/src/stores/editorStore.ts`
  - `frontend/src/components/layout/LeftPanel.tsx`
  - `frontend/src/components/layout/MainContent.tsx`
  - `frontend/src/components/panels/MapPanel.tsx`
  - `frontend/src/components/panels/EffectPanel.tsx`

## 当前约束
- 地图内容文件禁止进入启动预载。
- `MapInfos.json` 只用于索引浏览，不进入普通保存主路径。
- `fixedWeather` 是地图顶层字段，不写入 `MapInfos.json`，也不通过地图 `note` 标签维护。
- 当前面板命中规则仍是白名单，不是全量依赖图。
- 掉落模式的引用候选仍完全依赖缓存数据，不会额外发明独立掉落索引层。
- 效果协议当前按严格模板执行，不保留旧字段兼容层。
- 非法效果项会在归一化时被清理，因此知识库与数据规范应始终以当前模板协议为准。

## 近期验证
- `bunx tsc --noEmit` ✅
- `bun run test --run src/components/panels/MapPanel.test.tsx` ✅（2026-05-18 地图 dirty 保存链）
- `bun run build` ✅（2026-05-18 固定天气字段）
- `bunx vitest run src/services/DataAuditService.test.ts` ✅
- `bunx vitest run src/services/ExternalDataChangeQueue.test.ts src/services/BaseDataReloadService.test.ts` ✅
- `bun run test --run src/services/BaseDataReloadService.test.ts` ✅
- `bun run test --run src/services/GameEffectService.test.ts` ✅
- `bun run build` ✅
- `go test ./...` ✅
- `go build ./...` ✅
