import React, { useState, useEffect } from 'react';
import type { NewsItem } from '../types/news';
import type { SearchFilters } from '../services/searchService';
import { searchService } from '../services/searchService';
import { storageService } from '../services/storageService';
import { filterRecentNews } from '../utils/dateFilter';
import NewsCard from './NewsCard';

interface SearchPageProps {
  news: NewsItem[];
}

const SearchPage: React.FC<SearchPageProps> = ({ news }) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchResults, setSearchResults] = useState<NewsItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setSearchHistory(storageService.getSearchHistory());
  }, []);

  const handleSearch = (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // 検索実行
    const results = searchService.searchNews(news, searchQuery, filters);
    // 過去2週間以内の記事のみフィルタリング
    const recentResults = filterRecentNews(results);
    setSearchResults(recentResults);

    // 検索履歴に追加
    storageService.addSearchHistory(searchQuery);
    setSearchHistory(storageService.getSearchHistory());

    setIsSearching(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    // フィルターが変更された場合、現在の検索を再実行
    if (query.trim()) {
      const results = searchService.searchNews(news, query, updatedFilters);
      setSearchResults(results);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setFilters({});
    setSearchResults([]);
  };

  const clearHistory = () => {
    storageService.clearSearchHistory();
    setSearchHistory([]);
  };

  const getUniqueCategories = () => {
    return Array.from(new Set(news.map(item => item.category))).filter(Boolean);
  };

  const getUniqueSources = () => {
    return Array.from(new Set(news.map(item => item.source))).sort();
  };

  return (
    <div className="search-page">
      <div className="search-container">
        {/* 検索バー */}
        <div className="search-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ニュースを検索..."
              className="search-input"
            />
            <button
              onClick={() => handleSearch()}
              className="search-btn"
              disabled={isSearching}
            >
              {isSearching ? '🔍' : '検索'}
            </button>
            {query && (
              <button
                onClick={clearSearch}
                className="clear-btn"
                title="検索をクリア"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 詳細検索フィルター */}
        <div className="advanced-search">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="advanced-toggle"
          >
            詳細検索 {showAdvanced ? '▼' : '▶'}
          </button>

          {showAdvanced && (
            <div className="filters-container">
              <div className="filter-group">
                <label>カテゴリ:</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange({ category: e.target.value || undefined })}
                >
                  <option value="">すべて</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>ソース:</label>
                <select
                  value={filters.source || ''}
                  onChange={(e) => handleFilterChange({ source: e.target.value || undefined })}
                >
                  <option value="">すべて</option>
                  {getUniqueSources().map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>開始日:</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
                />
              </div>

              <div className="filter-group">
                <label>終了日:</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
                />
              </div>
            </div>
          )}
        </div>

        {/* 検索履歴 */}
        {searchHistory.length > 0 && !query && (
          <div className="search-history">
            <div className="history-header">
              <h3>検索履歴</h3>
              <button onClick={clearHistory} className="clear-history-btn">
                履歴をクリア
              </button>
            </div>
            <div className="history-items">
              {searchHistory.slice(0, 10).map((historyItem, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(historyItem)}
                  className="history-item"
                >
                  {historyItem}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 検索結果 */}
      <div className="search-results">
        {query && (
          <div className="results-header">
            <h2>
              「{query}」の検索結果 ({searchResults.length}件)
            </h2>
            {Object.keys(filters).some(key => filters[key as keyof SearchFilters]) && (
              <div className="active-filters">
                フィルター適用中:
                {filters.category && <span className="filter-tag">カテゴリ: {filters.category}</span>}
                {filters.source && <span className="filter-tag">ソース: {filters.source}</span>}
                {filters.dateFrom && <span className="filter-tag">開始: {filters.dateFrom}</span>}
                {filters.dateTo && <span className="filter-tag">終了: {filters.dateTo}</span>}
              </div>
            )}
          </div>
        )}

        {isSearching && (
          <div className="search-loading">
            <div className="search-spinner">🔍</div>
            <p>検索中...</p>
          </div>
        )}

        {!isSearching && query && searchResults.length === 0 && (
          <div className="no-results">
            <p>「{query}」に一致するニュースが見つかりませんでした。</p>
            <p>検索条件を変更してお試しください。</p>
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className="results-grid">
            {searchResults.map((article, index) => (
              <NewsCard
                key={`${article.link}-${index}`}
                article={article}
              />
            ))}
          </div>
        )}

        {!query && !isSearching && (
          <div className="search-welcome">
            <h2>🔍 ニュース検索</h2>
            <p>キーワードを入力してニュースを検索できます</p>
            <div className="search-tips">
              <h3>検索のコツ:</h3>
              <ul>
                <li>複数のキーワードをスペースで区切って入力</li>
                <li>詳細検索でカテゴリや期間を指定</li>
                <li>関連度の高い記事が上位に表示されます</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;