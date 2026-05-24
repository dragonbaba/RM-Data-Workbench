# 任务清单: unsaved-guard-and-animation-reload-prompts

> **@status:** completed | 2026-03-18 20:14

```yaml
@feature: unsaved-guard-and-animation-reload-prompts
@created: 2026-03-18
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 0 | 0 | 4 |

## LIVE_STATUS

```json
{"status":"completed","completed":4,"failed":0,"pending":0,"total":4,"percent":100,"current":"已完成：未保存保护、关闭拦截与动画依赖回归","updated_at":"2026-03-18 20:15:00"}
```

---

## 任务列表

### 1. 前端交互

- [√] 1.1 在 `frontend/src/components/common/InputDialog.tsx` 中实现三选项确认入口，并在 `useFileOperations.ts` 中抽统一未保存保护逻辑 | depends_on: []
- [√] 1.2 在 `frontend/src/hooks/useFileOperations.ts` 中接入“切换数据文件前保存提示”“关闭程序前保存提示”，并统一模式切换行为 | depends_on: [1.1]

### 2. 前后端关闭链路

- [√] 2.1 在 `app.go`、`main.go` 与 `frontend/wailsjs/go/main/App.*` 中接入 `OnBeforeClose` 与放行退出方法 | depends_on: [1.2]

### 3. 验证

- [√] 3.1 为 `BaseDataReloadService` 补充弹道动画依赖回归测试，并执行 `bunx tsc --noEmit`、相关 `vitest` 与 `bun run build` | depends_on: [2.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-18 20:09 | 1.1 | completed | InputDialog 已补三选项入口，未保存提示开始统一收口 |
| 2026-03-18 20:10 | 1.2 | completed | 数据切换、模式切换、程序关闭共用三态未保存保护 |
| 2026-03-18 20:10 | 2.1 | completed | Wails 已接入 OnBeforeClose 与 ProceedClose 放行退出 |
| 2026-03-18 20:12 | 3.1 | completed | TS、Vitest、前后端构建/测试通过 |

---

## 执行备注

> 记录执行过程中的重要说明、决策变更、风险提示等
- 三态提示统一为：保存全部 / 不保存 / 取消。
- 弹道模式对 `Animations.json` 的依赖命中逻辑原本已存在，本次补的是回归覆盖与链路确认。
