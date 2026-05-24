# 变更提案: editor-repair-mode-projectile-sync-tightening

## 元信息
```yaml
类型: 修复+优化
方案类型: implementation
优先级: P1
状态: 已确认
创建: 2026-04-08
```

---

## 1. 需求

### 背景
本轮反馈聚焦于编辑器弹道与修复模式收口：
- 修复模式应补齐缺失关键字段默认值，不应在运行时保留旧字段兜底读取。
- 弹道预览需要继续做性能优化，提升编辑流畅度。
- 弹道偏移编辑后左侧“未保存”显示缺失。
- 技能面板依赖的弹道数据外部变化时，应有明确提示而非静默更新。

### 目标
- 把 `Skills.json` 与 `Projectiles.json` 的遗留结构在修复模式统一规范化。
- 提升弹道预览播放与轨迹绘制链路性能。
- 修复弹道模式脏标记显示缺口。
- 为技能面板补齐 `Projectiles.json` 外部变更提示文案与确认链。

### 验收标准
- [ ] `DataAuditService` 已纳入 `Projectiles.json` 修复目标。
- [ ] `normalizeProjectileDataEntry` 可把旧 `easing` 等字段收口到 `easeX/easeY` 并补默认值。
- [ ] `normalizeSkillDataEntry` 缺失 targeting 时可直接补默认值。
- [ ] 弹道偏移修改后左侧“未保存”即时可见。
- [ ] 技能属性面板依赖弹道数据变化时弹出确认提示。
- [ ] `npm run build` 与相关 `vitest` 用例通过。

---

## 2. 方案

### 技术方案
- `DataAuditService`：
  - 新增 `Projectiles.json` 到 `AUDIT_TARGET_FILE_NAMES`；
  - 按文件类型调用 `normalizeProjectileDataEntry()`。
- `ProjectileTemplateService`：
  - 新增 `normalizeProjectileDataEntry()`，补齐默认字段，标准化发射段并清理旧 `easing`。
- `SkillPropertyService`：
  - 归一化时统一补齐 `targetCamp/targetLifeState/selectMode/areaMode` 默认值。
- `ProjectileCanvas` + `ProjectilePreviewUtils`：
  - 轨迹点定长数组写入；
  - 播放段预编译（duration/delta/rotation/easing）；
  - 轨迹数字标签池化复用。
- `LeftPanel`：
  - `projectile` 模式下改为联合检查 `Projectiles.json + Actors.json + Enemies.json` 脏状态。
- `BaseDataReloadService`：
  - 新增 `skills.json` 对 `projectiles.json` 依赖；
  - 提供技能面板专用确认文案。

---

## 3. 技术决策

### editor-repair-mode-projectile-sync-tightening#D001: 旧结构兼容统一放入修复模式，不进入运行时读取链
**日期**: 2026-04-08  
**状态**: ✅采纳

### editor-repair-mode-projectile-sync-tightening#D002: 弹道预览热路径采用预编译与标签池化
**日期**: 2026-04-08  
**状态**: ✅采纳

### editor-repair-mode-projectile-sync-tightening#D003: 技能面板依赖弹道数据变更必须提示确认
**日期**: 2026-04-08  
**状态**: ✅采纳

---

## 4. 成果设计

N/A

