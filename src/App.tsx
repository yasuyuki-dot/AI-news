import { useState, useEffect } from 'react';
import type { NewsItem } from './types/news';
import { NEWS_SOURCES } from './types/news';
import { rssService } from './services/rssService';
import { realtimeService, type RealtimeEvent } from './services/realtimeService';
import { analyticsTrackingService } from './services/analyticsTrackingService';
import { translationService } from './services/translationService';
import './services/dataLogger'; // データロガーを初期化
import { filterRecentNews, getDateRangeText } from './utils/dateFilter';
import CategorySection from './components/CategorySection';
import CategoryAllPage from './components/CategoryAllPage';
import SearchPage from './components/SearchPage';
import SavedPage from './components/SavedPage';
import SourceRanking from './components/SourceRanking';
import RealtimeStatus from './components/RealtimeStatus';
import AdminAccess from './components/AdminAccess';
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
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [showAdminAccess, setShowAdminAccess] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalNews, setOriginalNews] = useState<NewsItem[]>([]);

  // カテゴリ設定
  const categories = [
    { name: 'AI・機械学習', icon: '🤖' },
    { name: '経済・ビジネス', icon: '💰' },
    { name: 'テクノロジー', icon: '💻' }
  ];

  // 管理者アクセスショートカット設定 ("yasuyuki" 入力のみ)
  useEffect(() => {
    let keySequence = '';
    let sequenceTimer: number;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 特別なシーケンス: "yasuyuki" を連続入力
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        keySequence += event.key.toLowerCase();
        console.log('🔑 Key pressed:', event.key, 'Current sequence:', keySequence);

        // 3秒後にシーケンスをリセット
        clearTimeout(sequenceTimer);
        sequenceTimer = setTimeout(() => {
          console.log('⏰ Sequence reset after timeout');
          keySequence = '';
        }, 3000);

        // "yasuyuki" が入力されたらアクセス許可
        if (keySequence.includes('yasuyuki')) {
          console.log('🔓 Secret code detected! Opening admin access...');
          event.preventDefault();
          keySequence = '';
          setShowAdminAccess(true);
        }

        // シーケンスが長すぎる場合はリセット
        if (keySequence.length > 20) {
          console.log('📏 Sequence too long, resetting...');
          keySequence = '';
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(sequenceTimer);
    };
  }, []);

  useEffect(() => {
    // アナリティクス初期化
    analyticsTrackingService.trackPageView('home');

    // データロガー初期化（自動でバックグラウンド記録開始）
    console.log('📊 Data logger initialized - automatic analytics recording started');

    loadNews();

    // リアルタイムサービスのイベントリスナー設定
    const handleRealtimeEvent = (event: RealtimeEvent) => {
      if (event.type === 'news_update' && Array.isArray(event.data)) {
        console.log('Realtime news update received:', event.data.length, 'items');
        const recentNews = filterRecentNews(event.data);
        setNews(recentNews.length > 0 ? recentNews : event.data.slice(0, 20));
        setLoading(false);
        setError('');
      }
    };

    realtimeService.subscribe('app-main', handleRealtimeEvent);

    // 従来の10分間隔更新は削除（リアルタイムサービスに置き換え）
    return () => {
      realtimeService.unsubscribe('app-main');
    };
  }, [currentPage]);

  // ページ変更時のアナリティクス追跡
  useEffect(() => {
    analyticsTrackingService.trackPageView(currentPage);
  }, [currentPage]);

  const loadNews = async () => {
    setLoading(true);
    setError('');

    try {
      console.log(`🚀 ニュース読み込み開始 (${NEWS_SOURCES.length}ソース)`);
      const startTime = Date.now();

      const allNews = await rssService.fetchAllFeeds(NEWS_SOURCES);
      const loadTime = Date.now() - startTime;
      console.log(`✅ ニュース読み込み完了: ${loadTime}ms - ${allNews.length}件取得`);

      // 過去2週間以内の記事のみフィルタリング
      const recentNews = filterRecentNews(allNews);
      console.log(`📅 最近のニュース: ${recentNews.length}件 (全${allNews.length}件中)`);

      // ニュースをそのまま表示（翻訳なし）
      if (allNews.length > 0 && recentNews.length === 0) {
        console.log('📰 過去2週間以内のニュースなし。全記事の最新20件を表示（デバッグ）');
        const oldNews = allNews.slice(0, 20);
        setOriginalNews(oldNews);
        setNews(oldNews);
      } else {
        console.log(`📰 ニュースを表示: ${recentNews.length}件`);
        setOriginalNews(recentNews);
        setNews(recentNews);
      }

      // 翻訳状態をリセット
      setIsTranslated(false);

      if (allNews.length === 0) {
        setError('ニュースの取得に失敗しました。インターネット接続をご確認ください。');
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
    if (isRealtimeConnected) {
      // リアルタイム接続中は手動更新を実行
      realtimeService.triggerManualUpdate();
    } else {
      // リアルタイム未接続時は従来の更新方法
      loadNews();
    }
  };

  // 翻訳トグル機能
  const handleTranslationToggle = async () => {
    if (isTranslating) return; // 翻訳中は無効

    setIsTranslating(true);

    try {
      if (isTranslated) {
        // 翻訳を解除：オリジナルに戻す
        console.log('🔤 翻訳を解除中...');
        setNews(originalNews);
        setIsTranslated(false);
        console.log('✅ オリジナル表示に戻しました');
      } else {
        // 翻訳を実行
        console.log('🔤 ニュースタイトルを日本語に翻訳中...');
        const translationStartTime = Date.now();
        const translatedNews = await translationService.translateNewsItems(originalNews);
        const translationTime = Date.now() - translationStartTime;
        console.log(`✅ 翻訳完了: ${translationTime}ms`);
        setNews(translatedNews);
        setIsTranslated(true);
      }
    } catch (error) {
      console.error('翻訳エラー:', error);
      setError('翻訳に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
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
                <p>最新ニュースを取得中...</p>
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
        <h1>🤖 AI ニュース</h1>
        <div className="app-subtitle">
          最新AI技術・機械学習の情報をお届け
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
              {!isRealtimeConnected && (
                <span className="auto-refresh-info">🔄 手動更新</span>
              )}
              {isTranslated && (
                <span className="translation-info">🌐 翻訳表示中</span>
              )}
            </div>
            <button onClick={handleRefresh} className="refresh-btn" disabled={loading}>
              {loading ? '🔄 更新中...' : '🔄 更新'}
            </button>
            <button
              onClick={handleTranslationToggle}
              className="translation-btn"
              disabled={isTranslating || loading || news.length === 0}
              title={isTranslated ? '英語表示に戻す' : '日本語に翻訳'}
            >
              {isTranslating ? '🔄 翻訳中...' : isTranslated ? '🌐 EN' : '🌐 JP'}
            </button>
          </div>
        )}

      </header>

      <main className="app-main">
        {currentPage === 'home' && (
          <RealtimeStatus onStatusChange={setIsRealtimeConnected} />
        )}
        {renderPage()}
      </main>

      {/* 管理者アクセス - 隠し機能 */}
      {showAdminAccess && <AdminAccess onClose={() => setShowAdminAccess(false)} />}

    </div>
  );
}

export default App;
