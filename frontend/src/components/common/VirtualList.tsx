import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight: number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  keyExtractor?: (item: T, index: number) => string | number;
}

/**
 * 虚拟滚动列表组件
 * 用于大数据列表的高效渲染
 */
function VirtualListComponent<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight,
  overscan = 5,
  className = '',
  onScroll,
  keyExtractor,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // 使用 useMemo 缓存计算结果
  const { totalHeight, startIndex, visibleItems, offsetY } = React.useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;
    
    return { totalHeight, startIndex, visibleItems, offsetY };
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  // 处理滚动 - 使用 RAF 节流
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      
      // 使用 requestAnimationFrame 节流
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = requestAnimationFrame(() => {
        setScrollTop(newScrollTop);
        onScroll?.(newScrollTop);
      });
    },
    [onScroll]
  );

  // 清理 RAF
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 滚动到指定索引
  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    },
    [itemHeight]
  );

  // 暴露 scrollToIndex 方法
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      (container as HTMLDivElement & { scrollToIndex?: (index: number) => void }).scrollToIndex = scrollToIndex;
    }
  }, [scrollToIndex]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const key = keyExtractor ? keyExtractor(item, actualIndex) : actualIndex;
            
            return (
              <div
                key={key}
                style={{
                  height: itemHeight,
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 使用 memo 包装组件
export const VirtualList = memo(VirtualListComponent) as <T>(props: VirtualListProps<T>) => React.ReactElement;

// 显式设置 displayName
(VirtualList as any).displayName = 'VirtualList';

/**
 * 使用虚拟滚动的 Hook - 优化版本
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // 使用 useMemo 缓存计算
  const result = React.useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;

    return {
      visibleItems,
      startIndex,
      endIndex,
      totalHeight,
      offsetY,
    };
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  // 节流滚动处理
  const handleScroll = useCallback((newScrollTop: number) => {
    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
    });
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...result,
    setScrollTop: handleScroll,
  };
}

export default VirtualList;
