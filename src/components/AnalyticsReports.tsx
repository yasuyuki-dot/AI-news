import React, { useState, useEffect } from 'react';
import { analyticsTrackingService } from '../services/analyticsTrackingService';
import './AnalyticsReports.css';

interface ReportData {
  title: string;
  description: string;
  data: any;
  type: 'summary' | 'detailed' | 'comparison';
}

interface AnalyticsReportsProps {
  selectedDate: string;
  onClose: () => void;
}

const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({ selectedDate, onClose }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    generateReports();
  }, [selectedDate, reportPeriod]);

  const generateReports = async () => {
    setGenerating(true);
    try {
      const reportsList: ReportData[] = [];

      // 日次サマリーレポート
      const dailyStats = analyticsTrackingService.generateDailyStats(selectedDate);
      reportsList.push({
        title: '📊 日次サマリーレポート',
        description: `${selectedDate} のアクセス解析概要`,
        type: 'summary',
        data: {
          overview: {
            uniqueVisitors: dailyStats.uniqueVisitors,
            pageViews: dailyStats.totalPageViews,
            sessions: dailyStats.totalSessions,
            avgDuration: dailyStats.avgSessionDuration
          },
          topArticles: dailyStats.popularArticles.slice(0, 5),
          topCategories: dailyStats.popularCategories.slice(0, 5),
          topSearches: dailyStats.searchQueries.slice(0, 5),
          features: dailyStats.featuresUsage
        }
      });

      // ユーザー行動詳細レポート
      const allEvents = analyticsTrackingService.getAllEvents();
      const dayEvents = allEvents.filter(e =>
        new Date(e.timestamp).toISOString().split('T')[0] === selectedDate
      );

      reportsList.push({
        title: '👥 ユーザー行動詳細レポート',
        description: 'ユーザーのサイト内行動パターン分析',
        type: 'detailed',
        data: {
          userJourney: generateUserJourneyReport(dayEvents),
          bounceRate: calculateBounceRate(dayEvents),
          engagementMetrics: calculateEngagementMetrics(dayEvents),
          sessionAnalysis: analyzeUserSessions(dayEvents)
        }
      });

      // パフォーマンスレポート
      reportsList.push({
        title: '⚡ サイトパフォーマンスレポート',
        description: 'サイトの使用状況とパフォーマンス指標',
        type: 'summary',
        data: {
          featureUsage: dailyStats.featuresUsage,
          searchPerformance: analyzSearchPerformance(dayEvents),
          contentEngagement: analyzeContentEngagement(dayEvents),
          recommendations: generateRecommendations(dailyStats)
        }
      });

      // 期間比較レポート（過去7日間）
      if (reportPeriod === 'weekly') {
        const weeklyComparison = generateWeeklyComparison(selectedDate);
        reportsList.push({
          title: '📈 週間比較レポート',
          description: '過去7日間の傾向分析',
          type: 'comparison',
          data: weeklyComparison
        });
      }

      setReports(reportsList);
      if (reportsList.length > 0 && !selectedReport) {
        setSelectedReport(reportsList[0].title);
      }
    } catch (error) {
      console.error('レポート生成エラー:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateUserJourneyReport = (events: any[]) => {
    const sessions = new Map();

    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId).push({
        type: event.type,
        timestamp: event.timestamp,
        data: event.data
      });
    });

    const journeys = Array.from(sessions.values()).map(sessionEvents => {
      const sorted = sessionEvents.sort((a: any, b: any) => a.timestamp - b.timestamp);
      return {
        duration: sorted.length > 1 ? sorted[sorted.length - 1].timestamp - sorted[0].timestamp : 0,
        steps: sorted.length,
        path: sorted.map((e: any) => e.type).join(' → ')
      };
    });

    return {
      totalJourneys: journeys.length,
      avgSteps: journeys.reduce((acc, j) => acc + j.steps, 0) / Math.max(journeys.length, 1),
      avgDuration: journeys.reduce((acc, j) => acc + j.duration, 0) / Math.max(journeys.length, 1),
      commonPaths: getMostCommonPaths(journeys)
    };
  };

  const getMostCommonPaths = (journeys: any[]) => {
    const pathCounts = new Map();

    journeys.forEach(journey => {
      const path = journey.path;
      pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
    });

    return Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));
  };

  const calculateBounceRate = (events: any[]) => {
    const sessions = new Map();

    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, 0);
      }
      sessions.set(event.sessionId, sessions.get(event.sessionId) + 1);
    });

    const singlePageSessions = Array.from(sessions.values()).filter(count => count === 1).length;
    const totalSessions = sessions.size;

    return totalSessions > 0 ? (singlePageSessions / totalSessions * 100).toFixed(1) : '0';
  };

  const calculateEngagementMetrics = (events: any[]) => {
    const articleClicks = events.filter(e => e.type === 'article_click').length;
    const searches = events.filter(e => e.type === 'search').length;
    const featureUses = events.filter(e => e.type === 'feature_use').length;
    const pageViews = events.filter(e => e.type === 'page_view').length;

    return {
      clickThroughRate: pageViews > 0 ? (articleClicks / pageViews * 100).toFixed(1) : '0',
      searchRate: pageViews > 0 ? (searches / pageViews * 100).toFixed(1) : '0',
      featureEngagement: pageViews > 0 ? (featureUses / pageViews * 100).toFixed(1) : '0',
      interactionScore: ((articleClicks + searches + featureUses) / Math.max(pageViews, 1) * 100).toFixed(1)
    };
  };

  const analyzeUserSessions = (events: any[]) => {
    const sessions = new Map();

    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, {
          start: event.timestamp,
          end: event.timestamp,
          events: []
        });
      }
      const session = sessions.get(event.sessionId);
      session.end = Math.max(session.end, event.timestamp);
      session.events.push(event);
    });

    const sessionData = Array.from(sessions.values());
    const durations = sessionData.map(s => (s.end - s.start) / 1000);

    return {
      totalSessions: sessionData.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / Math.max(durations.length, 1),
      shortSessions: durations.filter(d => d < 30).length,
      mediumSessions: durations.filter(d => d >= 30 && d < 300).length,
      longSessions: durations.filter(d => d >= 300).length
    };
  };

  const analyzSearchPerformance = (events: any[]) => {
    const searches = events.filter(e => e.type === 'search');

    if (searches.length === 0) {
      return { totalSearches: 0, uniqueQueries: 0, avgResultsViewed: 0 };
    }

    const uniqueQueries = new Set(searches.map(s => s.data.query)).size;
    const avgResults = searches.reduce((acc, s) => acc + (s.data.resultsCount || 0), 0) / searches.length;

    return {
      totalSearches: searches.length,
      uniqueQueries,
      avgResultsViewed: Math.round(avgResults),
      noResultSearches: searches.filter(s => (s.data.resultsCount || 0) === 0).length
    };
  };

  const analyzeContentEngagement = (events: any[]) => {
    const articleClicks = events.filter(e => e.type === 'article_click');
    const categoryViews = events.filter(e => e.type === 'category_view');

    return {
      totalArticleClicks: articleClicks.length,
      totalCategoryViews: categoryViews.length,
      mostClickedSource: getMostFrequent(articleClicks.map(e => e.data.articleSource)),
      mostViewedCategory: getMostFrequent(categoryViews.map(e => e.data.category))
    };
  };

  const getMostFrequent = (items: string[]) => {
    const counts = new Map();
    items.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    let maxCount = 0;
    let mostFrequent = '';
    counts.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    });

    return mostFrequent || 'N/A';
  };

  const generateRecommendations = (stats: any) => {
    const recommendations = [];

    if (stats.totalPageViews > 0 && stats.popularArticles.length === 0) {
      recommendations.push('記事のクリック率を改善するため、より魅力的なタイトルや概要の検討をお勧めします。');
    }

    if (stats.searchQueries.length > 0) {
      recommendations.push('検索機能の利用が活発です。検索結果の改善や関連記事の表示を検討してください。');
    }

    if (stats.featuresUsage.length === 0) {
      recommendations.push('機能の利用が少ないようです。ユーザーガイドや機能の説明を追加することを検討してください。');
    }

    if (stats.avgSessionDuration < 60) {
      recommendations.push('滞在時間が短いです。コンテンツの質向上やナビゲーションの改善を検討してください。');
    }

    return recommendations.length > 0 ? recommendations : ['現在のサイト運営は良好です。継続して品質向上に努めてください。'];
  };

  const generateWeeklyComparison = (currentDate: string) => {
    const dates = [];
    const baseDate = new Date(currentDate);

    for (let i = 6; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const weeklyData = dates.map(date => {
      const stats = analyticsTrackingService.generateDailyStats(date);
      return {
        date,
        visitors: stats.uniqueVisitors,
        pageViews: stats.totalPageViews,
        sessions: stats.totalSessions,
        duration: stats.avgSessionDuration
      };
    });

    return {
      dailyData: weeklyData,
      trends: calculateTrends(weeklyData),
      weekTotal: {
        visitors: weeklyData.reduce((sum, day) => sum + day.visitors, 0),
        pageViews: weeklyData.reduce((sum, day) => sum + day.pageViews, 0),
        sessions: weeklyData.reduce((sum, day) => sum + day.sessions, 0)
      }
    };
  };

  const calculateTrends = (weeklyData: any[]) => {
    if (weeklyData.length < 2) return {};

    const latest = weeklyData[weeklyData.length - 1];
    const previous = weeklyData[weeklyData.length - 2];

    return {
      visitorsChange: ((latest.visitors - previous.visitors) / Math.max(previous.visitors, 1) * 100).toFixed(1),
      pageViewsChange: ((latest.pageViews - previous.pageViews) / Math.max(previous.pageViews, 1) * 100).toFixed(1),
      sessionsChange: ((latest.sessions - previous.sessions) / Math.max(previous.sessions, 1) * 100).toFixed(1)
    };
  };

  const exportReport = (report: ReportData) => {
    const exportData = {
      title: report.title,
      description: report.description,
      generatedAt: new Date().toISOString(),
      period: selectedDate,
      data: report.data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${selectedDate}-${report.title.replace(/[^\w]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedReportData = reports.find(r => r.title === selectedReport);

  return (
    <div className="analytics-reports">
      <div className="reports-header">
        <div className="reports-title">
          <h2>📋 アナリティクスレポート</h2>
          <button onClick={onClose} className="close-reports-btn">✕</button>
        </div>

        <div className="reports-controls">
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value as any)}
            className="period-selector"
          >
            <option value="daily">日次レポート</option>
            <option value="weekly">週次レポート</option>
            <option value="monthly">月次レポート</option>
          </select>

          <button onClick={generateReports} className="refresh-reports-btn" disabled={generating}>
            {generating ? '⏳ 生成中...' : '🔄 再生成'}
          </button>
        </div>
      </div>

      <div className="reports-content">
        <div className="reports-sidebar">
          <h3>レポート一覧</h3>
          {reports.map((report, index) => (
            <div
              key={index}
              className={`report-item ${selectedReport === report.title ? 'active' : ''}`}
              onClick={() => setSelectedReport(report.title)}
            >
              <div className="report-title">{report.title}</div>
              <div className="report-description">{report.description}</div>
            </div>
          ))}
        </div>

        <div className="reports-main">
          {selectedReportData && (
            <div className="report-display">
              <div className="report-header">
                <h3>{selectedReportData.title}</h3>
                <button
                  onClick={() => exportReport(selectedReportData)}
                  className="export-report-btn"
                >
                  📥 エクスポート
                </button>
              </div>

              <div className="report-content">
                <ReportContent report={selectedReportData} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportContent: React.FC<{ report: ReportData }> = ({ report }) => {
  const formatNumber = (num: number) => new Intl.NumberFormat('ja-JP').format(num);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}時間${minutes}分`;
    if (minutes > 0) return `${minutes}分${secs}秒`;
    return `${secs}秒`;
  };

  switch (report.type) {
    case 'summary':
      return <SummaryReport data={report.data} formatNumber={formatNumber} formatDuration={formatDuration} />;
    case 'detailed':
      return <DetailedReport data={report.data} formatNumber={formatNumber} formatDuration={formatDuration} />;
    case 'comparison':
      return <ComparisonReport data={report.data} formatNumber={formatNumber} />;
    default:
      return <div>レポートデータが見つかりません</div>;
  }
};

const SummaryReport: React.FC<{ data: any; formatNumber: (n: number) => string; formatDuration: (s: number) => string }> = ({ data, formatNumber, formatDuration }) => (
  <div className="summary-report">
    {data.overview && (
      <div className="overview-section">
        <h4>📊 概要</h4>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{formatNumber(data.overview.uniqueVisitors)}</div>
            <div className="metric-label">ユニークビジター</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatNumber(data.overview.pageViews)}</div>
            <div className="metric-label">ページビュー</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatNumber(data.overview.sessions)}</div>
            <div className="metric-label">セッション</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{formatDuration(data.overview.avgDuration)}</div>
            <div className="metric-label">平均滞在時間</div>
          </div>
        </div>
      </div>
    )}

    {data.topArticles && data.topArticles.length > 0 && (
      <div className="top-content">
        <h4>📰 人気記事 TOP 5</h4>
        <div className="content-list">
          {data.topArticles.map((article: any, index: number) => (
            <div key={index} className="content-item">
              <span className="content-rank">#{index + 1}</span>
              <span className="content-title">{article.title}</span>
              <span className="content-metric">{article.clicks} クリック</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {data.recommendations && (
      <div className="recommendations">
        <h4>💡 改善提案</h4>
        <ul>
          {data.recommendations.map((rec: string, index: number) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const DetailedReport: React.FC<{ data: any; formatNumber: (n: number) => string; formatDuration: (s: number) => string }> = ({ data, formatNumber, formatDuration }) => (
  <div className="detailed-report">
    {data.userJourney && (
      <div className="journey-section">
        <h4>🛤️ ユーザージャーニー分析</h4>
        <div className="journey-metrics">
          <div className="journey-metric">
            <span className="journey-label">総ジャーニー数:</span>
            <span className="journey-value">{formatNumber(data.userJourney.totalJourneys)}</span>
          </div>
          <div className="journey-metric">
            <span className="journey-label">平均ステップ数:</span>
            <span className="journey-value">{Math.round(data.userJourney.avgSteps)}</span>
          </div>
          <div className="journey-metric">
            <span className="journey-label">平均所要時間:</span>
            <span className="journey-value">{formatDuration(Math.round(data.userJourney.avgDuration / 1000))}</span>
          </div>
        </div>

        {data.userJourney.commonPaths && (
          <div className="common-paths">
            <h5>よくあるユーザー行動パターン</h5>
            {data.userJourney.commonPaths.map((path: any, index: number) => (
              <div key={index} className="path-item">
                <span className="path-count">{path.count}回</span>
                <span className="path-sequence">{path.path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {data.engagementMetrics && (
      <div className="engagement-section">
        <h4>💪 エンゲージメント指標</h4>
        <div className="engagement-grid">
          <div className="engagement-metric">
            <span className="engagement-label">クリック率:</span>
            <span className="engagement-value">{data.engagementMetrics.clickThroughRate}%</span>
          </div>
          <div className="engagement-metric">
            <span className="engagement-label">検索利用率:</span>
            <span className="engagement-value">{data.engagementMetrics.searchRate}%</span>
          </div>
          <div className="engagement-metric">
            <span className="engagement-label">機能利用率:</span>
            <span className="engagement-value">{data.engagementMetrics.featureEngagement}%</span>
          </div>
          <div className="engagement-metric">
            <span className="engagement-label">総合スコア:</span>
            <span className="engagement-value">{data.engagementMetrics.interactionScore}%</span>
          </div>
        </div>
      </div>
    )}

    <div className="bounce-rate">
      <h4>📊 直帰率</h4>
      <div className="bounce-metric">
        <span className="bounce-value">{data.bounceRate}%</span>
        <span className="bounce-label">のユーザーが1ページのみ閲覧</span>
      </div>
    </div>
  </div>
);

const ComparisonReport: React.FC<{ data: any; formatNumber: (n: number) => string }> = ({ data, formatNumber }) => (
  <div className="comparison-report">
    {data.weekTotal && (
      <div className="week-summary">
        <h4>📅 週間サマリー</h4>
        <div className="week-metrics">
          <div className="week-metric">
            <span className="week-label">週間ビジター数:</span>
            <span className="week-value">{formatNumber(data.weekTotal.visitors)}</span>
          </div>
          <div className="week-metric">
            <span className="week-label">週間ページビュー:</span>
            <span className="week-value">{formatNumber(data.weekTotal.pageViews)}</span>
          </div>
          <div className="week-metric">
            <span className="week-label">週間セッション数:</span>
            <span className="week-value">{formatNumber(data.weekTotal.sessions)}</span>
          </div>
        </div>
      </div>
    )}

    {data.trends && (
      <div className="trends-section">
        <h4>📈 傾向分析</h4>
        <div className="trends-grid">
          <div className="trend-item">
            <span className="trend-label">ビジター数変化:</span>
            <span className={`trend-value ${parseFloat(data.trends.visitorsChange) >= 0 ? 'positive' : 'negative'}`}>
              {data.trends.visitorsChange}%
            </span>
          </div>
          <div className="trend-item">
            <span className="trend-label">ページビュー変化:</span>
            <span className={`trend-value ${parseFloat(data.trends.pageViewsChange) >= 0 ? 'positive' : 'negative'}`}>
              {data.trends.pageViewsChange}%
            </span>
          </div>
          <div className="trend-item">
            <span className="trend-label">セッション数変化:</span>
            <span className={`trend-value ${parseFloat(data.trends.sessionsChange) >= 0 ? 'positive' : 'negative'}`}>
              {data.trends.sessionsChange}%
            </span>
          </div>
        </div>
      </div>
    )}

    {data.dailyData && (
      <div className="daily-breakdown">
        <h4>📊 日別詳細</h4>
        <div className="daily-table">
          <div className="table-header">
            <span>日付</span>
            <span>ビジター</span>
            <span>ページビュー</span>
            <span>セッション</span>
          </div>
          {data.dailyData.map((day: any, index: number) => (
            <div key={index} className="table-row">
              <span>{day.date}</span>
              <span>{formatNumber(day.visitors)}</span>
              <span>{formatNumber(day.pageViews)}</span>
              <span>{formatNumber(day.sessions)}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default AnalyticsReports;