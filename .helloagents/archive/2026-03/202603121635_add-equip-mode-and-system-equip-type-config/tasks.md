# 任务清单: add-equip-mode-and-system-equip-type-config

> **@status:** completed | 2026-03-12 16:50

```yaml
@feature: add-equip-mode-and-system-equip-type-config
@created: 2026-03-12
@status: completed
@mode: R3
```

<!-- LIVE_STATUS_BEGIN -->
状态: completed | 进度: 13/13 (100%) | 更新: 2026-03-12 16:50:00
当前: 开发实施完成，等待归档
<!-- LIVE_STATUS_END -->

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 13 | 0 | 0 | 13 |

---

## 任务列表

### 1. 模式与入口接入

- [√] 1.1 在 `frontend/src/types/index.ts` 中扩展 `EditorMode`，为装备模式补齐最小必要的类型定义。
- [√] 1.2 在 `app.go` 中新增“装备模式”菜单入口，并约定与 `Actors.json` 的联动打开方式。
- [√] 1.3 在 `frontend/src/hooks/useFileOperations.ts` 中补装备模式切换逻辑，确保当前文件管理仍以 `Actors.json` 为主。

### 2. 状态与内容区接入

- [√] 2.1 在 `frontend/src/stores/editorStore.ts` 中接入 `equip` 模式切换与普通数据模式恢复逻辑。
- [√] 2.2 在 `frontend/src/components/layout/MainContent.tsx` 中新增 `EquipPanel` 分发。
- [√] 2.3 确认 `frontend/src/components/layout/LeftPanel.tsx` 在 `equip` 模式下继续复用角色列表，无需进入地图分支。

### 3. 装备面板实现

- [√] 3.1 新增 `frontend/src/components/panels/EquipPanel.tsx`，构建“角色装备槽区 + 系统规则区”的基础界面。
- [√] 3.2 在装备面板中读取 `Actors.json`、`Weapons.json`、`Armors.json`、`System.json` 缓存，并派生槽位类型和候选装备列表。
- [√] 3.3 实现槽位类型选择、装备选择、角色切换刷新和当前角色数据回写。

### 4. 系统规则与监听联动

- [√] 4.1 为 `System.json` 增加 `weaponEquipTypeIds` 的读取、编辑与保存链路，并纳入 `dirtyFiles + SaveAll`。
- [√] 4.2 在 `frontend/src/services/BaseDataReloadService.ts` 中新增 equip 模式依赖白名单：`Actors.json`、`Weapons.json`、`Armors.json`、`System.json`。

### 5. 验证与知识库同步

- [√] 5.1 为装备派生逻辑补最小测试或验证样例，重点覆盖槽位类型与武器/防具筛选规则。
- [√] 5.2 运行 `bunx tsc --noEmit`、`bun run build`、相关测试，并同步更新 `.helloagents/modules/` 与 `CHANGELOG.md`。

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-12 16:35:00 | 方案设计 | completed | 已确定采用 “Actors 主文件 + equip uiMode” 路径 |
| 2026-03-12 16:41:00 | 1.x / 2.x | completed | 模式菜单、状态切换、主内容区接入完成 |
| 2026-03-12 16:45:00 | 3.x / 4.x | completed | EquipPanel、系统规则写回和依赖白名单完成 |
| 2026-03-12 16:47:00 | 5.1 | completed | EquipDataService 与 5 个单元测试通过 |
| 2026-03-12 16:50:00 | 5.2 | completed | tsc、build、前端全量测试、go test、go build 通过 |

---

## 执行备注

> 本方案默认不新增独立 `equip fileType`。如果后续产品目标升级为“跨角色装备工作台 / 批量装备预设编辑器”，需要重新评估是否升级为聚合模式。
