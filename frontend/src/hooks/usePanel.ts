/**
 * usePanel - React Hook for PanelManager
 * 提供响应式的面板状态管理
 */

import { useState, useEffect, useCallback } from 'react';
import { PanelManager, PanelState } from '../core/PanelManager';
import { EventSystem } from '../core/EventSystem';

interface UsePanelOptions {
  id: string;
  defaultVisible?: boolean;
  defaultActive?: boolean;
  defaultCollapsed?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  persistState?: boolean;
}

interface UsePanelReturn {
  state: PanelState | null;
  visible: boolean;
  active: boolean;
  collapsed: boolean;
  width?: number;
  height?: number;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  activate: () => void;
  setCollapsed: (collapsed?: boolean) => void;
  setSize: (width?: number, height?: number) => void;
}

/**
 * 使用面板状态的 Hook
 * 自动注册面板并监听状态变化
 */
export function usePanel(options: UsePanelOptions): UsePanelReturn {
  const {
    id,
    defaultVisible = true,
    defaultActive = false,
    defaultCollapsed = false,
    defaultWidth,
    defaultHeight,
    persistState = true,
  } = options;

  // 获取或注册面板
  const [state, setState] = useState<PanelState | null>(() => {
    if (!PanelManager.isRegistered(id)) {
      return PanelManager.register({
        id,
        defaultVisible,
        defaultActive,
        defaultCollapsed,
        defaultWidth,
        defaultHeight,
        persistState,
      });
    }
    return PanelManager.getState(id) || null;
  });

  // 监听面板状态变化
  useEffect(() => {
    const handlePanelChange = (...args: unknown[]) => {
      const changedId = args[0] as string;
      if (changedId === id) {
        setState(PanelManager.getState(id) || null);
      }
    };

    // 监听所有可能影响面板状态的事件
    const events = [
      'panel:shown',
      'panel:hidden',
      'panel:activated',
      'panel:deactivated',
      'panel:collapsed',
      'panel:resized',
    ];

    events.forEach((event) => {
      EventSystem.on(event, handlePanelChange as any);
    });

    return () => {
      events.forEach((event) => {
        EventSystem.off(event, handlePanelChange as any);
      });
    };
  }, [id]);

  // 操作函数
  const show = useCallback(() => {
    PanelManager.show(id);
  }, [id]);

  const hide = useCallback(() => {
    PanelManager.hide(id);
  }, [id]);

  const toggle = useCallback(() => {
    PanelManager.toggle(id);
  }, [id]);

  const activate = useCallback(() => {
    PanelManager.activate(id);
  }, [id]);

  const setCollapsed = useCallback((collapsed?: boolean) => {
    PanelManager.setCollapsed(id, collapsed);
  }, [id]);

  const setSize = useCallback((width?: number, height?: number) => {
    PanelManager.setSize(id, width, height);
  }, [id]);

  return {
    state,
    visible: state?.visible ?? defaultVisible,
    active: state?.active ?? defaultActive,
    collapsed: state?.collapsed ?? defaultCollapsed,
    width: state?.width ?? defaultWidth,
    height: state?.height ?? defaultHeight,
    show,
    hide,
    toggle,
    activate,
    setCollapsed,
    setSize,
  };
}

/**
 * 使用当前激活面板的 Hook
 */
export function useActivePanel(): string | null {
  const [activeId, setActiveId] = useState<string | null>(() =>
    PanelManager.getActivePanelId()
  );

  useEffect(() => {
    const handleActivated = (...args: unknown[]) => {
      const id = args[0] as string;
      setActiveId(id);
    };
    const handleDeactivated = () => setActiveId(PanelManager.getActivePanelId());

    EventSystem.on('panel:activated', handleActivated as any);
    EventSystem.on('panel:deactivated', handleDeactivated as any);

    return () => {
      EventSystem.off('panel:activated', handleActivated as any);
      EventSystem.off('panel:deactivated', handleDeactivated as any);
    };
  }, []);

  return activeId;
}

/**
 * 使用多个面板状态的 Hook
 */
export function usePanels(ids: string[]): (PanelState | null)[] {
  const [states, setStates] = useState<(PanelState | null)[]>(() =>
    ids.map((id) => PanelManager.getState(id) || null)
  );

  useEffect(() => {
    const handlePanelChange = () => {
      setStates(ids.map((id) => PanelManager.getState(id) || null));
    };

    const events = [
      'panel:shown',
      'panel:hidden',
      'panel:activated',
      'panel:deactivated',
    ];

    events.forEach((event) => {
      EventSystem.on(event, handlePanelChange as any);
    });

    return () => {
      events.forEach((event) => {
        EventSystem.off(event, handlePanelChange as any);
      });
    };
  }, [ids]);

  return states;
}
