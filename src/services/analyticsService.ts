interface AccessRecord {
  source: string;
  timestamp: string;
  category?: string;
  title: string;
}

interface SourceStats {
  source: string;
  accessCount: number;
  lastAccessed: string;
  categories: Record<string, number>;
  recentTitles: string[];
}

interface RankingPeriod {
  daily: SourceStats[];
  weekly: SourceStats[];
  monthly: SourceStats[];
  allTime: SourceStats[];
}

class AnalyticsService {
  private readonly ANALYTICS_KEY = 'news_analytics';
  private readonly MAX_RECENT_TITLES = 5;

  // 記事アクセスを記録
  recordAccess(source: string, title: string, category?: string): void {
    try {
      const analytics = this.getAnalytics();

      const accessRecord: AccessRecord = {
        source,
        title,
        category,
        timestamp: new Date().toISOString()
      };

      analytics.push(accessRecord);

      // メモリ管理：古いデータは定期的にクリーンアップ（最大1000件）
      if (analytics.length > 1000) {
        analytics.splice(0, analytics.length - 1000);
      }

      this.saveAnalytics(analytics);
    } catch (error) {
      console.error('アクセス記録の保存に失敗:', error);
    }
  }

  // ソース別統計を取得
  getSourceStats(period: 'daily' | 'weekly' | 'monthly' | 'allTime' = 'allTime'): SourceStats[] {
    try {
      const analytics = this.getAnalytics();
      const cutoffDate = this.getCutoffDate(period);

      const filteredAnalytics = cutoffDate
        ? analytics.filter(record => new Date(record.timestamp) >= cutoffDate)
        : analytics;

      const sourceMap = new Map<string, SourceStats>();

      filteredAnalytics.forEach(record => {
        const existing = sourceMap.get(record.source);

        if (existing) {
          existing.accessCount++;
          existing.lastAccessed = record.timestamp;

          // カテゴリ別カウント
          if (record.category) {
            existing.categories[record.category] = (existing.categories[record.category] || 0) + 1;
          }

          // 最近のタイトル追加
          if (existing.recentTitles.length >= this.MAX_RECENT_TITLES) {
            existing.recentTitles.shift();
          }
          existing.recentTitles.push(record.title);
        } else {
          sourceMap.set(record.source, {
            source: record.source,
            accessCount: 1,
            lastAccessed: record.timestamp,
            categories: record.category ? { [record.category]: 1 } : {},
            recentTitles: [record.title]
          });
        }
      });

      // アクセス数順にソート
      return Array.from(sourceMap.values())
        .sort((a, b) => b.accessCount - a.accessCount);
    } catch (error) {
      console.error('統計データの取得に失敗:', error);
      return [];
    }
  }

  // ランキングを全期間取得
  getRankings(): RankingPeriod {
    return {
      daily: this.getSourceStats('daily'),
      weekly: this.getSourceStats('weekly'),
      monthly: this.getSourceStats('monthly'),
      allTime: this.getSourceStats('allTime')
    };
  }

  // トップソースを取得
  getTopSources(limit: number = 5, period: 'daily' | 'weekly' | 'monthly' | 'allTime' = 'allTime'): SourceStats[] {
    return this.getSourceStats(period).slice(0, limit);
  }

  // カテゴリ別アクセス統計
  getCategoryStats(): Record<string, number> {
    try {
      const analytics = this.getAnalytics();
      const categoryMap: Record<string, number> = {};

      analytics.forEach(record => {
        if (record.category) {
          categoryMap[record.category] = (categoryMap[record.category] || 0) + 1;
        }
      });

      return categoryMap;
    } catch (error) {
      console.error('カテゴリ統計の取得に失敗:', error);
      return {};
    }
  }

  // 今日のアクセス数を取得
  getTodayAccessCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.getAnalytics().filter(record =>
      new Date(record.timestamp) >= today
    ).length;
  }

  // 全アクセス数を取得
  getTotalAccessCount(): number {
    return this.getAnalytics().length;
  }

  // データをクリア
  clearAnalytics(): void {
    try {
      localStorage.removeItem(this.ANALYTICS_KEY);
    } catch (error) {
      console.error('分析データのクリアに失敗:', error);
    }
  }

  // アナリティクスデータを取得
  private getAnalytics(): AccessRecord[] {
    try {
      const data = localStorage.getItem(this.ANALYTICS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('分析データの読み込みに失敗:', error);
      return [];
    }
  }

  // アナリティクスデータを保存
  private saveAnalytics(analytics: AccessRecord[]): void {
    try {
      localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.error('分析データの保存に失敗:', error);
      throw new Error('分析データの保存に失敗しました');
    }
  }

  // 期間のカットオフ日を計算
  private getCutoffDate(period: 'daily' | 'weekly' | 'monthly' | 'allTime'): Date | null {
    const now = new Date();

    switch (period) {
      case 'daily':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;

      case 'weekly':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo;

      case 'monthly':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return monthAgo;

      case 'allTime':
      default:
        return null;
    }
  }

  // データエクスポート（デバッグ用）
  exportData(): string {
    const analytics = this.getAnalytics();
    return JSON.stringify(analytics, null, 2);
  }

  // データ統計サマリー
  getStatsSummary() {
    const analytics = this.getAnalytics();
    const sources = new Set(analytics.map(r => r.source)).size;
    const categories = new Set(analytics.map(r => r.category).filter(Boolean)).size;

    return {
      totalAccesses: analytics.length,
      uniqueSources: sources,
      uniqueCategories: categories,
      todayAccesses: this.getTodayAccessCount(),
      oldestRecord: analytics.length > 0 ? analytics[0].timestamp : null,
      newestRecord: analytics.length > 0 ? analytics[analytics.length - 1].timestamp : null
    };
  }
}

export const analyticsService = new AnalyticsService();
export type { SourceStats, RankingPeriod, AccessRecord };