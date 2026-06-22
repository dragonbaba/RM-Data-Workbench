# 任务清单：actor20 新获得战车数据源收敛

## 实现

- [√] 普通加载传入战车索引
  - `DataLoaderService.ensureEquipExtensionsLoaded()` 读取 `Actors.json.isTank`。
- [√] 修复模式回正错位核心装备
  - `DataAuditService` 读取 `Armors.json` 并按 `etypeId` 修复战车固定槽。
- [√] normalize 保护固定槽协议
  - `EquipExtensionsService` 对齐 `actorEquipSlots` 与 `actorEquips`。
- [√] 复制入口限制同类 actor
  - `EquipPanel` 只允许人类→人类、战车→战车。
- [√] 补齐回归测试
  - 覆盖 normalize、repair、loader、copy target。

## 验证

- [√] 运行目标测试
  - `npm test -- --run src/services/EquipExtensionsService.test.ts src/services/DataAuditService.test.ts src/services/DataLoaderService.test.ts`
- [√] 运行类型检查
  - `npx tsc --noEmit --pretty false`
- [√] 运行 touched-file lint
  - `npx eslint ...`：0 errors，17 个既有 warnings。
- [√] 同步知识记录
  - `D:/RMProjects/MyGame/.helloagents/modules/tank-rental-refit-system.md`
  - `D:/RMProjects/MyGame/.helloagents/CHANGELOG.md`
  - `D:/RMProjects/MyNewEditor/.helloagents/modules/equip-mode-and-system-rules.md`
  - `D:/RMProjects/MyNewEditor/.helloagents/CHANGELOG.md`

## 结果

完成。MyNewEditor 现在在普通加载、修复模式与复制入口共同维护战车固定槽协议，避免 actor20 这类新获得战车再由运行时自愈补救。