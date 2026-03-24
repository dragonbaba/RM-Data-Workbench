/**
 * PanelManager - 面板管理器
 * 管理面板生命周期、状态和切换动画
 * 
 * 用于替代原项目的 PanelManager，适配 React 架构
 */

import { EventSystem } from './EventSystem';

// ============ 类型定义 ============

/** 面板状态 */
export interface PanelState {
  id: string;
  visible: boolean;
  active: boolean;
  collapsed: boolean;
  width?: number;
  height?: number;
}

/** 面板配置 */
export interface PanelConfig {
  id: string;
  defaultVisible?: boolean;
  defaultActive?: boolean;
  defaultCollapsed?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  persistState?: boolean;
}

/** 面板切换动画配置 */
export interface PanelAnimation {
  duration: number;
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

// ============ PanelManager ============

/**
 * 面板管理器 - 单例模式
 * 管理所有面板的状态和生命周期
 */
class PanelManagerClass {
  /** 面板状态映射 */
  private panels: Map<string, PanelState> = new Map();
  
  /** 面板配置映射 */
  private configs: Map<string, PanelConfig> = new Map();
  
  /** 当前激活的面板 ID */
  private activePanelId: string | null = null;
  
  /** 存储键 */
  private readonly STORAGE_KEY = 'rpg-editor-panels';

  /**
   * 注册面板
   * @param config 面板配置
   */
  register(config: PanelConfig): PanelState {
    const { 
      id, 
      defaultVisible = true, 
      defaultActive = false,
      defaultCollapsed = false,
      defaultWidth,
      defaultHeight,
      persistState = true 
    } = config;

    // 检查是否已注册
    if (this.panels.has(id)) {
      console.warn(`[PanelManager] Panel "${id}" is already registered`);
      return this.panels.get(id)!;
    }

    // 尝试从存储恢复状态
    const savedState = persistState ? this.loadPanelState(id) : null;
    
    const state: PanelState = {
      id,
      visible: savedState?.visible ?? defaultVisible,
      active: savedState?.active ?? defaultActive,
      collapsed: savedState?.collapsed ?? defaultCollapsed,
      width: savedState?.width ?? defaultWidth,
      height: savedState?.height ?? defaultHeight,
    };

    this.panels.set(id, state);
    this.configs.set(id, config);

    // 如果是第一个面板且需要激活，则激活它
    if (defaultActive && !this.activePanelId) {
      this.activePanelId = id;
    }

    EventSystem.emit('panel:registered', id, state);
    return state;
  }

  /**
   * 注销面板
   * @param id 面板 ID
   */
  unregister(id: string): void {
    const state = this.panels.get(id);
    if (!state) return;

    // 保存状态
    const config = this.configs.get(id);
    if (config?.persistState) {
      this.savePanelState(id, state);
    }

    this.panels.delete(id);
    this.configs.delete(id);

    if (this.activePanelId === id) {
      this.activePanelId = null;
    }

    EventSystem.emit('panel:unregistered', id);
  }

  /**
   * 显示面板
   * @param id 面板 ID
   */
  show(id: string): void {
    const state = this.panels.get(id);
    if (!state || state.visible) return;

    state.visible = true;
    EventSystem.emit('panel:shown', id, state);
    this.persistIfNeeded(id);
  }

  /**
   * 隐藏面板
   * @param id 面板 ID
   */
  hide(id: string): void {
    const state = this.panels.get(id);
    if (!state || !state.visible) return;

    state.visible = false;
    state.active = false;
    
    if (this.activePanelId === id) {
      this.activePanelId = null;
    }

    EventSystem.emit('panel:hidden', id, state);
    this.persistIfNeeded(id);
  }

  /**
   * 切换面板可见性
   * @param id 面板 ID
   */
  toggle(id: string): void {
    const state = this.panels.get(id);
    if (!state) return;

    if (state.visible) {
      this.hide(id);
    } else {
      this.show(id);
    }
  }

  /**
   * 激活面板
   * @param id 面板 ID
   */
  activate(id: string): void {
    const state = this.panels.get(id);
    if (!state) return;

    // 取消之前激活的面板
    if (this.activePanelId && this.activePanelId !== id) {
      const prevState = this.panels.get(this.activePanelId);
      if (prevState) {
        prevState.active = false;
        EventSystem.emit('panel:deactivated', this.activePanelId, prevState);
      }
    }

    // 激活新面板
    state.active = true;
    state.visible = true;
    this.activePanelId = id;

    EventSystem.emit('panel:activated', id, state);
    this.persistIfNeeded(id);
  }

  /**
   * 折叠/展开面板
   * @param id 面板 ID
   * @param collapsed 是否折叠，不传则切换
   */
  setCollapsed(id: string, collapsed?: boolean): void {
    const state = this.panels.get(id);
    if (!state) return;

    state.collapsed = collapsed !== undefined ? collapsed : !state.collapsed;
    EventSystem.emit('panel:collapsed', id, state.collapsed, state);
    this.persistIfNeeded(id);
  }

  /**
   * 设置面板尺寸
   * @param id 面板 ID
   * @param width 宽度
   * @param height 高度
   */
  setSize(id: string, width?: number, height?: number): void {
    const state = this.panels.get(id);
    if (!state) return;

    if (width !== undefined) state.width = width;
    if (height !== undefined) state.height = height;
    
    EventSystem.emit('panel:resized', id, { width, height }, state);
    this.persistIfNeeded(id);
  }

  /**
   * 获取面板状态
   * @param id 面板 ID
   */
  getState(id: string): PanelState | undefined {
    return this.panels.get(id);
  }

  /**
   * 获取所有面板状态
   */
  getAllStates(): PanelState[] {
    return Array.from(this.panels.values());
  }

  /**
   * 获取当前激活的面板 ID
   */
  getActivePanelId(): string | null {
    return this.activePanelId;
  }

  /**
   * 检查面板是否已注册
   * @param id 面板 ID
   */
  isRegistered(id: string): boolean {
    return this.panels.has(id);
  }

  /**
   * 检查面板是否可见
   * @param id 面板 ID
   */
  isVisible(id: string): boolean {
    return this.panels.get(id)?.visible ?? false;
  }

  /**
   * 检查面板是否激活
   * @param id 面板 ID
   */
  isActive(id: string): boolean {
    return this.panels.get(id)?.active ?? false;
  }

  /**
   * 清除所有面板
   */
  clear(): void {
    // 保存所有需要持久化的面板状态
    for (const [id, state] of this.panels) {
      const config = this.configs.get(id);
      if (config?.persistState) {
        this.savePanelState(id, state);
      }
    }

    this.panels.clear();
    this.configs.clear();
    this.activePanelId = null;
    
    EventSystem.emit('panel:cleared');
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): { 
    panels: { id: string; visible: boolean; active: boolean }[];
    activePanelId: string | null;
  } {
    return {
      panels: this.getAllStates().map(s => ({
        id: s.id,
        visible: s.visible,
        active: s.active,
      })),
      activePanelId: this.activePanelId,
    };
  }

  // ============ 私有方法 ============

  /**
   * 从 localStorage 加载面板状态
   */
  private loadPanelState(id: string): Partial<PanelState> | null {
    try {
      const saved = localStorage.getItem(`${this.STORAGE_KEY}-${id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  /**
   * 保存面板状态到 localStorage
   */
  private savePanelState(id: string, state: PanelState): void {
    try {
      const { id: _, ...stateToSave } = state;
      localStorage.setItem(`${this.STORAGE_KEY}-${id}`, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn(`[PanelManager] Failed to save panel state for "${id}":`, error);
    }
  }

  /**
   * 如果需要则持久化面板状态
   */
  private persistIfNeeded(id: string): void {
    const config = this.configs.get(id);
    const state = this.panels.get(id);
    if (config?.persistState && state) {
      this.savePanelState(id, state);
    }
  }
}

// ============ 导出单例 ============

/** 全局面板管理器实例 */
export const PanelManager = new PanelManagerClass();

export default PanelManager;
