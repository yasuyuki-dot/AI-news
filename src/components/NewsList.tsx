import React from 'react';
import NewsCard from './NewsCard';
import type { NewsItem } from '../types/news';

interface NewsListProps {
  news: NewsItem[];
  loading: boolean;
  error?: string;
}

const NewsList: React.FC<NewsListProps> = ({ news, loading, error }) => {
  if (loading) {
    return (
      <div className="news-list-loading">
        <div className="spinner"></div>
        <p>ニュースを読み込んでいます...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-list-error">
        <p>エラーが発生しました: {error}</p>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="news-list-empty">
        <p>ニュースが見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="news-list">
      {news.map((item, index) => (
        <NewsCard key={`${item.link}-${index}`} news={item} />
      ))}
    </div>
  );
};

export default NewsList;