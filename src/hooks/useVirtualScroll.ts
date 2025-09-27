import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export interface VirtualScrollOptions {
  itemHeight?: number; // 固定アイテム高さ（可変高さの場合は推定値）
  containerHeight?: number; // コンテナ高さ
  overscan?: number; // 可視領域外に追加でレンダリングするアイテム数
  estimateSize?: (index: number) => number; // 動的サイズ推定関数
}

export interface VirtualScrollResult<T> {
  virtualItems: Array<{
    index: number;
    start: number;
    size: number;
    item: T;
  }>;
  totalSize: number;
  scrollElementProps: {
    ref: (element: HTMLElement | null) => void;
    onScroll: (event: React.UIEvent<HTMLElement>) => void;
    style: React.CSSProperties;
  };
  containerProps: {
    style: React.CSSProperties;
  };
  isScrolling: boolean;
  scrollOffset: number;
  measureElement: (index: number, element: HTMLElement) => void;
}

export function useVirtualScroll<T>({
  itemHeight = 200,
  containerHeight = 600,
  overscan = 5,
  estimateSize,
}: VirtualScrollOptions = {}): (items: T[]) => VirtualScrollResult<T> {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [containerSize, setContainerSize] = useState(containerHeight);

  const scrollElementRef = useRef<HTMLElement | null>(null);
  const measuredSizes = useRef<Map<number, number>>(new Map());
  const scrollingTimeoutRef = useRef<number | undefined>(undefined);
  const observerRef = useRef<ResizeObserver | undefined>(undefined);

  // スクロール停止タイマー
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  // ResizeObserver for container size
  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setContainerSize(entry.contentRect.height);
        }
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const setScrollElement = useCallback((element: HTMLElement | null) => {
    if (scrollElementRef.current && observerRef.current) {
      observerRef.current.unobserve(scrollElementRef.current);
    }

    scrollElementRef.current = element;

    if (element && observerRef.current) {
      observerRef.current.observe(element);
      setContainerSize(element.clientHeight);
    }
  }, []);

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const newScrollOffset = target.scrollTop;

    setScrollOffset(newScrollOffset);
    setIsScrolling(true);

    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }

    scrollingTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  const measureElement = useCallback((index: number, element: HTMLElement) => {
    const height = element.getBoundingClientRect().height;
    measuredSizes.current.set(index, height);
  }, []);

  const getItemSize = useCallback((index: number): number => {
    // 測定済みサイズがあればそれを使用
    if (measuredSizes.current.has(index)) {
      return measuredSizes.current.get(index)!;
    }

    // カスタム推定関数があればそれを使用
    if (estimateSize) {
      return estimateSize(index);
    }

    // デフォルトの固定サイズ
    return itemHeight;
  }, [itemHeight, estimateSize]);

  return useCallback((items: T[]): VirtualScrollResult<T> => {
    const itemCount = items.length;

    // アイテムの位置とサイズを計算
    const itemOffsets = useMemo(() => {
      const offsets: number[] = [];
      let currentOffset = 0;

      for (let i = 0; i < itemCount; i++) {
        offsets[i] = currentOffset;
        currentOffset += getItemSize(i);
      }

      return offsets;
    }, [itemCount, getItemSize]);

    const totalSize = useMemo(() => {
      if (itemCount === 0) return 0;
      return itemOffsets[itemCount - 1] + getItemSize(itemCount - 1);
    }, [itemOffsets, itemCount, getItemSize]);

    // 可視範囲の計算
    const { startIndex, endIndex } = useMemo(() => {
      if (itemCount === 0) {
        return { startIndex: 0, endIndex: 0 };
      }

      const visibleStart = scrollOffset;
      const visibleEnd = scrollOffset + containerSize;

      // バイナリサーチで開始インデックスを見つける
      let start = 0;
      let end = itemCount - 1;

      while (start <= end) {
        const mid = Math.floor((start + end) / 2);
        const midOffset = itemOffsets[mid];
        const midSize = getItemSize(mid);

        if (midOffset + midSize <= visibleStart) {
          start = mid + 1;
        } else if (midOffset >= visibleEnd) {
          end = mid - 1;
        } else {
          start = mid;
          break;
        }
      }

      const startIdx = Math.max(0, start - overscan);

      // 終了インデックスを見つける
      let endIdx = startIdx;
      let accumulatedHeight = itemOffsets[startIdx];

      while (endIdx < itemCount && accumulatedHeight < visibleEnd + overscan * itemHeight) {
        accumulatedHeight += getItemSize(endIdx);
        endIdx++;
      }

      return {
        startIndex: startIdx,
        endIndex: Math.min(itemCount - 1, endIdx + overscan)
      };
    }, [scrollOffset, containerSize, itemCount, itemOffsets, overscan, getItemSize, itemHeight]);

    // 仮想アイテムの生成
    const virtualItems = useMemo(() => {
      const items_result: Array<{
        index: number;
        start: number;
        size: number;
        item: T;
      }> = [];

      for (let i = startIndex; i <= endIndex; i++) {
        if (i >= 0 && i < itemCount) {
          items_result.push({
            index: i,
            start: itemOffsets[i],
            size: getItemSize(i),
            item: items[i]
          });
        }
      }

      return items_result;
    }, [startIndex, endIndex, itemCount, items, itemOffsets, getItemSize]);

    return {
      virtualItems,
      totalSize,
      scrollElementProps: {
        ref: setScrollElement,
        onScroll: handleScroll,
        style: {
          height: containerSize,
          overflow: 'auto',
          position: 'relative',
        },
      },
      containerProps: {
        style: {
          height: totalSize,
          position: 'relative',
        },
      },
      isScrolling,
      scrollOffset,
      measureElement,
    };
  }, [
    containerSize,
    setScrollElement,
    handleScroll,
    measureElement,
    getItemSize,
    overscan,
    itemHeight,
    scrollOffset,
    isScrolling,
  ]);
}

// パフォーマンス測定用のフック
export function useVirtualScrollPerformance() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    visibleItems: 0,
    totalItems: 0,
    memoryUsage: 0,
    scrollFPS: 0,
  });

  const lastFrameTime = useRef(performance.now());
  const frameCount = useRef(0);
  const fpsInterval = useRef<number | undefined>(undefined);

  const startPerformanceTracking = useCallback(() => {
    // FPS測定開始
    fpsInterval.current = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastFrameTime.current;
      const fps = Math.round((frameCount.current * 1000) / elapsed);

      setMetrics(prev => ({ ...prev, scrollFPS: fps }));

      frameCount.current = 0;
      lastFrameTime.current = now;
    }, 1000);
  }, []);

  const stopPerformanceTracking = useCallback(() => {
    if (fpsInterval.current) {
      clearInterval(fpsInterval.current);
    }
  }, []);

  const recordRender = useCallback((visibleCount: number, totalCount: number, renderTime: number) => {
    frameCount.current++;

    setMetrics(prev => ({
      ...prev,
      renderTime,
      visibleItems: visibleCount,
      totalItems: totalCount,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
    }));
  }, []);

  useEffect(() => {
    return () => stopPerformanceTracking();
  }, [stopPerformanceTracking]);

  return {
    metrics,
    startPerformanceTracking,
    stopPerformanceTracking,
    recordRender,
  };
}