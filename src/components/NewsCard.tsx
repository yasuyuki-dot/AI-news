import React, { useState, useEffect } from 'react';
import type { NewsItem } from '../types/news';
import { storageService } from '../services/storageService';
import { analyticsService } from '../services/analyticsService';

interface NewsCardProps {
  article?: NewsItem; // 新しいプロパティ名
  news?: NewsItem; // 既存プロパティとの互換性
  showSaveButton?: boolean;
  onSaveSuccess?: () => void;
  onRemove?: (id: string) => void;
  savedId?: string; // 保存済み記事の場合のID
}

const NewsCard: React.FC<NewsCardProps> = ({
  article,
  news,
  showSaveButton = true,
  onSaveSuccess,
  onRemove,
  savedId
}) => {
  // 互換性のためにarticleまたはnewsを使用
  const newsItem = article || news;
  if (!newsItem) return null;

  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (showSaveButton) {
      setIsSaved(storageService.isArticleSaved(newsItem));
    }
  }, [newsItem, showSaveButton]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (saveLoading) return;

    setSaveLoading(true);

    try {
      if (isSaved) {
        // 保存解除（保存済み記事一覧からの場合）
        if (savedId && onRemove) {
          storageService.removeSavedArticle(savedId);
          onRemove(savedId);
        } else {
          // 通常の保存解除
          const savedArticles = storageService.getSavedArticles();
          const savedArticle = savedArticles.find(saved =>
            saved.title === newsItem.title && saved.link === newsItem.link
          );
          if (savedArticle) {
            storageService.removeSavedArticle(savedArticle.id);
          }
        }
        setIsSaved(false);
      } else {
        // 保存
        storageService.saveArticle(newsItem);
        setIsSaved(true);
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      }
    } catch (error) {
      console.error('保存操作に失敗しました:', error);
      alert(error instanceof Error ? error.message : '保存操作に失敗しました');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleClick = () => {
    // アクセス記録
    analyticsService.recordAccess(
      newsItem.source,
      newsItem.title,
      newsItem.category
    );

    window.open(newsItem.link, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return '1時間未満前';
      if (diffHours < 24) return `${diffHours}時間前`;
      if (diffDays < 7) return `${diffDays}日前`;

      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getCategoryIcon = (category?: string): string => {
    switch (category) {
      case '経済': return '💰';
      case '社会': return '🏛️';
      case 'テクノロジー': return '💻';
      case 'スポーツ': return '⚽';
      default: return '📰';
    }
  };

  return (
    <div className="news-card" onClick={handleClick}>
      <div className="news-card-content">
        <div className="news-card-header">
          <div className="category-wrapper">
            <span className="category-icon">{getCategoryIcon(newsItem.category)}</span>
            <span className={`news-category category-${newsItem.category}`}>{newsItem.category || 'ニュース'}</span>
          </div>
          <div className="card-actions">
            <span className="news-source">{newsItem.source}</span>
            {showSaveButton && (
              <button
                onClick={handleSave}
                className={`save-btn ${isSaved ? 'saved' : ''}`}
                disabled={saveLoading}
                title={isSaved ? '保存済み（クリックで削除）' : '記事を保存'}
              >
                {saveLoading ? '⏳' : (isSaved ? '❤️' : '🤍')}
              </button>
            )}
          </div>
        </div>
        <h3 className="news-card-title">{newsItem.title}</h3>
        {newsItem.description && (
          <p className="news-card-description">{newsItem.description}</p>
        )}
        <div className="news-card-footer">
          <span className="news-date">{formatDate(newsItem.pubDate)}</span>
          <span className="read-more">記事を読む →</span>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;