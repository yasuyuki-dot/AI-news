import React, { useState } from 'react';
import type { NewsItem } from '../types/news';
import NewsCard from './NewsCard';

interface CategoryAllPageProps {
  category: string;
  news: NewsItem[];
  icon: string;
  onBack: () => void;
}

const CategoryAllPage: React.FC<CategoryAllPageProps> = ({
  category,
  news,
  icon,
  onBack
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'source' | 'title'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
  const totalPages = Math.ceil(sortedNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentNews = sortedNews.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // 調整：最初の方のページの場合
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const getSourceStats = () => {
    const stats: Record<string, number> = {};
    news.forEach(item => {
      stats[item.source] = (stats[item.source] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
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
          <div className="total-count">{news.length}件</div>
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

          <div className="page-info">
            {news.length > 0 && (
              <span>
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, news.length)} / {news.length}件
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 記事一覧 */}
      {news.length === 0 ? (
        <div className="no-articles">
          <div className="no-articles-icon">{icon}</div>
          <p>{category}カテゴリの記事がありません</p>
        </div>
      ) : (
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
              </div>

              <div className="pagination-jump">
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
                <span>/ {totalPages}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryAllPage;