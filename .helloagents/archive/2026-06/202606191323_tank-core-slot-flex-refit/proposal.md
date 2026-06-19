# 战车核心槽引擎/C装置混排

## 背景

MyGame 的战车改造规则要求核心槽不再固定为“引擎/引擎/C装置/C装置”。`slotIndex 5..8` 需要允许引擎 `7` 与 C 装置 `8` 混排，但四格中必须同时存在至少 1 个引擎和 1 个 C 装置。

## 决策

### tank-core-slot-flex-refit#D001

编辑器继续只维护 `EquipExtensions.json` 固定结构，不把规则写回 `Actors.json`。`EquipExtensionsService.normalizeEquipExtensions()` 负责为战车 actor 补齐 `slotIndex 5..8` 的 `0->7`、`0->8` 与 `7<->8` transition；底盘 `slotIndex 9` 仍固定。

## 实现

- `frontend/src/services/EquipExtensionsService.ts`
  - 移除 `slotIndex 5/7` 固定映射。
  - `slotIndex 5..8` 默认生成引擎/C 装置混排 transition。
- `frontend/src/services/EquipExtensionsService.test.ts`
  - 覆盖核心槽默认规则和旧数据补齐。
- `D:/RMProjects/MyGame/data/EquipExtensions.json`
  - 由脚本补齐 20 个坦克 actor 的核心槽 transition。
- `D:/RMProjects/MyGame/js/plugins/Zaun_TankRefitSystem.js`
  - 运行时拦截全引擎/全 C 装置。

## 验证

- `npm test -- --run src/services/EquipExtensionsService.test.ts`：13 passed。
- `node --check js/plugins/Zaun_TankRefitSystem.js`：通过。
- 数据校验：20 个坦克 actor 的核心槽 transition 无缺失。
