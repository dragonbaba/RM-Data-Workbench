# 任务清单: drop-mode-enemy-drops

> **@status:** completed | 2026-03-24 07:46

```yaml
@feature: drop-mode-enemy-drops
@created: 2026-03-24
@status: completed
@mode: R2
```

<!-- LIVE_STATUS_BEGIN -->
状态: completed | 进度: 10/10 (100%) | 更新: 2026-03-24 07:47:00
当前: 开发实施完成，等待归档
<!-- LIVE_STATUS_END -->

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 10 | 0 | 0 | 10 |

---

## 任务列表

### 1. 模式与入口接入

- [√] 1.1 在 `frontend/src/types/index.ts` 中扩展 `EditorMode` 与敌人掉落相关最小类型定义。 | depends_on: []
- [√] 1.2 在 `app.go` 中新增“掉落模式”菜单入口，并约定与 `Enemies.json` 的联动打开方式。 | depends_on: [1.1]
- [√] 1.3 在 `frontend/src/hooks/useFileOperations.ts` 中补掉落模式切换逻辑，确保当前文件管理仍以 `Enemies.json` 为主。 | depends_on: [1.1, 1.2]

### 2. 主界面与模式分发

- [√] 2.1 在 `frontend/src/components/layout/MainContent.tsx` 中新增 `DropPanel` 分发。 | depends_on: [1.1]
- [√] 2.2 调整 `frontend/src/components/layout/LeftPanel.tsx`，让 drop 模式的标题和语义固定为敌人列表，并沿用 `Enemies.json` 脏标记。 | depends_on: [1.1]

### 3. 掉落面板实现

- [√] 3.1 新增 `frontend/src/components/panels/DropPanel.tsx`，构建“敌人摘要 + 掉落条目列表”的基础界面。 | depends_on: [1.1, 2.1]
- [√] 3.2 在掉落面板中读取 `Enemies.json`、`Items.json`、`Weapons.json`、`Armors.json` 缓存，并派生 `dropType` 候选和引用条目候选。 | depends_on: [3.1]
- [√] 3.3 实现当前敌人缺失 `enemyDrops` 时的惰性初始化、掉落项增删改、失效引用保留与当前敌人数据回写。 | depends_on: [3.1, 3.2]

### 4. 联动与验证

- [√] 4.1 在 `frontend/src/services/BaseDataReloadService.ts` 中新增 drop 模式依赖白名单：`Enemies.json`、`Items.json`、`Weapons.json`、`Armors.json`。 | depends_on: [1.1]
- [√] 4.2 在 `frontend/src/services/BaseDataReloadService.test.ts` 中补掉落模式依赖刷新测试，并运行类型检查/相关测试/构建验证。 | depends_on: [4.1, 3.3]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-24 07:40:00 | 方案设计 | completed | 已确定采用 `Enemies.json` 主文件 + `drop` uiMode 路径 |
| 2026-03-24 07:42:00 | 1.x / 2.x | completed | 模式菜单、状态切换、主内容区和左侧列表接入完成 |
| 2026-03-24 07:43:00 | 3.x | completed | DropPanel、enemyDrops 惰性初始化、失效引用保留与缓存回写完成 |
| 2026-03-24 07:44:00 | 4.1 | completed | 掉落模式依赖白名单与测试用例补齐完成 |
| 2026-03-24 07:47:00 | 4.2 | completed | tsc、指定测试、前端构建、go test、go build 通过 |

---

## 执行备注

> 本方案默认不新增独立 drop fileType。若后续产品目标升级为“掉落总览工作台 / 批量掉落配置器”，需要重新评估是否升级为聚合模式。
