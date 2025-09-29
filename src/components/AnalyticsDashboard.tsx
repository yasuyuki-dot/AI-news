import React, { useState, useEffect } from 'react';
import { analyticsTrackingService, type DailyStats } from '../services/analyticsTrackingService';
import AnalyticsCharts from './AnalyticsCharts';
import AnalyticsReports from './AnalyticsReports';
import AnalyticsFilters from './AnalyticsFilters';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<any>(null);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState<any>({
    eventTypes: [],
    sources: [],
    categories: [],
    searchTerms: [],
    userAgents: []
  });
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [showCharts, setShowCharts] = useState(true);
  const [showReports, setShowReports] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, [selectedDate]);

  const loadAnalytics = () => {
    setLoading(true);
    try {
      const dailyStats = analyticsTrackingService.generateDailyStats(selectedDate);
      const allStats = analyticsTrackingService.getAllTimeStats();
      const eventsData = analyticsTrackingService.getAllEvents();
      const options = analyticsTrackingService.getAvailableFilterOptions();

      setStats(dailyStats);
      setAllTimeStats(allStats);
      setAllEvents(eventsData);
      setFilteredEvents(eventsData);
      setFilterOptions(options);
    } catch (error) {
      console.error('Analytics loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filters: any) => {
    let filtered = allEvents;

    // 日付範囲フィルター
    const startDate = new Date(filters.dateRange.start).getTime();
    const endDate = new Date(filters.dateRange.end).getTime() + 86400000; // 終了日の24時まで
    filtered = filtered.filter(event =>
      event.timestamp >= startDate && event.timestamp < endDate
    );

    // イベントタイプフィルター
    if (filters.eventTypes.length > 0) {
      filtered = filtered.filter(event => filters.eventTypes.includes(event.type));
    }

    // ソースフィルター
    if (filters.sources.length > 0) {
      filtered = filtered.filter(event =>
        event.type === 'article_click' && filters.sources.includes(event.data.articleSource)
      );
    }

    // カテゴリフィルター
    if (filters.categories.length > 0) {
      filtered = filtered.filter(event =>
        event.type === 'category_view' && filters.categories.includes(event.data.category)
      );
    }

    // 検索キーワードフィルター
    if (filters.searchTerms.length > 0) {
      filtered = filtered.filter(event =>
        event.type === 'search' && filters.searchTerms.includes(event.data.query)
      );
    }

    // ユーザーエージェントフィルター
    if (filters.userAgent.length > 0) {
      filtered = filtered.filter(event => {
        const ua = event.userAgent;
        return filters.userAgent.some((filterUA: string) => {
          if (filterUA === 'Chrome') return ua.includes('Chrome');
          if (filterUA === 'Firefox') return ua.includes('Firefox');
          if (filterUA === 'Safari') return ua.includes('Safari');
          if (filterUA === 'Edge') return ua.includes('Edge');
          if (filterUA === 'Mobile') return ua.includes('Mobile');
          if (filterUA === 'Other') return !['Chrome', 'Firefox', 'Safari', 'Edge', 'Mobile'].some(browser => ua.includes(browser));
          return false;
        });
      });
    }

    // セッション時間フィルター
    const sessionDurations = new Map();
    filtered.forEach(event => {
      if (!sessionDurations.has(event.sessionId)) {
        sessionDurations.set(event.sessionId, { start: event.timestamp, end: event.timestamp });
      }
      const session = sessionDurations.get(event.sessionId);
      session.start = Math.min(session.start, event.timestamp);
      session.end = Math.max(session.end, event.timestamp);
    });

    const validSessions = new Set();
    sessionDurations.forEach((duration, sessionId) => {
      const sessionLength = (duration.end - duration.start) / 1000;
      if (sessionLength >= filters.sessionDuration.min && sessionLength <= filters.sessionDuration.max) {
        validSessions.add(sessionId);
      }
    });

    filtered = filtered.filter(event => validSessions.has(event.sessionId));

    setFilteredEvents(filtered);
  };

  const handleExportData = () => {
    try {
      const data = analyticsTrackingService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-data-${selectedDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('データのエクスポートに失敗しました: ' + error);
    }
  };

  const handleClearData = () => {
    if (confirm('アナリティクスデータをすべて削除しますか？この操作は取り消せません。')) {
      analyticsTrackingService.clearData();
      loadAnalytics();
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  if (loading && !stats) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-loading">
          <div className="loading-spinner">📊</div>
          <p>アナリティクスデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="analytics-title">
          <h2>📊 アクセス解析ダッシュボード</h2>
          <button onClick={onClose} className="close-dashboard-btn">
            ✕
          </button>
        </div>

        <div className="analytics-controls">
          <div className="date-selector">
            <label htmlFor="analytics-date">日付選択:</label>
            <input
              id="analytics-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="analytics-actions">
            <button onClick={loadAnalytics} className="refresh-analytics-btn">
              🔄 更新
            </button>
            <button onClick={handleExportData} className="export-data-btn">
              📥 エクスポート
            </button>
            <button onClick={() => setShowCharts(!showCharts)} className="toggle-charts-btn">
              {showCharts ? '📊 グラフを非表示' : '📈 グラフを表示'}
            </button>
            <button onClick={() => setShowReports(true)} className="reports-btn">
              📋 レポート生成
            </button>
            <button onClick={handleClearData} className="clear-data-btn">
              🗑️ データ削除
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="analytics-content">
          {/* データフィルター */}
          <AnalyticsFilters
            onFilterChange={handleFilterChange}
            availableFilters={filterOptions}
          />

          {/* データ可視化チャート */}
          {showCharts && (
            <div className="charts-section">
              <div className="chart-controls">
                <h3>📊 データ可視化</h3>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="time-range-selector"
                >
                  <option value="24h">過去24時間</option>
                  <option value="7d">過去7日間</option>
                  <option value="30d">過去30日間</option>
                  <option value="all">全期間</option>
                </select>
              </div>
              <AnalyticsCharts events={filteredEvents} timeRange={timeRange} />
            </div>
          )}

          {/* リアルタイム統計 */}
          <div className="realtime-stats">
            <h3>🔴 リアルタイム</h3>
            <div className="realtime-users">
              <span className="realtime-count">{stats.realTimeUsers}</span>
              <span className="realtime-label">現在のアクティブユーザー</span>
            </div>
          </div>

          {/* 日次統計概要 */}
          <div className="daily-overview">
            <h3>📅 {selectedDate} の統計</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-number">{formatNumber(stats.uniqueVisitors)}</div>
                  <div className="stat-label">ユニークビジター</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📄</div>
                <div className="stat-content">
                  <div className="stat-number">{formatNumber(stats.totalPageViews)}</div>
                  <div className="stat-label">ページビュー</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <div className="stat-number">{formatDuration(stats.avgSessionDuration)}</div>
                  <div className="stat-label">平均滞在時間</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔗</div>
                <div className="stat-content">
                  <div className="stat-number">{formatNumber(stats.totalSessions)}</div>
                  <div className="stat-label">セッション数</div>
                </div>
              </div>
            </div>
          </div>

          {/* 人気記事 */}
          <div className="popular-articles">
            <h3>📰 人気記事 Top 10</h3>
            {stats.popularArticles.length > 0 ? (
              <div className="articles-list">
                {stats.popularArticles.map((article, index) => (
                  <div key={index} className="article-item">
                    <div className="article-rank">{index + 1}</div>
                    <div className="article-info">
                      <div className="article-title">{article.title}</div>
                      <div className="article-source">{article.source}</div>
                    </div>
                    <div className="article-clicks">
                      <span className="clicks-count">{article.clicks}</span>
                      <span className="clicks-label">クリック</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">この日付には記事クリックがありませんでした</div>
            )}
          </div>

          {/* 人気カテゴリ */}
          <div className="popular-categories">
            <h3>📂 人気カテゴリ</h3>
            {stats.popularCategories.length > 0 ? (
              <div className="categories-list">
                {stats.popularCategories.map((category, index) => (
                  <div key={index} className="category-item">
                    <div className="category-name">{category.category}</div>
                    <div className="category-bar">
                      <div
                        className="category-fill"
                        style={{
                          width: `${(category.views / Math.max(...stats.popularCategories.map(c => c.views))) * 100}%`
                        }}
                      ></div>
                    </div>
                    <div className="category-views">{category.views}回</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">この日付にはカテゴリ表示がありませんでした</div>
            )}
          </div>

          {/* 検索クエリ */}
          <div className="search-queries">
            <h3>🔍 検索クエリ Top 10</h3>
            {stats.searchQueries.length > 0 ? (
              <div className="queries-list">
                {stats.searchQueries.map((query, index) => (
                  <div key={index} className="query-item">
                    <div className="query-rank">{index + 1}</div>
                    <div className="query-text">"{query.query}"</div>
                    <div className="query-count">{query.count}回</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">この日付には検索がありませんでした</div>
            )}
          </div>

          {/* 機能使用状況 */}
          <div className="features-usage">
            <h3>⚡ 機能使用状況</h3>
            {stats.featuresUsage.length > 0 ? (
              <div className="features-list">
                {stats.featuresUsage.map((feature, index) => (
                  <div key={index} className="feature-item">
                    <div className="feature-name">
                      {feature.feature === 'realtime_updates' && '🔴 リアルタイム更新'}
                      {feature.feature === 'virtual_scroll' && '⚡ 仮想スクロール'}
                      {feature.feature === 'notifications' && '🔔 通知機能'}
                      {!['realtime_updates', 'virtual_scroll', 'notifications'].includes(feature.feature) && `🔧 ${feature.feature}`}
                    </div>
                    <div className="feature-uses">{feature.uses}回使用</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">この日付には機能使用がありませんでした</div>
            )}
          </div>

          {/* 全期間統計 */}
          {allTimeStats && (
            <div className="all-time-stats">
              <h3>📈 全期間統計</h3>
              <div className="all-time-grid">
                <div className="all-time-item">
                  <div className="all-time-label">運営日数</div>
                  <div className="all-time-value">{allTimeStats.totalDays}日</div>
                </div>
                <div className="all-time-item">
                  <div className="all-time-label">総イベント数</div>
                  <div className="all-time-value">{formatNumber(allTimeStats.totalEvents)}</div>
                </div>
                <div className="all-time-item">
                  <div className="all-time-label">初回訪問</div>
                  <div className="all-time-value">{allTimeStats.firstVisit || '未記録'}</div>
                </div>
                <div className="all-time-item">
                  <div className="all-time-label">最終訪問</div>
                  <div className="all-time-value">{allTimeStats.lastVisit || '未記録'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!stats && !loading && (
        <div className="no-analytics-data">
          <div className="no-data-icon">📊</div>
          <h3>データがありません</h3>
          <p>選択した日付にアクセス記録がありません</p>
        </div>
      )}

      {/* レポートモーダル */}
      {showReports && (
        <AnalyticsReports
          selectedDate={selectedDate}
          onClose={() => setShowReports(false)}
        />
      )}
    </div>
  );
};

export default AnalyticsDashboard;