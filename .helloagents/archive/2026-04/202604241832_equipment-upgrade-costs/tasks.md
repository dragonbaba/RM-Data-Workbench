# 任务清单: equipment-upgrade-costs

```yaml
@feature: equipment-upgrade-costs
@created: 2026-04-24
@status: completed
@mode: R3
@workflow_mode: INTERACTIVE
@current_stage: DEVELOP
@complexity: complex
```

## LIVE_STATUS
```json
{"status":"completed","completed":10,"failed":0,"pending":0,"total":10,"done":10,"percent":100,"current":"编辑器与 MyGame 运行时均已落地并由用户实机验证通过","updated_at":"2026-04-24 19:30:00"}
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 10 | 0 | 0 | 10 |

---

## 任务列表

### 1. 编辑器协议与标准化

- [√] 1.1 在 `frontend/src/types/index.ts` 新增 `EquipUpgradeCostEntry` 与 `RPGItem.upgradeCosts` | depends_on: []
- [√] 1.2 在 `frontend/src/services/EquipmentPropertyService.ts` 规范化武器/防具 `upgradeCosts`，缺失时补空数组 | depends_on: [1.1]
- [√] 1.3 在 `frontend/src/services/DataAuditService.ts` 让修复模式为武器/防具补齐缺失 `upgradeCosts` | depends_on: [1.2]

### 2. 属性面板编辑

- [√] 2.1 在 `frontend/src/components/panels/PropertyPanel.tsx` 初始化、变更检测和保存 `upgradeCosts` | depends_on: [1.2]
- [√] 2.2 在属性模式武器/防具区新增“强化耗材”卡片，支持逐级编辑金币、必需物品和保底物品 | depends_on: [2.1]

### 3. 测试与验证

- [√] 3.1 扩展 `frontend/src/services/EquipmentPropertyService.test.ts` 覆盖 `upgradeCosts` 标准化 | depends_on: [1.2]
- [√] 3.2 扩展 `frontend/src/services/DataAuditService.test.ts` 覆盖修复模式补字段 | depends_on: [1.3]
- [√] 3.3 运行 `bunx tsc --noEmit`、相关 Vitest 和 `bun run build` | depends_on: [2.2,3.1,3.2]

### 4. MyGame 运行时交付物

- [√] 4.1 输出 `Zaun_ItemCore.js` 与 `Zaun_ItemUpgrade.js` 运行时补丁说明，覆盖字段复制、读取、校验、扣除和展示改动 | depends_on: [3.3]
- [√] 4.2 补充每级 `successRate` 运行时读取说明，成功率不再由插件公式统一决定 | depends_on: [4.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-04-24 18:32:47 | DESIGN | pending | 已选择方案 A：顶层 `upgradeCosts` 固定数组 |
| 2026-04-24 18:58:00 | DEVELOP | completed | 编辑器协议、标准化、面板、修复模式、测试用例和运行时补丁说明已完成 |
| 2026-04-24 18:58:00 | 验证 | failed | `tsc --noEmit` 通过；Vitest 与 Vite build 均因 `spawn EPERM` 无法启动 esbuild 子进程 |
| 2026-04-24 19:08:00 | 增量补充 | completed | `upgradeCosts[]` 新增 `successRate`，缺失值按 `100 / 目标强化等级` 补齐 |
| 2026-04-24 19:08:00 | 增量验证 | partial | `bunx tsc --noEmit`、`bun run build` 通过；Vitest 仍受 `spawn EPERM` / bun 启动拒绝影响 |
| 2026-04-24 19:30:00 | 用户验收 | completed | MyGame 运行时已落地，用户确认实机运行正常；Vitest 环境失败按外部权限问题归档为已知验证缺口 |

---

## 执行备注

- 当前会话已可直接写 `D:/RMProjects/MyNewEditor` 与 `D:/RMProjects/MyGame`。
- `D:/RMProjects/MyGame/js/plugins/Zaun_ItemCore.js` 与 `D:/RMProjects/MyGame/js/plugins/Zaun_ItemUpgrade.js` 已完成运行时落地。
- `upgradeCosts[index]` 对应目标强化等级 `index + 1`。
- `upgradeCosts[index].successRate` 是目标强化等级的基础成功率百分比；缺失时按旧公式 `100 / (index + 1)` 补齐。
- 强化失败仍消耗金币和必需耗材；保底物品仅在启用保底时消耗。
