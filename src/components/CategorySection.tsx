import React from 'react';
import type { NewsItem } from '../types/news';
import NewsCard from './NewsCard';

interface CategorySectionProps {
  category: string;
  news: NewsItem[];
  icon: string;
  onShowAll?: (category: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  news,
  icon,
  onShowAll
}) => {
  if (news.length === 0) return null;

  const handleShowAll = () => {
    if (onShowAll) {
      onShowAll(category);
    }
  };

  return (
    <div className="category-section">
      <div className="category-header">
        <h2 className="category-title">
          <span className="category-icon">{icon}</span>
          {category}
          <span className="news-count">({news.length}件)</span>
        </h2>
        {news.length > 6 && onShowAll && (
          <button
            onClick={handleShowAll}
            className="view-all-btn"
            title={`${category}の全記事を見る`}
          >
            全記事を見る →
          </button>
        )}
      </div>

      <div className="news-grid">
        {news.slice(0, 6).map((item, index) => (
          <NewsCard
            key={`${item.link}-${index}`}
            news={item}
            showSaveButton={true}
          />
        ))}
      </div>

      {news.length > 6 && (
        <div className="show-more">
          {onShowAll ? (
            <button
              onClick={handleShowAll}
              className="more-news-btn"
              title={`${category}の残り${news.length - 6}件の記事を見る`}
            >
              <span className="more-icon">📰</span>
              <span className="more-text">他 {news.length - 6}件のニュース</span>
              <span className="more-arrow">→</span>
            </button>
          ) : (
            <span className="more-news-text">他 {news.length - 6}件のニュース</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySection;