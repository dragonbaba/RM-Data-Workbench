# 物品等级上限特殊效果编辑

## 背景

MyGame 将等级上限提升从公共事件 + `unlockActorMaxLevel` 插件指令改为 `Items.json` 顶层字段 `levelLimitBreakAmount`。原先尝试写入标准 RPG `effects` 中的 `code=41,dataId=1`，但该数组会被 RPG Maker 编辑器写回为空，编辑器需要维护顶层字段并保留标准 effects 对象。

## 决策

### item-upgrade-revert-levelcap-effect#D001

- `Items.json` 使用顶层 `levelLimitBreakAmount` 保存等级上限提升量。
- `Items.json.effects` 仍保留为标准 RPG effect 对象数组，但不承载等级上限提升业务值。
- `Weapons.json/Armors.json` 等宿主的 `effects:number[]` 仍表示 Effects.json 条件效果引用。
- `PropertyPanel` 对 Items.json 显示“等级上限提升量”，写回 `levelLimitBreakAmount`；不显示 Effects.json 引用卡片。

## 实现

- `frontend/src/types/index.ts`
  - 新增 `RPGItemEffect`。
  - `RPGItem.effects` 扩展为 `Array<number | RPGItemEffect>`。
  - `RPGItem` 新增 `levelLimitBreakAmount`。
- `frontend/src/components/panels/PropertyPanel.tsx`
  - 新增等级上限提升量读取与写回，保存到顶层 `levelLimitBreakAmount`。
  - Items.json 隐藏 Effects.json 引用卡片。
- `frontend/src/services/DataAuditService.test.ts`
  - 回归覆盖 `levelLimitBreakAmount` 与标准 effects 对象不被审计清除。

## 验证

- `npm test -- --run src/services/DataAuditService.test.ts`
- `npm run build`
