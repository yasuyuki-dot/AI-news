import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVirtualScroll, useVirtualScrollPerformance } from '../hooks/useVirtualScroll';
import { analyticsTrackingService } from '../services/analyticsTrackingService';
import NewsCard from './NewsCard';
import type { NewsItem } from '../types/news';
import './VirtualizedNewsList.css';

interface VirtualizedNewsListProps {
  news: NewsItem[];
  loading?: boolean;
  error?: string;
  height?: number;
  itemHeight?: number;
  showPerformanceMetrics?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const VirtualizedNewsList: React.FC<VirtualizedNewsListProps> = ({
  news,
  loading = false,
  error,
  height = 600,
  itemHeight = 280, // NewsCardの推定高さ
  showPerformanceMetrics = false,
  onLoadMore,
  hasMore = false,
}) => {
  const [containerHeight, setContainerHeight] = useState(height);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // パフォーマンス測定
  const {
    metrics,
    startPerformanceTracking,
    stopPerformanceTracking,
    recordRender,
  } = useVirtualScrollPerformance();

  // 動的アイテムサイズ推定
  const estimateSize = useCallback((index: number) => {
    const measuredSize = itemRefs.current.get(index)?.offsetHeight;
    if (measuredSize) {
      return measuredSize;
    }

    // カテゴリに基づく推定
    const item = news[index];
    if (!item) return itemHeight;

    // arXiv論文は通常より長い
    if (item.source === 'arXiv' || item.link.includes('arxiv.org')) {
      return itemHeight * 1.5;
    }

    // 説明文が長い記事
    if (item.description && item.description.length > 200) {
      return itemHeight * 1.2;
    }

    return itemHeight;
  }, [news, itemHeight]);

  // 仮想スクロールフック
  const virtualScroll = useVirtualScroll({
    itemHeight,
    containerHeight,
    overscan: 3,
    estimateSize,
  });

  const {
    virtualItems,
    totalSize,
    scrollElementProps,
    containerProps,
    isScrolling,
    scrollOffset,
    measureElement,
  } = virtualScroll(news);

  // コンテナサイズの自動調整
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // パフォーマンストラッキング
  useEffect(() => {
    if (showPerformanceMetrics) {
      startPerformanceTracking();
      return stopPerformanceTracking;
    }
  }, [showPerformanceMetrics, startPerformanceTracking, stopPerformanceTracking]);

  // レンダリング時間測定
  useEffect(() => {
    if (showPerformanceMetrics) {
      const renderTime = performance.now();
      recordRender(virtualItems.length, news.length, renderTime);
    }
  }, [virtualItems.length, news.length, showPerformanceMetrics, recordRender]);

  // 仮想スクロール機能使用のアナリティクス追跡
  useEffect(() => {
    analyticsTrackingService.trackVirtualScrollFeature('enable', {
      totalItems: news.length,
      visibleItems: virtualItems.length,
      containerHeight,
      itemHeight
    });
  }, [news.length, virtualItems.length, containerHeight, itemHeight]);

  // アイテム測定用の ref コールバック
  const getItemRef = useCallback((index: number) => (element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
      measureElement(index, element);
    } else {
      itemRefs.current.delete(index);
    }
  }, [measureElement]);

  // 無限スクロール処理
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    // 最後のアイテムが可視領域に近づいたら追加読み込み
    const threshold = totalSize * 0.8; // 80%スクロール時
    if (scrollOffset + containerHeight >= threshold) {
      onLoadMore();
    }
  }, [virtualItems, scrollOffset, containerHeight, totalSize, onLoadMore, hasMore]);

  // エラー状態
  if (error) {
    return (
      <div className="virtualized-news-error">
        <div className="error-content">
          <span className="error-icon">❌</span>
          <p>エラーが発生しました: {error}</p>
        </div>
      </div>
    );
  }

  // 空状態
  if (!loading && news.length === 0) {
    return (
      <div className="virtualized-news-empty">
        <div className="empty-content">
          <span className="empty-icon">📰</span>
          <h3>ニュースが見つかりませんでした</h3>
          <p>条件を変更して再度お試しください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="virtualized-news-container" ref={containerRef}>
      {/* パフォーマンスメトリクス */}
      {showPerformanceMetrics && (
        <div className="performance-metrics">
          <div className="metric">
            <span>表示中:</span> {metrics.visibleItems}/{metrics.totalItems}
          </div>
          <div className="metric">
            <span>FPS:</span> {metrics.scrollFPS}
          </div>
          <div className="metric">
            <span>レンダー:</span> {metrics.renderTime.toFixed(2)}ms
          </div>
          {metrics.memoryUsage > 0 && (
            <div className="metric">
              <span>メモリ:</span> {Math.round(metrics.memoryUsage / 1024 / 1024)}MB
            </div>
          )}
        </div>
      )}

      {/* スクロールインジケーター */}
      <div
        className="scroll-progress"
        style={{
          width: `${Math.min(100, (scrollOffset / Math.max(totalSize - containerHeight, 1)) * 100)}%`
        }}
      />

      {/* 仮想スクロールコンテナ */}
      <div
        {...scrollElementProps}
        className={`virtualized-scroll-container ${isScrolling ? 'scrolling' : ''}`}
      >
        <div {...containerProps}>
          {virtualItems.map(({ index, start, item }) => (
            <div
              key={`${(item as NewsItem).link}-${index}`}
              ref={getItemRef(index)}
              className="virtualized-item"
              style={{
                position: 'absolute',
                top: start,
                left: 0,
                right: 0,
                minHeight: itemHeight,
              }}
            >
              <NewsCard
                news={item as NewsItem}
                showSaveButton={true}
              />
            </div>
          ))}

          {/* ローディング状態 */}
          {loading && (
            <div className="virtualized-loading">
              <div className="loading-spinner">🔄</div>
              <p>ニュースを読み込み中...</p>
            </div>
          )}

          {/* 無限スクロール読み込み */}
          {hasMore && !loading && (
            <div className="load-more-indicator">
              <div className="loading-spinner">⏳</div>
              <p>さらに読み込み中...</p>
            </div>
          )}
        </div>
      </div>

      {/* アイテム数表示 */}
      <div className="item-count">
        {news.length > 0 && (
          <span>{news.length.toLocaleString()}件のニュース記事</span>
        )}
      </div>
    </div>
  );
};

// メモ化による最適化
export default React.memo(VirtualizedNewsList, (prevProps, nextProps) => {
  // newsの参照が変わった場合、またはloading状態が変わった場合のみ再レンダリング
  return (
    prevProps.news === nextProps.news &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.height === nextProps.height &&
    prevProps.hasMore === nextProps.hasMore
  );
});