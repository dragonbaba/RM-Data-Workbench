# 任务清单: effect-runtime-count-sync

```yaml
@feature: effect-runtime-count-sync
@created: 2026-03-22
@status: completed
@mode: R2
```

## LIVE_STATUS

```yaml
current_stage: DEVELOP
workflow_mode: INTERACTIVE
current_task: 已完成运行时 effect.js 的引擎与 C 装计数逻辑收口
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 5 | 0 | 0 | 5 |

---

## 任务列表

### 1. 方案包与上下文收口

- [√] 1.1 创建当前方案包并补齐 proposal、tasks、状态信息 | depends_on: []

### 2. 运行时计数逻辑收口

- [√] 2.1 在 `D:\RMProjects\MyGame\effects\effect.js` 中移除泛型 `countByEquipType()` 主路径，并把单引擎判定改为复用现有引擎计数 | depends_on: [1.1]
- [√] 2.2 在 `D:\RMProjects\MyGame\effects\effect.js` 中收紧引擎/C 装双同型 helper 命名与分支语义 | depends_on: [2.1]

### 3. 验证与同步

- [√] 3.1 对运行时代码执行基础验证，并给出单引擎/双同型引擎/C 装的手动验收说明 | depends_on: [2.2]
- [√] 3.2 同步知识库、CHANGELOG 并归档当前方案包 | depends_on: [3.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-22 23:54 | 方案设计 | completed | 已确认引擎与 C 装相关模板都按现成计数能力收口 |
| 2026-03-23 00:09 | 运行时计数逻辑收口 | completed | `single_engine_bonus` 改为直接复用 `_engineCount`，双同型引擎/C 装条件分别预判 `_engineCount/_computerCount` 后再做同 baseId 扫描 |
| 2026-03-23 00:10 | 基础验证 | completed | `node --check D:/RMProjects/MyGame/effects/effect.js` 通过，方案包结构校验通过 |

---

## 执行备注

> 记录执行过程中的重要说明、决策变更、风险提示等

- 当前 `MyGame` 项目没有自动化测试脚本，预计采用语法检查 + 手动验收路径说明作为本轮验证基线。
- 手动验收建议：
  - 只装 1 个引擎时验证 `single_engine_bonus` 生效；装到 0 个或 2 个引擎时应失效。
  - 装 2 个相同基础 id 的引擎时验证 `pair_same_engine_bonus` 生效；仅数量达标但 baseId 不同应失效。
  - 装 2 个相同基础 id 的 C 装时验证 `pair_same_cunit_bonus` 生效；数量不足或 baseId 不同应失效。
