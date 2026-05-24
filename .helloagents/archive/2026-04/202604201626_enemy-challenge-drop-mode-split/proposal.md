# 变更提案: enemy-challenge-drop-mode-split

## 元信息
```yaml
类型: 优化
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-04-20
```

---

## 1. 需求

### 背景
敌人属性模式中 `Boss 图鉴挑战` 同时承载挑战入口、星级属性、倍率和额外奖励，掉落相关内容与敌人基础属性挤在同一面板里，不利于维护。项目已有独立 `drop` 模式负责 `Enemies.json` 上的掉落配置，应把图鉴挑战掉落统一纳入该模式管理。

### 目标
- 属性模式保留敌人属性与图鉴挑战的非掉落配置。
- 掉落模式新增 `图鉴挑战掉落` 独立区块，按星级编辑挑战掉落倍率与额外奖励。
- 持久化数据结构和字段内容保持不变，仍写回 `enemy.bookChallenge.stars[]`。

### 约束条件
```yaml
时间约束: 无
性能约束: 继续使用缓存引用数据与当前敌人局部更新，不引入全表批量补齐
兼容性约束: 不改变 Enemies.json 数据结构，不迁移字段名，不清洗失效引用
业务约束: 掉落模式仍以 Enemies.json 为主文件，普通 enemyDrops 与 bookChallenge 掉落分区展示
```

### 验收标准
- [ ] 属性模式不再展示图鉴挑战的掉率倍率、金币倍率、经验倍率和额外奖励编辑入口。
- [ ] 掉落模式可编辑当前敌人每个图鉴挑战星级的掉率倍率、金币倍率、经验倍率和额外奖励。
- [ ] 修改图鉴挑战掉落后仍写回原 `enemy.bookChallenge.stars[]` 字段，不改变保存数据内容。
- [ ] 普通 `enemyDrops` 现有行为与测试保持通过。

---

## 2. 方案

### 技术方案
在 `PropertyPanel` 中拆除图鉴挑战星级内的掉落奖励 UI，仅保留 `star/goldCost/levelRequirement/baseParamRate/passiveStates` 等挑战属性配置。`Form` 内初始值仍保留完整 `enemyBookChallenge` 对象，保存时继续通过 `buildEnemySaveData()` 规范化写回，避免隐藏字段丢失。

在 `DropPanel` 中复用 `Enemies.json` 当前敌人更新链路，新增 `图鉴挑战掉落` 卡片。该卡片读取 `normalizeEnemyBookChallenge(enemy.bookChallenge)`，按 `stars[]` 渲染每个星级的 `dropRateMultiplier/goldMultiplier/expMultiplier/extraRewards`，更新时只替换目标星级对象，保留同一星级上的其他挑战字段。

### 影响范围
```yaml
涉及模块:
  - PropertyPanel: 移除图鉴挑战掉落奖励 UI，保留非掉落配置
  - DropPanel: 新增图鉴挑战掉落编辑区与引用选项
  - DropPanel.test: 补充图鉴挑战掉落写回回归
  - drop-mode-and-enemy-drop-rules.md: 更新掉落模式当前规则
预计变更文件: 4
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 属性模式保存隐藏字段时误丢 `extraRewards` | 中 | 使用 `form.getFieldsValue(true)` 和完整初始对象保留字段，并用测试覆盖 DropPanel 写回 |
| DropPanel 编辑星级掉落时覆盖星级非掉落配置 | 中 | 更新函数按 star index 复制原对象后只改目标字段 |
| 普通 enemyDrops 行为回归 | 低 | 保留现有函数与测试，新增代码独立在挑战掉落区 |

---

## 3. 技术设计

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| `enemy.bookChallenge.stars[].dropRateMultiplier` | number | 图鉴挑战星级的通用掉落倍率 |
| `enemy.bookChallenge.stars[].goldMultiplier` | number | 图鉴挑战星级的金币倍率 |
| `enemy.bookChallenge.stars[].expMultiplier` | number | 图鉴挑战星级的经验倍率 |
| `enemy.bookChallenge.stars[].extraRewards[]` | EnemyBookChallengeExtraReward[] | 图鉴挑战星级额外奖励，支持 gold/item/weapon/armor |

---

## 4. 核心场景

### 场景: 图鉴挑战掉落集中编辑
**模块**: 掉落模式与敌人掉落规则  
**条件**: 当前处于 `drop` 模式且主文件为 `Enemies.json`  
**行为**: 用户在 `图鉴挑战掉落` 区块修改某星级的倍率或额外奖励  
**结果**: 当前敌人标脏，数据写入 `enemy.bookChallenge.stars[]`，普通 `enemyDrops` 不受影响

---

## 5. 技术决策

### enemy-challenge-drop-mode-split#D001: 图鉴挑战掉落归属 drop 模式
**日期**: 2026-04-20  
**状态**: ✅采纳  
**背景**: 属性模式已经承载大量敌人扩展、弱点、状态和图鉴挑战配置，图鉴挑战额外掉落继续放在属性模式会扩大面板职责。  
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: DropPanel 独立区块 | 归属清晰，改动集中，普通掉落与挑战掉落同屏管理 | DropPanel 需要新增 bookChallenge 编辑逻辑 |
| B: DropPanel Tabs | 分区更强 | 改动更大，现有普通掉落入口需要重排 |
| C: 只做最小字段迁移 | 改动最小 | 仍不利于后续扩展和阅读 |
**决策**: 选择方案 A  
**理由**: 用户已确认独立区块；它能保持普通掉落列表稳定，同时把图鉴挑战掉落集中到 drop 模式。  
**影响**: `PropertyPanel`、`DropPanel`、掉落模式知识库文档。

---

## 6. 成果设计

N/A。该任务是现有编辑器面板职责拆分，不引入新的视觉体系。
