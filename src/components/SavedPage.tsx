import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import type { SavedNewsItem } from '../services/storageService';
import NewsCard from './NewsCard';

const SavedPage: React.FC = () => {
  const [savedArticles, setSavedArticles] = useState<SavedNewsItem[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'category' | 'source'>('date');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedArticles();
  }, []);

  const loadSavedArticles = () => {
    setLoading(true);
    try {
      const saved = storageService.getSavedArticles();
      setSavedArticles(saved);
    } catch (error) {
      console.error('保存記事の読み込みに失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (id: string) => {
    setSavedArticles(prev => prev.filter(article => article.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('すべての保存記事を削除しますか？この操作は元に戻せません。')) {
      const articleIds = savedArticles.map(article => article.id);
      articleIds.forEach(id => storageService.removeSavedArticle(id));
      setSavedArticles([]);
    }
  };

  const getFilteredAndSortedArticles = () => {
    let filtered = [...savedArticles];

    // カテゴリフィルター
    if (filterCategory) {
      filtered = filtered.filter(article => article.category === filterCategory);
    }

    // ソート
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        break;
      case 'category':
        filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        break;
      case 'source':
        filtered.sort((a, b) => a.source.localeCompare(b.source));
        break;
    }

    return filtered;
  };

  const getUniqueCategories = () => {
    const categories = Array.from(new Set(
      savedArticles.map(article => article.category).filter(Boolean)
    ));
    return categories.sort();
  };

  const formatSavedDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    savedArticles.forEach(article => {
      const category = article.category || 'その他';
      stats[category] = (stats[category] || 0) + 1;
    });
    return stats;
  };

  if (loading) {
    return (
      <div className="saved-page">
        <div className="loading-section">
          <div className="loading-spinner">📚</div>
          <p>保存記事を読み込み中...</p>
        </div>
      </div>
    );
  }

  const filteredArticles = getFilteredAndSortedArticles();
  const categoryStats = getCategoryStats();

  return (
    <div className="saved-page">
      <div className="saved-header">
        <div className="saved-title">
          <h1>💾 保存記事</h1>
          <div className="saved-count">
            {filteredArticles.length !== savedArticles.length
              ? `${filteredArticles.length} / ${savedArticles.length}件`
              : `${savedArticles.length}件`
            }
          </div>
        </div>

        {savedArticles.length > 0 && (
          <>
            {/* 統計情報 */}
            <div className="saved-stats">
              <div className="stats-grid">
                {Object.entries(categoryStats).map(([category, count]) => (
                  <div key={category} className="stat-item">
                    <span className="stat-category">{category}</span>
                    <span className="stat-count">{count}件</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作パネル */}
            <div className="saved-controls">
              <div className="control-group">
                <label>ソート:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'category' | 'source')}
                  className="sort-select"
                >
                  <option value="date">保存日時順</option>
                  <option value="category">カテゴリ順</option>
                  <option value="source">ソース順</option>
                </select>
              </div>

              <div className="control-group">
                <label>カテゴリ:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="">すべて</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleClearAll}
                className="clear-all-btn"
                disabled={savedArticles.length === 0}
              >
                すべて削除
              </button>
            </div>
          </>
        )}
      </div>

      <div className="saved-content">
        {savedArticles.length === 0 ? (
          <div className="empty-saved">
            <div className="empty-icon">📚</div>
            <h2>保存記事がありません</h2>
            <p>気になる記事があったら❤️ボタンで保存してみましょう</p>
            <div className="empty-tips">
              <h3>保存機能について:</h3>
              <ul>
                <li>記事カードの❤️ボタンで保存・削除</li>
                <li>ブラウザのローカルストレージに保存</li>
                <li>カテゴリやソース別でフィルタリング可能</li>
                <li>保存日時でソート可能</li>
              </ul>
            </div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="no-filtered-results">
            <p>選択した条件に一致する記事がありません</p>
            <button
              onClick={() => {
                setFilterCategory('');
                setSortBy('date');
              }}
              className="reset-filters-btn"
            >
              フィルターをリセット
            </button>
          </div>
        ) : (
          <div className="saved-grid">
            {filteredArticles.map((article) => (
              <div key={article.id} className="saved-item">
                <NewsCard
                  article={article}
                  showSaveButton={true}
                  onRemove={handleRemove}
                  savedId={article.id}
                />
                <div className="saved-meta">
                  <span className="saved-date">
                    💾 {formatSavedDate(article.savedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPage;