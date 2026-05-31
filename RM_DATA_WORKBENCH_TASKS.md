# RM Data Workbench 重构任务清单

> 本文档用于跟踪从 MyEditor (Electron) 到 RM Data Workbench (Wails) 的重构进度
> 
> 创建时间: 2026-01-30
> 原项目: D:\RMProjects\MyEditor (Electron + TypeScript)
> 新项目: D:\RMProjects\RM Data Workbench (Wails + Go + React)

---

## 项目对比概览

| 维度 | 原项目 (MyEditor) | 新项目 (RM Data Workbench) | 状态 |
|------|------------------|---------------------|------|
| **技术栈** | Electron + TypeScript | Wails v2 + Go + React | 已迁移 |
| **UI 框架** | 原生 DOM + Tailwind | React + Ant Design + Tailwind | 已迁移 |
| **状态管理** | StateManager (自定义) | Zustand | 已迁移 |
| **编辑器** | Monaco Editor | Monaco Editor | 已存在 |
| **渲染引擎** | PixiJS v7.4.3 | PixiJS v7.3.2 | 已存在 |
| **构建工具** | Vite v7.3.0 | Vite v5.0.8 | 需升级 |

---

## 核心功能缺失清单

### 阶段一：基础架构完善 (高优先级)

#### 1.1 核心管理系统
- [x] **StateManager 完整实现**
  - [x] 完整的状态订阅机制（当前 Zustand 基础已实现）
  - [x] 状态变更追踪和通知系统
  - [x] 配置持久化（主题、工作区设置）
  - [x] 文件脏标记管理 (`dirtyFiles`)
  - [ ] 撤销/重做历史栈
  
- [x] **EventSystem 事件总线**
  - [x] 发布/订阅模式实现
  - [x] 事件命名空间支持
  - [x] 监听器生命周期管理
  - [ ] 事件优先级和异步处理

- [x] **PanelManager 面板管理器**
  - [x] 面板生命周期管理
  - [ ] 面板切换动画
  - [x] 面板状态持久化
  - [x] 面板间通信机制

#### 1.2 性能优化系统
- [ ] **对象池系统**
  - [ ] 通用 ObjectPool 实现
  - [ ] DOM 元素池 (DOMPools)
  - [ ] 编辑器实例池 (EditorPools)
  - [ ] 对象池性能监控

- [ ] **性能监控与优化**
  - [ ] PerformanceMonitor 性能监控器
  - [ ] PerformanceOptimizer 自动优化器
  - [ ] PerformanceIntegration 性能集成
  - [ ] 内存使用追踪和报告
  - [ ] FPS 监控和降级策略

- [ ] **资源清理系统**
  - [ ] ResourceCleanupSystem 资源清理
  - [ ] 定时清理任务调度
  - [ ] 内存泄漏检测
  - [ ] 组件卸载自动清理

#### 1.3 文件系统增强
- [ ] **FileCacheManager 文件缓存管理**
  - [ ] 文件内容缓存机制
  - [ ] 缓存失效策略
  - [ ] 缓存大小限制
  - [ ] 缓存命中率统计

- [x] **DataLoaderService 数据自动加载**
  - [x] 项目加载后自动预读 data 文件
  - [x] 缺失 Quests/Projectiles 自动创建默认文件
  - [x] 数据缓存与切换

- [x] **ScriptCacheManager 脚本缓存**
  - [x] 脚本内容缓存
  - [x] 时间戳管理
  - [ ] 缓存清理策略

- [x] **ScriptPathManager 脚本路径管理**
  - [x] 路径规范化处理
  - [ ] 路径兼容性处理 (ScriptPathCompat)
  - [x] 相对/绝对路径转换

---

### 阶段二：主题与 UI 系统 (高优先级)

#### 2.1 主题系统
- [x] **ThemeSystem 主题系统**
  - [x] 主题切换机制
  - [x] 主题预设管理（赛博朋克、明亮、暗黑）
  - [x] 强调色自定义
  - [x] 字体大小调节
  - [x] 紧凑模式支持

- [x] **SciFiThemeSystem 科幻主题**
  - [x] 动态背景效果 (DynamicBackground)
  - [x] 粒子动画系统
  - [x] 霓虹发光效果
  - [x] 扫描线效果

- [ ] **视觉特效**
  - [ ] PanelAnimator 面板动画
  - [ ] SidebarAnimator 侧边栏动画
  - [ ] 过渡动画库 (easing functions)
  - [x] 动画性能优化

#### 2.2 UI 组件完善
- [x] **通用 UI 组件**
  - [x] Toast 通知系统 (ToastManager)
  - [x] 输入对话框 (InputDialog)
  - [x] 确认对话框
  - [x] 错误覆盖层 (ErrorOverlay)
  - [ ] 加载指示器
  - [x] 虚拟滚动列表

- [ ] **布局组件**
  - [ ] 可拖拽面板分割器
  - [ ] 面板折叠/展开
  - [ ] 响应式布局断点
  - [ ] 全屏模式支持

---

### 阶段三：编辑器功能增强 (中优先级)

#### 3.1 Monaco 编辑器增强
- [x] **MonacoLoader 加载器**
  - [x] 懒加载机制
  - [ ] 多语言支持配置
  - [x] 主题同步
  - [ ] 工作区设置应用

- [ ] **MonacoInstanceManager 实例管理**
  - [ ] 编辑器实例池
  - [ ] 实例复用机制
  - [ ] 实例生命周期管理

- [x] **MonacoEnhancements 编辑器增强**
  - [x] 代码补全
  - [x] 语法高亮优化
  - [x] 代码折叠
  - [x]  minimap 配置
  - [x] 快捷键自定义

#### 3.2 脚本系统
- [ ] **脚本内容工具**
  - [ ] ScriptContentUtils 脚本内容处理
  - [ ] 时间戳提取和生成
  - [x] 代码格式化
  - [ ] 语法验证

- [x] **脚本路径处理**
  - [x] 路径解析和格式化
  - [x] 跨平台路径兼容
  - [ ] 脚本文件关联

---

### 阶段四：数据编辑功能 (中优先级)

#### 4.1 项目列表面板
- [x] **ItemList 增强**
  - [x] 虚拟滚动实现
  - [x] 搜索和过滤
  - [ ] 排序功能
  - [ ] 批量选择
  - [ ] 拖拽排序

#### 4.2 属性面板
- [ ] **PropertyPanel 完善**
  - [ ] 动态表单生成
  - [ ] 字段验证
  - [ ] 条件显示逻辑
  - [x] 自定义字段类型

#### 4.3 元数据面板
- [ ] **MetaDataPanel**
  - [ ] 元数据提取 (metaDataExtractor)
  - [ ] 元数据编辑表单
  - [ ] 自动补全

#### 4.4 笔记面板
- [ ] **NotePanel 完善**
  - [ ] 富文本编辑支持
  - [ ] Markdown 支持
  - [ ] 自动保存草稿
  - [x] 脏标记管理

---

### 阶段五：任务系统 (中优先级)

#### 5.1 任务编辑器
- [x] **QuestEditor 服务**
  - [x] 任务数据验证
  - [x] 任务模板管理
  - [x] 任务复制功能 (QuestCopyDialog)
  - [x] 任务依赖检查

#### 5.2 任务面板
- [x] **QuestPanel 完善**
  - [x] 任务目标可视化编辑
  - [x] 奖励编辑器
  - [x] 前置条件管理
  - [x] 任务链展示

#### 5.3 任务系统集成
- [x] **questSystem 数据集成**
  - [x] 开关变量引用
  - [x] 物品引用
  - [x] 角色引用
  - [x] 敌人引用

---

### 阶段六：弹道系统 (中优先级)

#### 6.1 弹道编辑器
- [x] **ProjectilePanel 完善**
  - [x] 轨迹节点编辑器
  - [x] 参数可视化调节
  - [x] 模板管理
  - [x] 实时预览优化

#### 6.2 轨迹计算
- [ ] **TrajectoryCalculator**
  - [ ] 弹道物理计算
  - [ ] 碰撞检测
  - [ ] 轨迹预测
  - [ ] 导出数据生成

#### 6.3 弹道预览
- [x] **ProjectileCanvas 增强**
  - [ ] 多轨迹同时预览
  - [x] 播放控制（播放/暂停/重置）
  - [x] 速度调节
  - [ ] 截图导出

---

### 阶段七：高级功能 (低优先级)

#### 7.1 自动链接管理
- [x] **自动链接系统**
  - [x] 数据项关联追踪
  - [x] 引用完整性检查
  - [x] 断链检测
  - [x] 自动修复建议

#### 7.2 序列化系统
- [x] **JSONSerializer**
  - [x] 自定义序列化规则
  - [x] 版本兼容性处理
  - [x] 增量保存
  - [ ] 备份机制

#### 7.3 日志系统
- [x] **Logger 服务**
  - [x] 分级日志（debug/info/warn/error）
  - [ ] 日志文件轮转
  - [x] 日志搜索和过滤
  - [ ] 错误上报

#### 7.4 更新系统
- [ ] **AutoUpdater**
  - [ ] 更新检查
  - [ ] 下载进度显示
  - [ ] 自动安装
  - [ ] 更新日志展示

---

### 阶段八：测试与质量 (持续进行)

#### 8.1 测试框架
- [x] **单元测试**
  - [x] Vitest 测试框架配置
  - [x] 核心模块测试覆盖
  - [ ] 属性测试 (fast-check)

- [ ] **集成测试**
  - [ ] 端到端测试
  - [ ] UI 自动化测试
  - [ ] 性能基准测试

#### 8.2 代码质量
- [x] **ESLint 配置**
  - [x] 规则配置
  - [x] 自动修复
  - [ ] 提交前检查

- [ ] **TypeScript 严格模式**
  - [ ] 严格类型检查
  - [ ] 类型覆盖率
  - [ ] 类型定义完善

---

## 文件结构映射

### 原项目 → 新项目 文件对应关系

| 原项目路径 | 新项目路径 | 状态 | 优先级 |
|-----------|-----------|------|--------|
| `src/main.ts` | `frontend/src/App.tsx` | 需重构 | 高 |
| `src/core/StateManager.ts` | `frontend/src/stores/editorStore.ts` | 需扩展 | 高 |
| `src/core/EventSystem.ts` | 新增 `frontend/src/core/EventSystem.ts` | 缺失 | 高 |
| `src/core/PanelManager.ts` | 新增 `frontend/src/core/PanelManager.ts` | 缺失 | 高 |
| `src/core/DOMManager.ts` | React DOM 管理 | 已替代 | - |
| `src/core/ThemeSystem.ts` | `frontend/src/styles/` + 配置 | 需完善 | 高 |
| `src/core/DynamicBackground.ts` | 新增 `frontend/src/components/effects/` | 缺失 | 中 |
| `src/panels/ItemList.ts` | `frontend/src/components/layout/LeftPanel.tsx` | 需增强 | 中 |
| `src/panels/PropertyPanel.ts` | `frontend/src/components/panels/PropertyPanel.tsx` | 需完善 | 中 |
| `src/panels/NotePanel.ts` | `frontend/src/components/panels/NotePanel.tsx` | 需完善 | 中 |
| `src/panels/QuestPanel.ts` | `frontend/src/components/panels/QuestPanel.tsx` | 需完善 | 中 |
| `src/panels/ProjectilePanel.ts` | `frontend/src/components/panels/ProjectilePanel.tsx` | 需完善 | 中 |
| `src/panels/ScriptPanel.ts` | `frontend/src/components/panels/CodeEditorPanel.tsx` | 需完善 | 中 |
| `src/panels/MetaDataPanel.ts` | 新增 `frontend/src/components/panels/MetaDataPanel.tsx` | 缺失 | 低 |
| `src/services/FileSystemService.ts` | `backend/services/file_service.go` | 已迁移 | - |
| `src/services/FileCacheManager.ts` | 新增 `frontend/src/services/FileCacheManager.ts` | 缺失 | 高 |
| `src/services/ScriptCacheManager.ts` | 新增 `frontend/src/services/ScriptCacheManager.ts` | 缺失 | 中 |
| `src/services/ScriptPathManager.ts` | 新增 `frontend/src/services/ScriptPathManager.ts` | 缺失 | 中 |
| `src/services/PerformanceMonitor.ts` | 新增 `frontend/src/services/PerformanceMonitor.ts` | 缺失 | 高 |
| `src/services/PerformanceOptimizer.ts` | 新增 `frontend/src/services/PerformanceOptimizer.ts` | 缺失 | 高 |
| `src/services/ResourceCleanupSystem.ts` | 新增 `frontend/src/services/ResourceCleanupSystem.ts` | 缺失 | 高 |
| `src/services/QuestEditor.ts` | `backend/services/quest_service.go` | 需扩展 | 中 |
| `src/services/MonacoLoader.ts` | 新增 `frontend/src/services/MonacoLoader.ts` | 缺失 | 中 |
| `src/services/MonacoInstanceManager.ts` | 新增 `frontend/src/services/MonacoInstanceManager.ts` | 缺失 | 中 |
| `src/services/MonacoEnhancements.ts` | 新增 `frontend/src/services/MonacoEnhancements.ts` | 缺失 | 中 |
| `src/services/ToastManager.ts` | 使用 Ant Design message | 已替代 | - |
| `src/services/ErrorOverlay.ts` | 新增错误边界组件 | 需实现 | 中 |
| `src/services/InputDialog.ts` | 使用 Ant Design Modal | 已替代 | - |
| `src/services/logger.ts` | 新增 `frontend/src/services/logger.ts` | 缺失 | 低 |
| `src/pools/ObjectPool.ts` | 新增 `frontend/src/pools/ObjectPool.ts` | 缺失 | 高 |
| `src/pools/DOMPools.ts` | 新增 `frontend/src/pools/DOMPools.ts` | 缺失 | 高 |
| `src/pools/EditorPools.ts` | 新增 `frontend/src/pools/EditorPools.ts` | 缺失 | 中 |
| `src/theme/ThemeManager.ts` | `frontend/src/stores/` + 配置 | 需完善 | 高 |
| `src/theme/SciFiThemeSystem.ts` | 新增 `frontend/src/theme/SciFiThemeSystem.ts` | 缺失 | 中 |
| `src/theme/effects/VisualEffects.ts` | 新增 `frontend/src/theme/effects/` | 缺失 | 中 |
| `src/utils/TrajectoryCalculator.ts` | 新增 `frontend/src/utils/TrajectoryCalculator.ts` | 缺失 | 中 |
| `src/utils/globalLoop.ts` | 使用 React hooks + RAF | 已替代 | - |
| `src/utils/animation.ts` | 新增 `frontend/src/utils/animation.ts` | 缺失 | 中 |
| `src/utils/easing.ts` | 新增 `frontend/src/utils/easing.ts` | 缺失 | 中 |
| `electron/main.ts` | `main.go` + `app.go` | 已迁移 | - |
| `electron/preload.ts` | Wails 自动生成绑定 | 已替代 | - |

---

## 技术债务与优化项

### 高优先级技术债务
1. **Vite 版本升级**: 从 v5.0.8 升级到 v7.3.0
2. **TypeScript 严格模式**: 启用严格类型检查
3. **PixiJS 版本统一**: 升级到新项目版本以匹配原项目

### 性能优化项
1. **虚拟滚动**: 大数据列表必须使用虚拟滚动
2. **代码分割**: 实现路由/面板级别的代码分割
3. **资源懒加载**: 图片、编辑器组件懒加载
4. **防抖节流**: 输入处理和搜索功能

### 代码质量项
1. **错误边界**: 添加 React Error Boundaries
2. **类型定义**: 完善 TypeScript 类型定义
3. **文档注释**: 添加 JSDoc 注释
4. **代码规范**: 统一代码风格

---

## 建议实施顺序

### 第一周：基础架构
1. 完善 StateManager (Zustand 扩展)
2. 实现 EventSystem
3. 实现 PanelManager
4. 添加基础性能监控

### 第二周：性能系统
1. 实现对象池系统
2. 实现资源清理系统
3. 添加文件缓存管理
4. 性能优化器基础版本

### 第三周：主题与 UI
1. 完善主题系统
2. 实现动态背景
3. 添加面板动画
4. 完善通用 UI 组件

### 第四周：编辑器增强
1. Monaco 编辑器增强
2. 脚本缓存系统
3. 完善各编辑面板

### 第五周：高级功能
1. 任务系统完善
2. 弹道系统增强
3. 自动链接管理

### 第六周：测试与优化
1. 单元测试覆盖
2. 性能基准测试
3. 代码质量检查
4. 文档完善

---

## 已完成清单

- [x] 基础项目架构 (Wails + React)
- [x] 基础状态管理 (Zustand)
- [x] 基础文件操作 (Go backend)
- [x] 工作区管理
- [x] 5 种编辑器模式基础框架
- [x] Monaco Editor 集成
- [x] PixiJS 弹道预览
- [x] 基础 UI 组件 (Ant Design)
- [x] 基础样式系统 (Tailwind)

---

## 备注

- 原项目使用原生 DOM 操作，新项目使用 React，部分功能需要重新设计实现方式
- 性能优化系统（对象池、虚拟滚动）是原项目的核心优势，必须完整迁移
- 主题系统是原项目的重要特色，需要保留赛博朋克风格
- 建议逐步迁移，先保证功能可用，再优化性能
- 测试覆盖率目标：核心模块 80%+

---

## 更新日志

### 2026-01-30
- 创建初始任务清单
- 完成项目结构对比分析
- 识别 60+ 项待完成任务
- 制定 6 周实施计划

---

**下一步行动**: 请从"阶段一：基础架构完善"开始实施，建议先实现 EventSystem 和 PanelManager。
