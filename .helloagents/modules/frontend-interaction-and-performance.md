# 前后端交互与性能修复记录

## 职责
- 维护菜单事件、编辑状态、保存链路与界面交互的一致性。
- 记录脚本编辑器、效果面板、模式切换和 SaveAll 的当前行为约束。
- 记录前端侧已落地的性能收口点，避免后续回归。

## 当前交互链路
- Wails runtime 事件统一进入前端状态层，再由 Zustand 驱动界面刷新。
- `useFileOperations` 是当前未保存保护、模式切换、数据切换和 SaveAll 的主协调入口。
- 主布局容器链固定要求：
  - `MainLayout`、`MainContent`、面板宿主必须具备 `min-w-0/min-h-0`，并由外层 `overflow-hidden` 限制窗口边界。
  - 右侧面板自身继续负责纵向滚动，主内容层不允许被 Monaco、长文件名或长标题撑出窗口。
  - 脚本编辑器的左右分栏、标题栏和 Monaco 宿主必须保持 `min-w-0/min-h-0`；路径与加载错误文本使用截断显示。
- `useFileOperations` 当前把外部文件监听确认链路拆成两层：
  - `BaseDataReloadService` 负责“哪些变化需要提示 / 需要统一重载当前上下文”
  - `ExternalDataChangeQueue` 负责“同一路径去重 / 会话内抑制 / 短时冷却聚合”
- 当前模式菜单已覆盖脚本、属性、任务、弹道、装备、效果和掉落模式；备注编辑已迁移进属性模式，不再作为独立模式入口。
- 当前模式切换、数据文件切换、程序关闭统一走三态确认：
  - 保存全部
  - 不保存
  - 取消
- 保存全部会同时处理：
  - 脏数据文件
  - 脏脚本文件

## 脚本编辑器当前规则
- 脚本文件命名已固定为无时间戳形式，不再生成旧版带时间戳的文件名。
- 旧版带时间戳脚本路径不会再被继续加载或保存。
- 脚本 dirty 判定只以“当前内容 vs originalContent”为准。
- 脚本 dirty 事件由 `ScriptCacheManager.set()` 在 clean/dirty 状态转换时发出，避免内容已进入脏缓存但 UI 没有收到 `script:dirty` 的情况。
- 脚本列表与当前脚本标题显示 dirty 标记；保存当前脚本或 SaveAll 把缓存恢复为 clean 后，标记同步消失。
- 程序化写入编辑器内容不会触发 dirty：
  - 切换脚本
  - 加载脚本
  - 切到无脚本条目时清空编辑器
- 切到无脚本条目时，不会再把上一个脚本误写为空内容并进入保存链路。
- `SaveAll` 只会尝试保存真实脏脚本，不再消费遗留脏标记或空缓存。

## 效果面板当前规则
- 效果面板已完全切到 `effectType` 驱动表单，不再使用自由 JSON 主编辑。
- 面板当前只编辑以下顶层字段：
  - `name`
  - `description`
  - `effectType`
  - `isStatic`
  - `config`
- 面板不再显示：
  - 顶层 `module`
  - 脚本模块选择
  - `custom_script_effect`
  - `ops(JSON 数组)` 文本框
- `selector` 按模板显示，仅开放：
  - `slotIndexes`
  - `etypeIds`
  - `wtypeIds`
  - `atypeIds`
- `ops` 已改为结构化行编辑：
  - 每行包含 `statId / opId / value`
  - 支持新增和删除操作行
  - 非法 `statId` 会直接行内报错
- `isStatic` 当前按模板控制：
  - 只有允许切换的模板才开放开关
  - 固定模板会直接禁用切换并显示说明

## 掉落模式当前规则
- 掉落模式当前只允许在 `Enemies.json` 上进入。
- 若切换到掉落模式时当前文件不是敌人数据，`useFileOperations` 会自动切到 `Enemies.json`。
- 左侧列表在 `drop` 模式下固定显示“敌人列表”。
- `DropPanel` 会直接编辑当前敌人的 `enemyDrops`，不新增独立保存按钮。
- 当前敌人缺少 `enemyDrops` 时，进入编辑态即补成空数组并标记当前敌人为脏。
- 掉落行当前固定为四列：
  - `掉落类型`
  - `掉落概率`
  - `是否稀有`
  - `掉落目标`
- `enemyDrops[].isRare` 只描述“这个敌人的这个掉落是否稀有”，不属于 `Items.json` 物品本体字段。
- 失效掉落引用不会被静默清空，而是保留 `dropId` 并显示“已失效引用”。

## 地图属性模式当前规则
- 地图模式仍然按需加载 `MapInfos.json` 和具体 `MapXXX.json`，不在启动时批量加载全部地图。
- 左侧地图列表当前以 `currentFileType === 'map'` 作为来源判定；地图文件切到属性、备注或脚本等右侧面板时，仍保留 `currentMapInfos` 列表，不再因 `uiMode` 变化显示为空。
- 地图列表切换当前已选中的同一张地图会直接 no-op；切换到已缓存的其他地图时继续更新当前地图状态，但不再弹出“已加载地图”成功提示。
- 后端数据 watcher 只监控基础数据文件与当前激活地图文件；切换具体地图时，`SetActiveMapFile` 会同步替换 watcher 快照基线，避免把 active map 监控目标变化误报成外部 `create/remove`。
- `MapPanel` 当前可编辑顶层 `inRoom` 字段，用于对齐 `MyGame` 的室内/天气判断。
- `inRoom` 是可选布尔字段：
  - 开启时保存 `inRoom: true`
  - 关闭时写回 `undefined`，由 JSON 保存自然省略字段
- 不做地图批量修复；地图数量较多时，只有被用户打开并保存的地图才会写入该字段。
- 备注 `meta.inRoom` 不再是当前编辑口径。

## 敌人属性面板当前规则
- 敌人仍然复用 `property` 模式，不新增独立模式或独立主文件。
- `PropertyPanel` 在 `Enemies.json` 上会追加“敌人扩展”卡片，集中编辑：
  - `classId`
  - `level`
  - `levelScope`
  - `isBoss`
  - `bounty`
  - `attackAnimationId`
- `reactionSkillId`
- 职业候选项来自 `Classes.json`，攻击动画候选项来自 `Animations.json`，迎击技能候选项来自 `Skills.json`。
- 面板和 `EnemyPropertyService` 现在只读取敌人顶层扩展字段，不再回读 `meta` 或 `note`。
- 保存敌人基础属性时，这些扩展字段会写回敌人顶层属性，并强制执行：
  - `note = ''`
  - `meta = {}`
- 在当前运行时口径下，敌人扩展卡片已完整覆盖 `MyGame` 实际读取的敌人扩展字段集合，不再存在额外遗漏字段。
- 敌人扩展字段不再通过备注模板维护，顶层属性是唯一编辑口径。

## 技能属性面板当前规则
- 技能仍然复用 `property` 模式，不新增独立技能模式。
- `PropertyPanel` 在 `Skills.json` 上新增“技能消耗规则”卡片，使用 `Form.List` 维护结构化 `skillCosts[]`。
- 当前技能消耗类型固定为：
  - `hp`
  - `hpRate`
  - `gold`
  - `goldRate`
  - `variable`
  - `variableRate`
  - `item`
  - `weapon`
  - `armor`
- `SkillPropertyService` 负责统一技能消耗的默认值、归一化、差异比较与保存写回，`skillCosts` 是编辑器技能消耗的唯一协议字段。
- 技能消耗候选数据来源固定为当前缓存中的：
  - `System.json.variables`
  - `Items.json`
  - `Weapons.json`
  - `Armors.json`
- 多条 `skillCosts` 可以并行配置，保存后保持数组顺序，不再拆成零散顶层字段或备注协议。
- 金币和变量类消耗当前分为固定值与百分比两套协议：
  - `gold / variable` = 固定值
  - `goldRate / variableRate` = 百分比
- 物品、武器、防具类消耗统一记录“目标 id + 数量”，变量类消耗统一记录“变量 id + 数值/百分比”。
- 修复模式现在会把当前编辑器正式维护的技能协议字段一次性补齐为固定结构：
  - 顶层字段固定为 `projectileId / skillProjectileTag / reactionSuccessRate / reactionPriority / targetCamp / targetLifeState / selectMode / areaMode / skillCosts`
  - `skillCosts[]` 每条固定为 `type / value / variableId / itemId / weaponId / armorId / amount`
- 这条链路后续统一遵守“编辑器修复模式补协议，运行时直接信任结构”的原则，不再在 `MyGame` 侧继续叠加字段缺失兜底。
- 该结构已与 `MyGame` 运行时 `baseSkillUtils` 和 `Window_ItemInfo` 对齐：
  - 释放条件按全部规则同时校验
  - 支付时按统一协议逐条扣除
  - `goldRate` 按当前金币百分比结算，`variableRate` 按当前变量值百分比结算
  - 运行时与展示层已改为类型表驱动，不再继续堆叠字符串 `switch`
  - 技能信息窗口优先显示消耗区，再显示描述
  - 技能消耗热路径现在直接读取固定结构字段，不再做 `id/value/amount` 的运行时补零兜底

## 技能伤害/耐久协议当前规则
- `PropertyPanel` 在 `Skills.json` 上已新增“技能伤害/耐久协议”编辑区。
- `skillEffectSpec` 当前统一承载：
  - `damage.damageType`
  - `damage.damageElementId`
  - `damage.allowCritical`
  - `damage.damageScatter`
  - `damage.formula`
  - `durabilityChange`
  - `skillDurability`
- `damage.damageType` 当前固定为：
  - `none`
  - `hp`
  - `heal`
- `damage.formula` 当前固定为：
  - `basic`
  - `script`
- `script` 模式下，脚本候选只列出当前技能脚本里导出 `damageFormula` 的脚本键。
- 普通属性读取链当前只认 `skillEffectSpec`；旧 `damage` 到新协议的迁移只允许出现在 `DataAuditService` 修复模式中。
- 技能协议区的脚本公式 warning 当前已改成稳定显示：
  - 正在校验脚本导出时不显示瞬时误报
  - 当前技能没有可用 `damageFormula` 导出，或 `scriptKey` 已失效时，会持续显示 warning

## 状态协议当前规则
- `PropertyPanel` 在 `States.json` 模式下当前额外维护两类状态协议：
  - `chargeConfig`
  - `forbidHeal`
- `forbidHeal` 是状态顶层布尔字段：
  - `true` = 禁止一切 `gainHp(value > 0)` 来源的治疗回血
  - `false` = 不拦截治疗
- 编辑器当前口径明确限定：
  - 技能/物品治疗
  - 吸血回血
  - 再生回血
  - 脚本直接 `gainHp(...)`
  以上都会被 `forbidHeal` 拦截；
  `recoverAll()` 与直接 `setHp()` 当前不在该字段拦截范围内。
- `StateChargePropertyService.normalizeStateDataEntry()` 与 `DataAuditService` 修复模式当前会为所有状态补齐固定默认值：
  - `forbidHeal: false`
  - 不再区分“缺字段”和“显式 false”

## 范围表单初始化当前规则
- `PropertyPanel` 与 `EnemyActionOverridesCard` 的范围字段收口逻辑当前必须基于表单存储中的真实值执行，不能直接信任 `Form.useWatch(... ) ?? 默认值`。
- 原因是范围相关字段存在条件挂载：
  - `shapeType`
  - `areaTargetCount`
  - 部分 `shapeParams`
- 当字段尚未挂载或刚由 `setFieldsValue` 回填时，`useWatch` 可能仍停留在旧 render 的默认值；这类默认值不能参与自动纠正，否则会把合法的扇形/目标数覆盖成圆形或默认值。
- 当前约束是：
  - 触发自动收口时，先通过 `form.getFieldValue(...)` 读取当前真实值
  - 只有在真实值非法或缺失时，才回写协议默认值
  - 合法的 `shapeType=2`、`areaTargetCount>=1` 等范围字段，初始化阶段不得被前端覆盖
- 这条规则同时覆盖：
  - 技能/物品范围规则
  - 武器范围规则
  - 敌人 `actionOverrides[skillId]` 范围覆盖

## 基础属性显示当前规则
- 基础属性区名称当前读取 `System.json` 的 `$dataSystem.terms.params` 前 8 项。
- 平面基础属性当前只允许以下宿主写入：
  - `Actors / Enemies / Weapons / Armors` → `params`
  - `Weapons / Armors` → `floatParams`
- `Classes` 不再经过平面基础属性保存链；职业基础属性必须保持 `params[8][100]` 的等级矩阵协议。
- `Classes.json` 属性模式会在基础属性卡片后显示“拓展等级”面板：
  - 数据来源固定为 `ClassLevelExtensions.json`；
  - 顶部只读显示当前职业 `Classes.json.params[paramId][99]` 的 99 级基准；
  - 面板维护最大等级、经验四参数（基础值、补正值、增加度1、增加度2）以及每项基础属性的最大等级目标值；
  - 8 项基础属性可分别选择成长模式：标准、早熟、晚熟、线性；
  - 100 级到最大等级的经验和属性由 `ClassLevelExtensionsService.buildClassLevelPreview()` 自动派生，面板只读预览，不再逐级手动新增；
  - 编辑曲线配置只更新 `ClassLevelExtensions.json` 缓存，并只标脏该扩展文件，不改写 `Classes.json.params`。
- `Skills / Items / States` 当前不允许再挂顶层 `params / floatParams`。
- 内部字段键未改，显示名称只是从系统词条动态派生。
- 只有 `Weapons / Armors` 会显示“{属性名}波动”字段；角色/敌人不再写 `floatParams`。
- `Weapons.json` 的基础属性区当前还会直接维护顶层 `weaponImageId`：
  - 字段固定为武器顶层协议，不再走备注 `meta.weaponImageId`
  - 面板输入和保存当前统一收口为 `>=1` 的整数
  - 缺失字段会被武器标准化链自动补为 `1`
- `Weapons.json / Armors.json` 的属性模式当前会显示“强化耗材”卡片：
  - 使用顶层 `upgradeCosts[]` 逐级维护强化到 `+N` 的成功率、金币、必需物品数量和保底物品数量；
  - `EquipmentPropertyService` 会把缺失字段补为空数组，并把非法数量收口为固定结构；
  - 单级缺失 `successRate` 时，编辑器按旧插件公式 `100 / 目标强化等级` 补默认值，并把输入限制到 `0-100`；
  - `DataAuditService` 修复模式会为武器、防具补齐 `upgradeCosts`，非装备文件若带有该字段会按归属规则清理；
  - 运行时对接口径是编辑器负责补协议，`MyGame` 的强化插件直接按当前等级读取 `upgradeCosts[nextLevel - 1]`。
- `Weapons.json / Armors.json` 的属性模式保存链必须与修复模式共用完整 `vehicleParams` 协议：
  - 编辑器表单当前必须保留 8 个模板字段（包含 `发射期连发 / actionRepeat`）；
  - 不允许只按前 7 项保存，否则会出现“保存后丢失第 8 项，修复模式再补回，文件反复变脏”的循环。
- `Armors.json` 的发射期连发字段属于装备模板固定协议，不是自定义字段；即使当前条目没有显式使用该值，属性模式保存时也不得裁掉该槽位。

## 属性模式文本与备注当前规则
- `NotePanel` 当前作为属性模式内的“文本与备注”区块使用，不再由 `MainContent` 作为独立 `note` 模式渲染。
- Wails 菜单已移除“备注模式”入口；前端仍会把历史 `mode:change` 的 `note` 请求映射回 `property`，避免旧事件造成空白模式。
- 该区块当前固定为同一行三等分布局：
  - 附加描述
  - 备注内容
  - 元数据预览
- 该区块直接维护当前条目的：
  - `description`
  - `note`
  - 由 `note` 解析出的 `meta` 预览与同步
- 描述编辑保存时保留用户输入的空行，按 `description.split('\n')` 写回 `description: string[]`，避免按 Enter 后因空行被过滤而触发来源数据同步回滚到第一行。
- 数据体检/修复模式会预解析持有字符串 `description` 的条目，把描述文本按换行拆成 `description: string[]`；已是数组的 `description` 会直接跳过，后续游戏内可直接按行绘制。
- 备注元数据解析仍由 `NoteMetadataService` 负责；属性模式只负责展示、编辑和 dirty 标记链路。
- 数据体检/修复模式不再处理 `EquipExtensions.json`。装备扩展数据仍在编辑器启动、装备模式和属性模式需要时随其他数据加载并做内存规范化；只有用户在装备/属性面板显式保存相关配置时才写回该文件。

## SaveAll 与状态一致性
- 数据保存统一通过 `loadData + markFileDirty + markItemDirty` 回写链路保持缓存与 UI 同步。
- 路径键已做标准化，Windows 下不会再因大小写或分隔符不一致导致 SaveAll 漏保存。
- 非当前文件保存时，缓存读取与脏标记消费已按标准化路径处理。
- 外部文件监听确认链路的路径聚合也统一使用标准化路径键，避免同一文件仅因盘符大小写或斜杠差异而出现重复提示。

## 当前性能收口
- 左侧列表已去掉 `indexOf` 型 O(n²) 真实索引计算。
- `MainContent`、`LeftPanel` 和主要面板已尽量改为 selector 订阅，减少全量重渲染。
- Pixi 弹道预览已避免不必要的实例销毁重建。
- 工作区扫描已跳过大目录，降低无效 I/O。
- `PropertyPanel`、`EquipPanel` 与 `QuestPanel` 的引用数据读取当前统一收口到 `referenceRevision`，切换条目不会反复重取引用缓存。
- `DropPanel`、`ProjectilePanel`、`QuestPanel` 的大批量候选项数组已改成按源数据 memo 复用。
- `EffectPanel` 已移除 `JSON.stringify` 比较链，改成 plain-data 比较。
- `StateChargePropertyService` 的比较链也已从 `JSON.stringify` 改为 `arePlainDataEqual`。
- `CodeEditorPanel` 的整组脚本预加载已加稳定清单去重，key/path 未变化时不会重复预加载。
- `PropertyPanel`、`EnemyActionOverridesCard` 所有 `<Select>` 已统一补 `showSearch + optionFilterProp="label"`（全项目 119 个）。
- 全局 `style={{width}}` → `className` (~80 处消灭 per-render 对象分配)；`headStyle/bodyStyle` → 全局 CSS (26 处)。
- 内联正则字面量全部迁移到 `constants/regexp.ts`，运行时零 `new RegExp()` 零内联 `/.../`。

## 相关依赖
- `frontend/src/hooks/useFileOperations.ts`
- `frontend/src/stores/editorStore.ts`
- `frontend/src/services/ScriptCacheManager.ts`
- `frontend/src/services/ScriptOperations.ts`
- `frontend/src/services/ScriptPathCompat.ts`
- `frontend/src/services/ExternalDataChangeQueue.ts`
- `frontend/src/components/panels/CodeEditorPanel.tsx`
- `frontend/src/components/panels/EffectPanel.tsx`
- `frontend/src/components/panels/DropPanel.tsx`
- `frontend/src/components/panels/PropertyPanel.tsx`
- `frontend/src/components/panels/ClassLevelExtensionsPanel.tsx`
- `frontend/src/components/layout/MainContent.tsx`
- `frontend/src/components/layout/LeftPanel.tsx`
- `frontend/src/components/common/ProjectileCanvas.tsx`
- `frontend/src/services/EnemyPropertyService.ts`
- `frontend/src/services/SkillPropertyService.ts`
- `backend/models/models.go`
- `app.go`
- `main.go`

## 当前约束
- 脚本编辑器不再对旧版带时间戳路径做兼容保存。
- 效果面板的字段开放范围必须以 `GameEffectService` 模板定义为准，界面层不能自行扩展协议。
- 任何未保存保护改动都必须同时考虑模式切换、数据文件切换和程序关闭三条链路。

## 近期验证
- `bunx tsc --noEmit` ✅（2026-05-02）
- `bun run build` ✅（2026-05-02，保留既有 Vite 大 chunk 警告）
- `bunx vitest run src/services/BaseDataReloadService.test.ts src/services/NoteMetadataService.test.ts src/components/panels/PropertyPanel.test.tsx` ✅（2026-05-02，保留既有 Ant Design `headStyle/bodyStyle` 废弃警告）
- `bun run test --run src/services/ClassLevelExtensionsService.test.ts src/services/DataLoaderService.test.ts src/services/BaseDataReloadService.test.ts src/components/panels/ClassLevelExtensionsPanel.test.tsx src/components/panels/PropertyPanel.test.tsx` ✅（2026-06-12，职业曲线拓展等级面板）
- `bunx tsc --noEmit` ✅（2026-06-12，职业曲线拓展等级面板）
- `go test ./...` ✅（2026-05-02）
- `bunx tsc --noEmit` ✅
- `bunx vitest run src/services/EquipmentPropertyService.test.ts src/components/panels/PropertyPanel.test.tsx src/services/DataAuditService.test.ts` ✅
- `bunx vitest run src/services/ExternalDataChangeQueue.test.ts src/services/BaseDataReloadService.test.ts` ✅
- `bunx vitest run src/components/panels/PropertyPanel.test.tsx src/components/panels/EnemyActionOverridesCard.test.tsx` ✅
- `bun run test --run src/services/ScriptCacheManager.test.ts src/services/ScriptPathCompat.test.ts` ✅
- `bun run test --run src/services/GameEffectService.test.ts` ✅
- `npm run test -- --run src/services/EnemyPropertyService.test.ts` ✅
- `npm exec vitest run src/services/SkillPropertyService.test.ts` ✅（9 tests）
- `npm exec vitest run src/services/SkillPropertyService.test.ts src/services/DataAuditService.test.ts` ✅（12 tests）
- `npm exec tsc -- --noEmit` ✅
- `bun run build` ✅
- `npm run build` ✅
- `go test ./...` ✅
- `go build ./...` ✅

## 外部变更确认链路当前规则
- `data:file-changed` 进入前端后，不再直接把 payload 塞进 hook 内的裸 `Map`。
- 当前必须先经过 `ExternalDataChangeQueue`：
  - 仅允许受支持的基础数据文件进入队列；
  - 同一标准化路径在同一处理会话内只允许触发一次确认；
  - 会话结束后的短冷却期内，同一路径重复事件不会立刻再次弹窗。
- `useFileOperations.flushExternalDataChanges()` 当前规则：
  - 每轮先消费一批已聚合的 payload；
  - 对需要确认的 plan，在弹窗前先登记本轮已处理路径；
  - 若弹窗期间又有新事件进入，只有新路径会落到下一轮；
  - 下一轮开始前会再等一个短聚合窗口，尽量把近邻文件变化收口成单次提示。

## 弱点组编辑器当前规则
- 弱点倍率标签统一为"弱点倍率 (正数=弱点)"，明确正数即受伤增量。
- InputNumber 固定 `min={0} step={0.01}`，禁止输入负数。
- `normalizeEnemyWeaknessSlot` 对 rate 执行 `Math.abs()`，保存时自动将负数转为正数。
- `EnemyPropertyService.normalizeEnemyDataEntry` 接入弱点组修复：
  - 缺失 or 非法 `baseWeaknessGroup` → 不写入（避免脏修复）
  - 缺失 or 非法 `dynamicWeaknessGroups` → `[]`
  - 每个 slot 的 `elementId` 收口为 `>=0` 整数，`rate` 取绝对值
- 修复模式（`DataAuditService` → `normalizeEntryByFileName` → `normalizeEnemyDataEntry`）自动覆盖历史数据中的负数和非法字段。测试 10/10 通过。

## 敌群出现条件当前规则
- `TroopMeetCondition` 固定为 `{ switchId, switchValue, variableId, variableOp, variableValue }`
- 默认值（无出现条件）：全 0、`switchValue=true`、`variableOp='>='` — 使用 `TROOP_MEET_CONDITION_DEFAULT` 冻结常量。
- 属性面板编辑区固定两个条件行，无增删按钮。
- UI 布局：开关行 `flex items-center gap-2`，Select 自适应 `flex-1 min-w-0`，Switch 垂直居中。
- 变量操作符使用 `VARIABLE_COMPARE_OPTIONS` 模块级常量（`>=` / `<=` / `===`）。
- 修复模式（`DataAuditService` → `normalizeEntryByFileName`）自动补齐缺失的 `meetCondition` 字段。
- `EquipExtensions.json` 不在审计目标中，只随编辑器加载/显式保存时规范化。
