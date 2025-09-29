import React, { useState, useEffect } from 'react';
import type { NewsItem } from '../types/news';
import NewsCard from './NewsCard';
import VirtualizedNewsList from './VirtualizedNewsList';
import { performanceService } from '../services/performanceService';
import { analyticsTrackingService } from '../services/analyticsTrackingService';

interface CategoryAllPageProps {
  category: string;
  news: NewsItem[];
  icon: string;
  onBack: () => void;
  enableVirtualScroll?: boolean;
  showPerformanceMetrics?: boolean;
}

const CategoryAllPage: React.FC<CategoryAllPageProps> = ({
  category,
  news,
  icon,
  onBack,
  enableVirtualScroll = true,
  showPerformanceMetrics = false
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'source' | 'title'>('date');
  const [useVirtualScroll, setUseVirtualScroll] = useState(enableVirtualScroll);
  const [showMetrics, setShowMetrics] = useState(showPerformanceMetrics);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // パフォーマンス監視
  useEffect(() => {
    if (showMetrics) {
      performanceService.startMonitoring();
      return () => performanceService.stopMonitoring();
    }
  }, [showMetrics]);

  // カテゴリ表示のアナリティクス追跡
  useEffect(() => {
    analyticsTrackingService.trackCategoryView(category, news.length);
  }, [category, news.length]);

  // 記事のソート処理
  const getSortedNews = () => {
    const sorted = [...news];

    switch (sortBy) {
      case 'date':
        return sorted.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      case 'source':
        return sorted.sort((a, b) => a.source.localeCompare(b.source));
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  };

  const sortedNews = getSortedNews();

  // ページネーション用の計算（通常表示モード用）
  const totalPages = Math.ceil(sortedNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentNews = sortedNews.slice(startIndex, startIndex + itemsPerPage);

  // ページ変更処理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ページ番号の計算
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  // ソース別統計
  const getSourceStats = () => {
    const stats: Record<string, number> = {};
    news.forEach(item => {
      stats[item.source] = (stats[item.source] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  // 表示モード切り替え
  const toggleVirtualScroll = () => {
    setUseVirtualScroll(!useVirtualScroll);
    setCurrentPage(1); // ページをリセット
  };

  // パフォーマンスレポート生成
  const generatePerformanceReport = () => {
    const report = performanceService.generateReport();
    console.log(report);
    alert(`パフォーマンスレポートがコンソールに出力されました。\n\n${report.slice(0, 200)}...`);
  };

  return (
    <div className="category-all-page">
      {/* ヘッダー */}
      <div className="category-all-header">
        <div className="category-all-title">
          <button onClick={onBack} className="back-btn">
            ← 戻る
          </button>
          <h1>
            <span className="category-icon">{icon}</span>
            {category}の全記事
          </h1>
          <div className="total-count">{news.length.toLocaleString()}件</div>
        </div>

        {/* 統計情報 */}
        <div className="source-stats">
          <h3>ソース別件数:</h3>
          <div className="stats-list">
            {getSourceStats().map(([source, count]) => (
              <div key={source} className="stat-item">
                <span className="stat-source">{source}</span>
                <span className="stat-count">{count}件</span>
              </div>
            ))}
          </div>
        </div>

        {/* コントロール */}
        <div className="category-all-controls">
          <div className="sort-control">
            <label>並び順:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'source' | 'title')}
              className="sort-select"
            >
              <option value="date">公開日時順</option>
              <option value="source">ソース順</option>
              <option value="title">タイトル順</option>
            </select>
          </div>

          {/* 表示モード切り替え */}
          <div className="display-mode-control">
            <label>
              <input
                type="checkbox"
                checked={useVirtualScroll}
                onChange={toggleVirtualScroll}
              />
              仮想スクロール
            </label>
            {useVirtualScroll && (
              <span className="virtual-scroll-badge">
                ⚡ 高速表示
              </span>
            )}
          </div>

          {/* パフォーマンス監視 */}
          <div className="performance-control">
            <label>
              <input
                type="checkbox"
                checked={showMetrics}
                onChange={(e) => setShowMetrics(e.target.checked)}
              />
              パフォーマンス監視
            </label>
            {showMetrics && (
              <button
                onClick={generatePerformanceReport}
                className="performance-report-btn"
                title="パフォーマンスレポートを生成"
              >
                📊 レポート
              </button>
            )}
          </div>

          {/* ページ情報（通常表示モード時） */}
          {!useVirtualScroll && (
            <div className="page-info">
              {news.length > 0 && (
                <span>
                  {startIndex + 1}-{Math.min(startIndex + itemsPerPage, news.length)} / {news.length.toLocaleString()}件
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 記事一覧 */}
      {news.length === 0 ? (
        <div className="no-articles">
          <div className="no-articles-icon">{icon}</div>
          <p>{category}カテゴリの記事がありません</p>
        </div>
      ) : useVirtualScroll ? (
        /* 仮想スクロール表示 */
        <div className="virtualized-container" data-total-items={sortedNews.length}>
          <VirtualizedNewsList
            news={sortedNews}
            height={600}
            itemHeight={280}
            showPerformanceMetrics={showMetrics}
          />
        </div>
      ) : (
        /* 通常のページネーション表示 */
        <>
          <div className="category-all-grid">
            {currentNews.map((article, index) => (
              <NewsCard
                key={`${article.link}-${startIndex + index}`}
                news={article}
                showSaveButton={true}
              />
            ))}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                ページ {currentPage} / {totalPages}
              </div>

              <div className="pagination-controls">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                  title="最初のページ"
                >
                  ≪
                </button>

                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                  title="前のページ"
                >
                  ‹
                </button>

                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                  title="次のページ"
                >
                  ›
                </button>

                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                  title="最後のページ"
                >
                  ≫
                </button>

                {/* ページジャンプ */}
                <div className="pagination-jump">
                  <span>ページ:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        handlePageChange(page);
                      }
                    }}
                    className="page-input"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* パフォーマンス比較情報 */}
      {showMetrics && (
        <div className="performance-comparison">
          <div className="comparison-info">
            <h4>💡 表示モード比較</h4>
            <div className="comparison-stats">
              <div className="stat-comparison">
                <span className="stat-label">仮想スクロール:</span>
                <span className="stat-value">
                  {useVirtualScroll ? '有効 ⚡' : '無効'}
                </span>
              </div>
              <div className="stat-comparison">
                <span className="stat-label">表示アイテム:</span>
                <span className="stat-value">
                  {useVirtualScroll ? '可視領域のみ' : `${Math.min(itemsPerPage, news.length)}件`}
                </span>
              </div>
              <div className="stat-comparison">
                <span className="stat-label">推定DOM効率:</span>
                <span className="stat-value">
                  {useVirtualScroll
                    ? `${Math.round((10 / Math.max(news.length, 1)) * 100)}% (約10要素)`
                    : `${Math.round((itemsPerPage / Math.max(news.length, 1)) * 100)}% (${itemsPerPage}要素)`
                  }
                </span>
              </div>
            </div>
            <p className="comparison-note">
              📈 大量記事表示時は仮想スクロールが効果的です
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryAllPage;