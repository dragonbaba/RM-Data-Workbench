# actor20 新获得战车数据源收敛

## 背景

MyGame 中 actor20 / tankIndex 13 的新获得战车出现 `_tankBase=null` 与不可上车现象。排查确认根因是 `EquipExtensions.json` 初始装备槽/装备值错位与载重配置不匹配；修复应由编辑器数据协议保证，而不是由运行时 TankUI/TankCore 自愈。

## 决策

### actor20-tank-data-source-finalization#D001

MyNewEditor 负责在数据进入项目时维护战车固定槽协议：

- 普通加载 `EquipExtensions.json` 时读取 `Actors.json.isTank` 并传入 normalize。
- 修复模式按装备 `etypeId` 把错位引擎/C 装置/底盘移动回固定槽。
- 装备复制只允许同为人类或同为战车的 actor 之间复制。
- 不把运行时日志、自愈 API 或 UI 兜底作为长期方案。

## 实现

- `frontend/src/services/EquipExtensionsService.ts`
  - normalize 使用 `actorEquipSlots` 与 `actorEquips` 对齐，保护战车固定 C 装置/底盘槽。
  - 新增 `collectTankActorIndexes()` 与复制目标过滤能力。
- `frontend/src/services/DataLoaderService.ts`
  - `ensureEquipExtensionsLoaded()` 在普通加载路径读取 `Actors.json` 并传入战车索引。
- `frontend/src/services/DataAuditService.ts`
  - repair 模式载入 `Armors.json`，按 `etypeId` 修复错位核心装备。
- `frontend/src/components/panels/EquipPanel.tsx`
  - 复制弹窗目标过滤为同类 actor。
- `frontend/src/services/*.test.ts`
  - 补充 normalize、repair、loader 与复制过滤回归。

## 验证

- `npm test -- --run src/services/EquipExtensionsService.test.ts src/services/DataAuditService.test.ts src/services/DataLoaderService.test.ts`：30 passed。
- `npx tsc --noEmit --pretty false`：通过。
- touched-file `npx eslint ...`：0 errors，17 个既有 warnings。
- MyGame 数据校验确认 actor20：`weight=3045`、`loadValue=3200`、`maxLoadValue=155`、`baseDurability=510`、`canMove=true`。

## 存档兼容

该修复影响数据库与编辑器写入协议，不迁移旧存档内独立装备实例。