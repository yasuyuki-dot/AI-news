import { useState, useEffect } from 'react';
import type { NewsItem } from './types/news';
import { NEWS_SOURCES } from './types/news';
import { rssService } from './services/rssService';
import { filterRecentNews, getDateRangeText } from './utils/dateFilter';
import CategorySection from './components/CategorySection';
import CategoryAllPage from './components/CategoryAllPage';
import SearchPage from './components/SearchPage';
import SavedPage from './components/SavedPage';
import SourceRanking from './components/SourceRanking';
import './App.css';

type PageType = 'home' | 'search' | 'saved' | 'category-all' | 'ranking';

interface CategoryAllState {
  category: string;
  icon: string;
}

function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [categoryAllState, setCategoryAllState] = useState<CategoryAllState | null>(null);

  // カテゴリ設定
  const categories = [
    { name: 'AIエージェント', icon: '🤖' },
    { name: '経済', icon: '💰' },
    { name: 'テクノロジー', icon: '💻' }
  ];

  useEffect(() => {
    loadNews();

    // 10分間隔で自動更新
    const interval = setInterval(() => {
      if (currentPage === 'home') {
        loadNews();
      }
    }, 10 * 60 * 1000); // 10分 = 600,000ミリ秒

    return () => clearInterval(interval);
  }, [currentPage]);

  const loadNews = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Starting to load news...');
      console.log('NEWS_SOURCES:', NEWS_SOURCES);

      const allNews = await rssService.fetchAllFeeds(NEWS_SOURCES);
      console.log('Total news items loaded:', allNews.length);
      console.log('Sample news items:', allNews.slice(0, 3));

      // 過去2週間以内の記事のみフィルタリング
      const recentNews = filterRecentNews(allNews);
      console.log('Recent news items (past 2 weeks):', recentNews.length);

      // 翻訳処理を無効化（高速化）
      console.log('Skipping translation for better performance...');
      const translatedNews = recentNews;

      console.log('Translation completed. Setting news...');
      if (allNews.length > 0 && recentNews.length === 0) {
        console.log('All articles are older than 1 month. Showing all articles for debugging...');
        const newsToSet = allNews.slice(0, 20);
        console.log('Setting news with:', newsToSet.length, 'articles');
        setNews(newsToSet);
      } else {
        console.log('Setting news with recent articles:', translatedNews.length);
        setNews(translatedNews);
      }

      if (allNews.length === 0) {
        setError('ニュースの取得に失敗しました。ネットワーク接続を確認してください。');
      } else if (recentNews.length === 0 && allNews.length > 0) {
        setError('過去2週間以内のニュースが見つかりませんでした。(デバッグモード: 全記事を表示中)');
      }
    } catch (error) {
      console.error('ニュースの読み込みに失敗しました:', error);
      setError('ニュースの読み込みに失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };


  const handleRefresh = () => {
    loadNews();
  };

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    if (page === 'saved') {
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
      case 'ranking':
        return <SourceRanking />;
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
        console.log('Rendering default page. State:', { loading, error: !!error, newsCount: news.length });
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

            {!loading && !error && news.length > 0 && (() => {
              console.log('Rendering categories with news:', news.length);
              return (
                <div className="categories-container">
                  {categories.map(category => {
                    const categoryNews = getNewsByCategory(category.name);
                    console.log(`Category ${category.name}: ${categoryNews.length} articles`);
                    return (
                      <CategorySection
                        key={category.name}
                        category={category.name}
                        news={categoryNews}
                        icon={category.icon}
                        onShowAll={handleShowAllCategory}
                      />
                    );
                  })}
                </div>
              );
            })()}

            {!loading && !error && news.length === 0 && (() => {
              console.log('Showing empty state');
              return (
                <div className="empty-state">
                  <p>📰 ニュースが見つかりませんでした</p>
                </div>
              );
            })()}
          </>
        );
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 AIエージェント NEWS</h1>
        <div className="app-subtitle">
          最新AI技術・機械学習ニュースフィード
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
            onClick={() => handlePageChange('ranking')}
            className={`nav-btn ${currentPage === 'ranking' ? 'active' : ''}`}
          >
            📊 ランキング
          </button>
        </nav>

        {currentPage === 'home' && (
          <div className="header-controls">
            <div className="news-stats">
              {!loading && <span>総計: {getTotalNewsCount()}件</span>}
              <span className="date-filter-info">📅 過去2週間以内 ({getDateRangeText()})</span>
              <span className="auto-refresh-info">🔄 10分間隔で自動更新</span>
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
