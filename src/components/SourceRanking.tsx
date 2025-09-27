import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import type { SourceStats, RankingPeriod } from '../services/analyticsService';

interface SourceRankingProps {
  onClose?: () => void;
}

const SourceRanking: React.FC<SourceRankingProps> = ({ onClose }) => {
  const [rankings, setRankings] = useState<RankingPeriod>({
    daily: [],
    weekly: [],
    monthly: [],
    allTime: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState<keyof RankingPeriod>('allTime');
  const [statsSummary, setStatsSummary] = useState(analyticsService.getStatsSummary());

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = () => {
    const newRankings = analyticsService.getRankings();
    setRankings(newRankings);
    setStatsSummary(analyticsService.getStatsSummary());
  };

  const getCurrentRanking = (): SourceStats[] => {
    return rankings[selectedPeriod] || [];
  };

  const getPeriodLabel = (period: keyof RankingPeriod): string => {
    switch (period) {
      case 'daily': return '今日';
      case 'weekly': return '1週間';
      case 'monthly': return '1ヶ月';
      case 'allTime': return '全期間';
    }
  };

  const getRankingIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '📰';
    }
  };

  const formatLastAccessed = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return '1時間未満前';
      if (diffHours < 24) return `${diffHours}時間前`;
      if (diffDays < 7) return `${diffDays}日前`;

      return date.toLocaleDateString('ja-JP');
    } catch {
      return timestamp;
    }
  };

  const getTopCategories = (stats: SourceStats): string[] => {
    return Object.entries(stats.categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  };

  const handleClearData = () => {
    if (window.confirm('アクセス統計データをすべてクリアしますか？この操作は元に戻せません。')) {
      analyticsService.clearAnalytics();
      loadRankings();
    }
  };

  const currentRanking = getCurrentRanking();

  return (
    <div className="source-ranking">
      <div className="ranking-header">
        <div className="ranking-title">
          <h1>📊 ニュースソース別アクセスランキング</h1>
          {onClose && (
            <button onClick={onClose} className="close-btn" title="閉じる">
              ✕
            </button>
          )}
        </div>

        {/* 統計サマリー */}
        <div className="stats-summary">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">総アクセス数</span>
              <span className="summary-value">{statsSummary.totalAccesses.toLocaleString()}回</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">今日のアクセス</span>
              <span className="summary-value">{statsSummary.todayAccesses.toLocaleString()}回</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">利用ソース数</span>
              <span className="summary-value">{statsSummary.uniqueSources}個</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">カテゴリ数</span>
              <span className="summary-value">{statsSummary.uniqueCategories}個</span>
            </div>
          </div>
        </div>

        {/* 期間選択 */}
        <div className="period-selector">
          <div className="period-buttons">
            {(Object.keys(rankings) as Array<keyof RankingPeriod>).map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>
          <button onClick={handleClearData} className="clear-data-btn">
            データクリア
          </button>
        </div>
      </div>

      {/* ランキング表示 */}
      <div className="ranking-content">
        {currentRanking.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📊</div>
            <h2>アクセス記録がありません</h2>
            <p>記事を読むとアクセス統計が記録されます</p>
            <p>「記事を読む →」ボタンをクリックして記事にアクセスしてみましょう</p>
          </div>
        ) : (
          <>
            <div className="ranking-info">
              <h2>{getPeriodLabel(selectedPeriod)}のランキング</h2>
              <p>{currentRanking.length}ソース中 上位{Math.min(currentRanking.length, 10)}位まで表示</p>
            </div>

            <div className="ranking-list">
              {currentRanking.slice(0, 10).map((stats, index) => (
                <div key={stats.source} className={`ranking-item ${index < 3 ? 'top-three' : ''}`}>
                  <div className="ranking-position">
                    <span className="rank-icon">{getRankingIcon(index + 1)}</span>
                    <span className="rank-number">#{index + 1}</span>
                  </div>

                  <div className="ranking-details">
                    <div className="source-info">
                      <h3 className="source-name">{stats.source}</h3>
                      <div className="source-meta">
                        <span className="access-count">{stats.accessCount}回アクセス</span>
                        <span className="last-accessed">最終: {formatLastAccessed(stats.lastAccessed)}</span>
                      </div>
                    </div>

                    {/* カテゴリ表示 */}
                    {Object.keys(stats.categories).length > 0 && (
                      <div className="categories">
                        <span className="categories-label">主なカテゴリ:</span>
                        <div className="category-tags">
                          {getTopCategories(stats).map(category => (
                            <span key={category} className="category-tag">
                              {category} ({stats.categories[category]}回)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 最近読んだ記事 */}
                    {stats.recentTitles.length > 0 && (
                      <div className="recent-articles">
                        <span className="recent-label">最近読んだ記事:</span>
                        <ul className="recent-list">
                          {stats.recentTitles.slice(-3).map((title, idx) => (
                            <li key={idx} className="recent-title">
                              {title.length > 50 ? title.substring(0, 50) + '...' : title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="ranking-progress">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${currentRanking.length > 0 ? (stats.accessCount / currentRanking[0].accessCount) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SourceRanking;