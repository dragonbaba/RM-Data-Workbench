/**
 * EventSystem - 事件系统
 * 发布/订阅模式，支持命名空间与一次性监听
 * 
 * 用于跨组件通信，替代原项目的 EventSystem
 */

// ============ 类型定义 ============

/** 事件处理器类型 */
export type EventHandler = (...args: unknown[]) => void;

/** 事件处理器条目 */
interface HandlerEntry {
  handler: EventHandler;
  context: unknown;
  once: boolean;
}

/** 预定义应用事件 */
export type AppEvent =
  | 'file:loaded'
  | 'file:saved'
  | 'file:error'
  | 'file:dirty'
  | 'file:clean'
  | 'item:selected'
  | 'item:updated'
  | 'script:selected'
  | 'script:saved'
  | 'mode:changed'
  | 'theme:changed'
  | 'config:updated'
  | 'editor:ready'
  | 'editor:flush-pending-draft'
  | 'editor:content-changed'
  | 'panel:shown'
  | 'panel:hidden'
  | 'toast:show'
  | 'toast:hide'
  | 'loading:start'
  | 'loading:end'
  | 'state:changed';

// ============ EventSystem ============

/**
 * 事件系统 - 单例模式
 * 提供发布/订阅功能，支持命名空间和一次性监听
 */
class EventSystemClass {
  /** 事件处理器映射 - 使用 Map 存储，键为事件名 */
  private handlers: Map<string, HandlerEntry[]> = new Map();

  /**
   * 注册事件监听
   * @param event 事件名称（支持命名空间，如 'file:loaded'）
   * @param handler 处理函数
   * @param context 可选的上下文
   */
  on(event: string, handler: EventHandler, context?: unknown): this {
    let entries = this.handlers.get(event);
    if (!entries) {
      entries = [];
      this.handlers.set(event, entries);
    }

    // 检查是否已存在相同的处理器
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.handler === handler && entry.context === context) {
        return this; // 已存在不重复添加
      }
    }

    entries.push({ handler, context, once: false });
    return this;
  }

  /**
   * 注册一次性事件监听
   * @param event 事件名称
   * @param handler 处理函数
   * @param context 可选的上下文
   */
  once(event: string, handler: EventHandler, context?: unknown): this {
    let entries = this.handlers.get(event);
    if (!entries) {
      entries = [];
      this.handlers.set(event, entries);
    }

    entries.push({ handler, context, once: true });
    return this;
  }

  /**
   * 移除事件监听
   * @param event 事件名称
   * @param handler 可选，指定要移除的处理函数；不指定则移除事件的所有监听
   */
  off(event: string, handler?: EventHandler): this {
    const entries = this.handlers.get(event);
    if (!entries) return this;

    if (!handler) {
      // 移除该事件的所有监听
      entries.length = 0;
      this.handlers.delete(event);
    } else {
      // 移除指定的监听
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].handler === handler) {
          entries.splice(i, 1);
        }
      }

      if (entries.length === 0) {
        this.handlers.delete(event);
      }
    }

    return this;
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args 传给处理函数的参数
   */
  emit(event: string, ...args: unknown[]): this {
    const entries = this.handlers.get(event);
    if (!entries || entries.length === 0) return this;

    // 使用倒序遍历，允许处理器中移除监听
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!entry) continue;

      try {
        if (entry.context) {
          entry.handler.apply(entry.context, args);
        } else {
          entry.handler(...args);
        }
      } catch (error) {
        console.error(`[EventSystem] Error in handler for "${event}":`, error);
      }

      // 一次性监听在执行后移除
      if (entry.once) {
        entries.splice(i, 1);
      }
    }

    if (entries.length === 0) {
      this.handlers.delete(event);
    }

    return this;
  }

  /**
   * 检查是否有指定事件的监听
   * @param event 事件名称
   */
  has(event: string): boolean {
    const entries = this.handlers.get(event);
    return entries !== undefined && entries.length > 0;
  }

  /**
   * 获取指定事件的监听数量
   * @param event 事件名称
   */
  listenerCount(event: string): number {
    const entries = this.handlers.get(event);
    return entries ? entries.length : 0;
  }

  /**
   * 获取所有已注册的事件名
   */
  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 移除指定命名空间下的所有事件
   * @param namespace 命名空间前缀（如 'file' 会移除 'file:loaded', 'file:saved' 等）
   */
  offNamespace(namespace: string): this {
    const prefix = namespace + ':';
    const keysToDelete: string[] = [];

    for (const key of this.handlers.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.off(key);
    }

    return this;
  }

  /**
   * 清除所有事件监听
   */
  clear(): this {
    this.handlers.clear();
    return this;
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): { event: string; count: number }[] {
    const info: { event: string; count: number }[] = [];
    for (const [event, entries] of this.handlers) {
      info.push({ event, count: entries.length });
    }
    return info;
  }
}

// ============ 便捷函数 ============

/**
 * 创建带类型的事件发射器
 * 用于特定模块的类型安全事件
 */
export function createTypedEmitter<T extends Record<string, unknown[]>>() {
  const events = new EventSystemClass();

  return {
    on<K extends keyof T>(event: K, handler: (...args: T[K]) => void, context?: unknown) {
      events.on(event as string, handler as EventHandler, context);
      return this;
    },

    once<K extends keyof T>(event: K, handler: (...args: T[K]) => void, context?: unknown) {
      events.once(event as string, handler as EventHandler, context);
      return this;
    },

    off<K extends keyof T>(event: K, handler?: (...args: T[K]) => void) {
      events.off(event as string, handler as EventHandler);
      return this;
    },

    emit<K extends keyof T>(event: K, ...args: T[K]) {
      events.emit(event as string, ...args);
      return this;
    },

    clear() {
      events.clear();
      return this;
    },
  };
}

// ============ 导出单例 ============

/** 全局事件系统实例 */
export const EventSystem = new EventSystemClass();

export default EventSystem;
