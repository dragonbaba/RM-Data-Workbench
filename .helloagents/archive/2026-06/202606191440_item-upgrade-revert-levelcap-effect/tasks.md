# 任务清单：物品等级上限特殊效果编辑

- [√] 扩展 `RPGItem.effects` 类型。
- [√] 扩展 `RPGItem.levelLimitBreakAmount` 类型。
- [√] `PropertyPanel` 增加 Items.json 等级上限提升量编辑。
- [√] 保留 Items.json 其他标准 RPG effects 对象。
- [√] `DataAuditService.test` 增加回归覆盖。
- [√] `npm test -- --run src/services/DataAuditService.test.ts`。
- [√] `npm run build`。

结果：完成。Items.json 不再被 Effects.json 引用 UI 覆盖，等级上限提升量保存到顶层 `levelLimitBreakAmount`。
