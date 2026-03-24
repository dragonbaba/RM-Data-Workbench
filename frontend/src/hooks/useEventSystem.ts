/**
 * useEventSystem - React Hook for EventSystem
 * 在组件中方便地使用事件系统
 */

import { useEffect, useCallback, useRef } from 'react';
import { EventSystem, EventHandler, AppEvent } from '../core/EventSystem';

interface UseEventOptions {
  once?: boolean;
  context?: unknown;
}

/**
 * 监听事件的 Hook
 * @param event 事件名称
 * @param handler 事件处理器
 * @param options 选项
 */
export function useEvent(
  event: string | AppEvent,
  handler: EventHandler,
  options: UseEventOptions = {}
): void {
  const { once = false, context } = options;
  const handlerRef = useRef(handler);

  // 保持 handler 引用最新
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const wrappedHandler: EventHandler = (...args) => {
      handlerRef.current(...args);
    };

    if (once) {
      EventSystem.once(event, wrappedHandler, context);
    } else {
      EventSystem.on(event, wrappedHandler, context);
    }

    return () => {
      EventSystem.off(event, wrappedHandler);
    };
  }, [event, once, context]);
}

/**
 * 监听多个事件的 Hook
 * @param events 事件名称数组
 * @param handler 事件处理器
 * @param options 选项
 */
export function useEvents(
  events: (string | AppEvent)[],
  handler: EventHandler,
  options: UseEventOptions = {}
): void {
  const { once = false, context } = options;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const wrappedHandler: EventHandler = (...args) => {
      handlerRef.current(...args);
    };

    events.forEach((event) => {
      if (once) {
        EventSystem.once(event, wrappedHandler, context);
      } else {
        EventSystem.on(event, wrappedHandler, context);
      }
    });

    return () => {
      events.forEach((event) => {
        EventSystem.off(event, wrappedHandler);
      });
    };
  }, [events, once, context]);
}

/**
 * 获取事件发射函数的 Hook
 * @returns 发射事件的函数
 */
export function useEmit(): (event: string | AppEvent, ...args: unknown[]) => void {
  return useCallback((event: string | AppEvent, ...args: unknown[]) => {
    EventSystem.emit(event, ...args);
  }, []);
}

/**
 * 使用命名空间事件的 Hook
 * @param namespace 命名空间前缀
 * @returns 相关操作函数
 */
export function useNamespace(namespace: string) {
  const emit = useCallback(
    (event: string, ...args: unknown[]) => {
      EventSystem.emit(`${namespace}:${event}`, ...args);
    },
    [namespace]
  );

  const on = useCallback(
    (event: string, handler: EventHandler, options?: UseEventOptions) => {
      useEvent(`${namespace}:${event}`, handler, options);
    },
    [namespace]
  );

  const off = useCallback(
    (event?: string) => {
      if (event) {
        EventSystem.off(`${namespace}:${event}`);
      } else {
        EventSystem.offNamespace(namespace);
      }
    },
    [namespace]
  );

  return { emit, on, off };
}
