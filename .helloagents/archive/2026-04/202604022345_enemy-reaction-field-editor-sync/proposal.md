# 变更提案: enemy-reaction-field-editor-sync

## 元信息
```yaml
类型: 修复
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-04-02
```

---

## 1. 需求

### 背景
`MyGame` 的敌人扩展字段已经硬切到顶层属性，运行时当前实际读取的敌人扩展字段包括 `classId / level / levelScope / isBoss / bounty / attackAnimationId / reactionSkillId`。`MyNewEditor` 的敌人扩展卡片只暴露了前六项，缺少 `reactionSkillId` 的编辑入口，导致编辑器与运行时契约不一致。

### 目标
- 在敌人扩展卡片中补上 `reactionSkillId` 编辑入口，候选项从 `Skills.json` 读取。
- 让敌人扩展字段的服务层、面板层、测试层完全覆盖运行时当前读取的字段集合。
- 确认在“仅按运行时实际读取字段收口”的范围下，不再遗漏其他敌人扩展字段。

### 约束条件
```yaml
时间约束: 当日完成
性能约束: 复用现有引用数据缓存与 Select 选项构造，不新增冗余扫描链路
兼容性约束: 不再保留旧 note/meta 迁移读取逻辑，只认当前敌人顶层字段
业务约束: 检查范围仅限 MyGame 运行时当前实际读取的敌人扩展字段
```

### 验收标准
- [ ] 敌人扩展卡片新增迎击技能字段，并可从 `Skills.json` 选择/保存 `reactionSkillId`
- [ ] `EnemyPropertyService` 的归一化、变更检测、保存逻辑与测试覆盖 `reactionSkillId`
- [ ] 以 `MyGame` 当前运行时读取字段为准，确认编辑器不存在除 `reactionSkillId` 外的其他遗漏敌人扩展字段

---

## 2. 方案

### 技术方案
以 `MyGame` 代码扫描结果作为敌人扩展字段的唯一事实来源，锁定运行时字段集合为 `classId / level / levelScope / isBoss / bounty / attackAnimationId / reactionSkillId`。在编辑器侧做三处同步：

1. 扩展 `EnemyPropertyService` 的字段白名单、归一化返回值、差异检测和保存回写。
2. 在 `PropertyPanel` 的敌人扩展卡片中新增“迎击技能”字段，直接复用现有 `skillOptions`。
3. 同步更新测试与知识库，明确当前编辑器敌人扩展卡片已完整覆盖运行时字段集合。

### 影响范围
```yaml
涉及模块:
  - frontend/src/services/EnemyPropertyService.ts: 敌人扩展字段服务契约补齐 reactionSkillId
  - frontend/src/components/panels/PropertyPanel.tsx: 敌人扩展卡片新增迎击技能编辑
  - frontend/src/services/EnemyPropertyService.test.ts: 敌人扩展服务测试补齐 reactionSkillId 覆盖
  - .helloagents/CHANGELOG.md: 记录本次编辑器敌人扩展字段补口
预计变更文件: 6
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 面板字段补充后遗漏保存链路，界面可见但不能落盘 | 中 | 同步修改初始值、变更检测、保存回写与测试 |
| 误把非运行时字段也塞进敌人扩展卡片，扩大维护面 | 低 | 以 `MyGame` 运行时代码实际读取结果为准，不额外扩展 |
| 现有测试只保留遗留字段语义，未覆盖面板新增字段 | 中 | 补齐纯函数测试并通过指定测试命令验证 |

---

## 3. 核心场景

### 场景: 编辑敌人迎击技能
**模块**: PropertyPanel / EnemyPropertyService
**条件**: 当前文件为 `Enemies.json`
**行为**: 用户在敌人扩展卡片中选择一个迎击技能并保存
**结果**: `reactionSkillId` 被写回敌人顶层属性，`note/meta` 继续保持空结构

### 场景: 校验编辑器字段覆盖完整性
**模块**: PropertyPanel / EnemyPropertyService / 知识库
**条件**: 以 `MyGame` 当前运行时代码为准扫描敌人扩展字段
**行为**: 对照运行时实际读取字段集合检查编辑器暴露字段
**结果**: 编辑器敌人扩展卡片仅缺 `reactionSkillId`，补齐后与运行时字段集合一致

---

## 4. 技术决策

### enemy-reaction-field-editor-sync#D001: 敌人扩展卡片只覆盖运行时当前实际读取字段
**日期**: 2026-04-02
**状态**: ✅采纳
**背景**: 用户要求补迎击字段，并检查是否还有其他敌人字段遗漏；同时明确检查范围只按当前游戏运行时实际读取的敌人扩展字段收口。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 只补运行时已读取字段 | 契约明确，维护范围稳定，不会把编辑器做成无边界字段面板 | 若运行时以后新增字段，需要再同步一次 |
| B: 扩大为所有敌人顶层业务字段 | 一次性暴露更多数据 | 范围失控，容易把未稳定协议也塞进面板 |
**决策**: 选择方案 A
**理由**: 这次任务的真实目标是让编辑器和当前运行时契约重新对齐，不是扩大敌人编辑面板的业务边界。
**影响**: 敌人扩展卡片、服务层、测试和知识库都以当前运行时字段集合作为唯一来源。

---

## 5. 成果设计

N/A
