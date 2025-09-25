import { useState, useEffect } from 'react';
import type { NewsItem } from './types/news';
import { NEWS_SOURCES } from './types/news';
import { rssService } from './services/rssService';
import { storageService } from './services/storageService';
import CategorySection from './components/CategorySection';
import CategoryAllPage from './components/CategoryAllPage';
import SearchPage from './components/SearchPage';
import SavedPage from './components/SavedPage';
import './App.css';

type PageType = 'home' | 'search' | 'saved' | 'category-all';

interface CategoryAllState {
  category: string;
  icon: string;
}

function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [savedCount, setSavedCount] = useState(0);
  const [categoryAllState, setCategoryAllState] = useState<CategoryAllState | null>(null);

  // カテゴリ設定
  const categories = [
    { name: '経済', icon: '💰' },
    { name: '社会', icon: '🏛️' },
    { name: 'テクノロジー', icon: '💻' },
    { name: 'スポーツ', icon: '⚽' }
  ];

  useEffect(() => {
    loadNews();
    updateSavedCount();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Starting to load news...');
      const allNews = await rssService.fetchAllFeeds(NEWS_SOURCES);
      console.log('Total news items loaded:', allNews.length);
      setNews(allNews);

      if (allNews.length === 0) {
        setError('ニュースの取得に失敗しました。しばらく後にお試しください。');
      }
    } catch (error) {
      console.error('ニュースの読み込みに失敗しました:', error);
      setError('ニュースの読み込みに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const updateSavedCount = () => {
    const stats = storageService.getStorageStats();
    setSavedCount(stats.savedArticlesCount);
  };

  const handleRefresh = () => {
    loadNews();
  };

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    if (page === 'saved') {
      updateSavedCount();
    }
    if (page !== 'category-all') {
      setCategoryAllState(null);
    }
  };

  const handleShowAllCategory = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (category) {
      setCategoryAllState({
        category: categoryName,
        icon: category.icon
      });
      setCurrentPage('category-all');
    }
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setCategoryAllState(null);
  };

  const getNewsByCategory = (categoryName: string): NewsItem[] => {
    return news.filter(item => item.category === categoryName);
  };

  const getTotalNewsCount = () => {
    return news.length;
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'search':
        return <SearchPage news={news} />;
      case 'saved':
        return <SavedPage />;
      case 'category-all':
        if (!categoryAllState) return null;
        return (
          <CategoryAllPage
            category={categoryAllState.category}
            news={getNewsByCategory(categoryAllState.category)}
            icon={categoryAllState.icon}
            onBack={handleBackToHome}
          />
        );
      default:
        return (
          <>
            {loading && (
              <div className="loading-section">
                <div className="loading-spinner">🔄</div>
                <p>ニュースを読み込み中...</p>
              </div>
            )}

            {error && (
              <div className="error-section">
                <p>❌ {error}</p>
              </div>
            )}

            {!loading && !error && news.length > 0 && (
              <div className="categories-container">
                {categories.map(category => (
                  <CategorySection
                    key={category.name}
                    category={category.name}
                    news={getNewsByCategory(category.name)}
                    icon={category.icon}
                    onShowAll={handleShowAllCategory}
                  />
                ))}
              </div>
            )}

            {!loading && !error && news.length === 0 && (
              <div className="empty-state">
                <p>📰 ニュースが見つかりませんでした</p>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📰 日本ニュース</h1>
        <div className="app-subtitle">
          カテゴリ別ニュースフィード
        </div>

        {/* ナビゲーション */}
        <nav className="app-nav">
          <button
            onClick={() => handlePageChange('home')}
            className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`}
          >
            🏠 ホーム
          </button>
          <button
            onClick={() => handlePageChange('search')}
            className={`nav-btn ${currentPage === 'search' ? 'active' : ''}`}
          >
            🔍 検索
          </button>
          <button
            onClick={() => handlePageChange('saved')}
            className={`nav-btn ${currentPage === 'saved' ? 'active' : ''}`}
          >
            💾 保存記事 {savedCount > 0 && <span className="badge">{savedCount}</span>}
          </button>
        </nav>

        {currentPage === 'home' && (
          <div className="header-controls">
            <div className="news-stats">
              {!loading && <span>総計: {getTotalNewsCount()}件</span>}
            </div>
            <button onClick={handleRefresh} className="refresh-btn" disabled={loading}>
              {loading ? '🔄 更新中...' : '🔄 更新'}
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
