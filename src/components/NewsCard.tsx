import React, { useState, useEffect } from 'react';
import type { NewsItem } from '../types/news';
import { storageService } from '../services/storageService';
import { analyticsService } from '../services/analyticsService';
import { getDisplayTitle } from '../utils/titleSummarizer';
import TranslationModal from './TranslationModal';

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
  const [showTranslationModal, setShowTranslationModal] = useState(false);

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

    // 翻訳がある場合はモーダルを表示、ない場合は直接開く
    if (newsItem.originalTitle || newsItem.originalDescription) {
      setShowTranslationModal(true);
    } else {
      window.open(newsItem.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenOriginal = () => {
    window.open(newsItem.link, '_blank', 'noopener,noreferrer');
  };

  const handleOpenTranslated = () => {
    // 新しいウィンドウで記事を開き、翻訳のヒントを表示
    window.open(newsItem.link, '_blank', 'noopener,noreferrer');

    // 翻訳のヒントを表示（アラート方式）
    setTimeout(() => {
      alert(`📖 翻訳のヒント:

✅ Chromeの場合: ページ上で右クリック → "日本語に翻訳"
✅ Edgeの場合: アドレスバーの翻訳アイコンをクリック
✅ Firefoxの場合: アドオン「Firefox Translations」を使用
✅ Safariの場合: アドレスバーの翻訳アイコンをクリック

または、翻訳サイト（Google翻訳、DeepL等）にURLをコピーペーストしてください。`);
    }, 1000);
  };

  const handleCloseModal = () => {
    setShowTranslationModal(false);
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
    } catch {
      return dateString;
    }
  };

  const getCategoryIcon = (category?: string): string => {
    switch (category) {
      case 'AIエージェント': return '🤖';
      case '経済': return '💰';
      case 'テクノロジー': return '💻';
      case '社会': return '🏛️';
      case 'スポーツ': return '⚽';
      default: return '📰';
    }
  };

  const isArxivPaper = (): boolean => {
    return newsItem.source === 'arXiv' || newsItem.link.includes('arxiv.org');
  };

  const formatArxivDescription = (description: string): React.ReactElement[] => {
    const sections = description.split('\n\n').filter(section => section.trim());
    return sections.map((section, index) => {
      if (section.startsWith('👥 著者:')) {
        return (
          <div key={index} className="arxiv-authors">
            <span className="arxiv-label">👥 著者:</span>
            <span className="arxiv-value">{section.replace('👥 著者:', '').trim()}</span>
          </div>
        );
      }
      if (section.startsWith('🏷️ カテゴリ:')) {
        return (
          <div key={index} className="arxiv-categories">
            <span className="arxiv-label">🏷️ カテゴリ:</span>
            <span className="arxiv-value">{section.replace('🏷️ カテゴリ:', '').trim()}</span>
          </div>
        );
      }
      return (
        <p key={index} className="arxiv-abstract">{section}</p>
      );
    });
  };

  return (
    <>
      <div className={`news-card ${isArxivPaper() ? 'arxiv-paper' : ''}`} onClick={handleClick}>
        <div className="news-card-content">
          <div className="news-card-header">
            <div className="category-wrapper">
              <span className="category-icon">{getCategoryIcon(newsItem.category)}</span>
              <span className={`news-category category-${newsItem.category}`}>{newsItem.category || 'ニュース'}</span>
              {isArxivPaper() && <span className="arxiv-badge">📄 論文</span>}
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
          <h3
            className="news-card-title"
            title={newsItem.originalTitle || newsItem.title}
          >
            {getDisplayTitle(newsItem.title)}
            {newsItem.originalTitle && (
              <span className="translation-indicator" title={`原文: ${newsItem.originalTitle}`}>
                🌐
              </span>
            )}
          </h3>
          {newsItem.description && (
            <div className="news-card-description">
              {isArxivPaper() ?
                formatArxivDescription(newsItem.description) :
                <p>{newsItem.description}
                  {newsItem.originalDescription && (
                    <span className="translation-indicator" title={`原文: ${newsItem.originalDescription}`}>
                      🌐
                    </span>
                  )}
                </p>
              }
            </div>
          )}
          <div className="news-card-footer">
            <span className="news-date">{formatDate(newsItem.pubDate)}</span>
            <span className="read-more">{isArxivPaper() ? '論文を読む →' : '記事を読む →'}</span>
          </div>
        </div>
      </div>

      <TranslationModal
        isOpen={showTranslationModal}
        newsItem={newsItem}
        onClose={handleCloseModal}
        onOpenOriginal={handleOpenOriginal}
        onOpenTranslated={handleOpenTranslated}
      />
    </>
  );
};

export default NewsCard;