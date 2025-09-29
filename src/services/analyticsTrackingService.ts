interface AnalyticsEvent {
  type: 'page_view' | 'article_click' | 'search' | 'category_view' | 'feature_use' | 'session_start' | 'session_end' | 'page_blur' | 'page_focus';
  timestamp: number;
  sessionId: string;
  userId?: string;
  data: Record<string, any>;
  userAgent: string;
  referrer: string;
  url: string;
}

interface SessionData {
  sessionId: string;
  startTime: number;
  endTime?: number;
  pageViews: number;
  articlesClicked: number;
  searchQueries: number;
  featuresUsed: string[];
  timeSpent: number;
}

interface DailyStats {
  date: string;
  uniqueVisitors: number;
  totalPageViews: number;
  totalSessions: number;
  avgSessionDuration: number;
  popularArticles: Array<{ title: string; clicks: number; source: string }>;
  popularCategories: Array<{ category: string; views: number }>;
  searchQueries: Array<{ query: string; count: number }>;
  featuresUsage: Array<{ feature: string; uses: number }>;
  realTimeUsers: number;
}

class AnalyticsTrackingService {
  private events: AnalyticsEvent[] = [];
  private currentSession: SessionData | null = null;
  private isTracking = true;
  private maxEvents = 1000; // ローカルストレージの制限対策
  private isDevelopmentMode = false; // 開発環境フラグ

  constructor() {
    this.checkDevelopmentMode();
    this.initializeSession();
    this.loadStoredEvents();
    this.startAutoFlush();
    this.setupVisibilityTracking();
    this.setupUnloadTracking();
  }

  // 開発環境チェック
  private checkDevelopmentMode(): void {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // localhost、127.0.0.1、または開発ポート（5173、3000、8080など）を検出
    this.isDevelopmentMode =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.includes('.local') ||
      ['5173', '3000', '8080', '4200', '8000'].includes(port);

    if (this.isDevelopmentMode) {
      console.log('🛠️ Analytics: 開発環境を検出しました。アナリティクスを無効化します。');
      this.isTracking = false;
    } else {
      console.log('📊 Analytics: 本番環境でアナリティクスを開始します。');
    }
  }

  // セッション初期化
  private initializeSession(): void {
    const sessionId = this.generateSessionId();
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      pageViews: 0,
      articlesClicked: 0,
      searchQueries: 0,
      featuresUsed: [],
      timeSpent: 0
    };

    this.trackEvent('session_start', {
      sessionId,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  // イベントトラッキング
  trackEvent(type: AnalyticsEvent['type'], data: Record<string, any> = {}): void {
    if (!this.isTracking || !this.currentSession) return;

    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      sessionId: this.currentSession.sessionId,
      data,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      url: window.location.href
    };

    this.events.push(event);
    this.updateSessionData(type, data);

    // イベント数制限
    if (this.events.length > this.maxEvents) {
      this.flushEvents();
    }

    console.log(`📊 Analytics: ${type}`, data);
  }

  // ページビュー追跡
  trackPageView(page: string, additionalData: Record<string, any> = {}): void {
    this.trackEvent('page_view', {
      page,
      title: document.title,
      ...additionalData
    });
  }

  // 記事クリック追跡
  trackArticleClick(article: {
    title: string;
    source: string;
    category?: string;
    link: string;
  }): void {
    this.trackEvent('article_click', {
      articleTitle: article.title,
      articleSource: article.source,
      articleCategory: article.category,
      articleUrl: article.link,
      clickPosition: this.getScrollPosition()
    });
  }

  // 検索追跡
  trackSearch(query: string, resultCount: number, filters: Record<string, any> = {}): void {
    this.trackEvent('search', {
      query: query.toLowerCase(),
      resultCount,
      filters,
      searchTime: Date.now()
    });
  }

  // カテゴリ表示追跡
  trackCategoryView(category: string, articlesCount: number): void {
    this.trackEvent('category_view', {
      category,
      articlesCount,
      viewTime: Date.now()
    });
  }

  // 機能使用追跡
  trackFeatureUse(feature: string, details: Record<string, any> = {}): void {
    this.trackEvent('feature_use', {
      feature,
      ...details,
      useTime: Date.now()
    });
  }

  // リアルタイム更新使用追跡
  trackRealtimeFeature(action: 'start' | 'stop' | 'frequency_change', details: Record<string, any> = {}): void {
    this.trackFeatureUse('realtime_updates', {
      action,
      ...details
    });
  }

  // 仮想スクロール使用追跡
  trackVirtualScrollFeature(action: 'enable' | 'disable' | 'performance_check', details: Record<string, any> = {}): void {
    this.trackFeatureUse('virtual_scroll', {
      action,
      ...details
    });
  }

  // 通知機能使用追跡
  trackNotificationFeature(action: 'enable' | 'disable' | 'permission_granted' | 'permission_denied', details: Record<string, any> = {}): void {
    this.trackFeatureUse('notifications', {
      action,
      ...details
    });
  }

  // セッションデータ更新
  private updateSessionData(type: AnalyticsEvent['type'], data: Record<string, any>): void {
    if (!this.currentSession) return;

    switch (type) {
      case 'page_view':
        this.currentSession.pageViews++;
        break;
      case 'article_click':
        this.currentSession.articlesClicked++;
        break;
      case 'search':
        this.currentSession.searchQueries++;
        break;
      case 'feature_use':
        if (data.feature && !this.currentSession.featuresUsed.includes(data.feature)) {
          this.currentSession.featuresUsed.push(data.feature);
        }
        break;
    }

    this.currentSession.timeSpent = Date.now() - this.currentSession.startTime;
  }

  // 統計データ生成
  generateDailyStats(date: string = this.getTodayString()): DailyStats {
    const dayEvents = this.events.filter(event =>
      this.formatDate(event.timestamp) === date
    );

    const sessions = new Set(dayEvents.map(e => e.sessionId));
    const pageViews = dayEvents.filter(e => e.type === 'page_view');
    const articleClicks = dayEvents.filter(e => e.type === 'article_click');
    const searches = dayEvents.filter(e => e.type === 'search');
    const categoryViews = dayEvents.filter(e => e.type === 'category_view');
    const featureUses = dayEvents.filter(e => e.type === 'feature_use');

    // 人気記事集計
    const articleClickCounts = new Map<string, { title: string; source: string; clicks: number }>();
    articleClicks.forEach(event => {
      const key = event.data.articleTitle;
      const existing = articleClickCounts.get(key);
      if (existing) {
        existing.clicks++;
      } else {
        articleClickCounts.set(key, {
          title: event.data.articleTitle,
          source: event.data.articleSource,
          clicks: 1
        });
      }
    });

    // 人気カテゴリ集計
    const categoryCounts = new Map<string, number>();
    categoryViews.forEach(event => {
      const category = event.data.category;
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    // 検索クエリ集計
    const searchCounts = new Map<string, number>();
    searches.forEach(event => {
      const query = event.data.query;
      searchCounts.set(query, (searchCounts.get(query) || 0) + 1);
    });

    // 機能使用集計
    const featureCounts = new Map<string, number>();
    featureUses.forEach(event => {
      const feature = event.data.feature;
      featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
    });

    // セッション継続時間計算
    const sessionDurations = Array.from(sessions).map(sessionId => {
      const sessionEvents = dayEvents.filter(e => e.sessionId === sessionId);
      if (sessionEvents.length === 0) return 0;

      const start = Math.min(...sessionEvents.map(e => e.timestamp));
      const end = Math.max(...sessionEvents.map(e => e.timestamp));
      return end - start;
    });

    const avgSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    return {
      date,
      uniqueVisitors: sessions.size,
      totalPageViews: pageViews.length,
      totalSessions: sessions.size,
      avgSessionDuration: Math.round(avgSessionDuration / 1000), // 秒単位
      popularArticles: Array.from(articleClickCounts.values())
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10),
      popularCategories: Array.from(categoryCounts.entries())
        .map(([category, views]) => ({ category, views }))
        .sort((a, b) => b.views - a.views),
      searchQueries: Array.from(searchCounts.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      featuresUsage: Array.from(featureCounts.entries())
        .map(([feature, uses]) => ({ feature, uses }))
        .sort((a, b) => b.uses - a.uses),
      realTimeUsers: this.getRealTimeUsers()
    };
  }

  // リアルタイムユーザー数（過去5分以内のアクティビティ）
  private getRealTimeUsers(): number {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > fiveMinutesAgo);
    const recentSessions = new Set(recentEvents.map(e => e.sessionId));
    return recentSessions.size;
  }

  // 全期間の統計
  getAllTimeStats(): any {
    const allDates = Array.from(new Set(
      this.events.map(e => this.formatDate(e.timestamp))
    )).sort();

    return {
      totalDays: allDates.length,
      dailyStats: allDates.map(date => this.generateDailyStats(date)),
      totalEvents: this.events.length,
      firstVisit: allDates[0],
      lastVisit: allDates[allDates.length - 1]
    };
  }

  // 全イベント取得
  getAllEvents(): AnalyticsEvent[] {
    return this.events.slice(); // コピーを返す
  }

  // フィルター用の利用可能なオプションを取得
  getAvailableFilterOptions(): {
    eventTypes: string[];
    sources: string[];
    categories: string[];
    searchTerms: string[];
    userAgents: string[];
  } {
    const eventTypes = Array.from(new Set(this.events.map(e => e.type)));
    const sources = Array.from(new Set(
      this.events
        .filter(e => e.type === 'article_click' && e.data.articleSource)
        .map(e => e.data.articleSource)
    ));
    const categories = Array.from(new Set(
      this.events
        .filter(e => e.type === 'category_view' && e.data.category)
        .map(e => e.data.category)
    ));
    const searchTerms = Array.from(new Set(
      this.events
        .filter(e => e.type === 'search' && e.data.query)
        .map(e => e.data.query)
    ));
    const userAgents = Array.from(new Set(
      this.events.map(e => {
        const ua = e.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        if (ua.includes('Mobile')) return 'Mobile';
        return 'Other';
      })
    ));

    return {
      eventTypes: eventTypes.sort(),
      sources: sources.sort(),
      categories: categories.sort(),
      searchTerms: searchTerms.sort(),
      userAgents: userAgents.sort()
    };
  }

  // データエクスポート
  exportData(): string {
    return JSON.stringify({
      events: this.events,
      currentSession: this.currentSession,
      dailyStats: this.getAllTimeStats(),
      exportTime: Date.now(),
      version: '1.0'
    }, null, 2);
  }

  // セッション終了
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.currentSession.timeSpent = this.currentSession.endTime - this.currentSession.startTime;

      this.trackEvent('session_end', {
        sessionDuration: this.currentSession.timeSpent,
        pageViews: this.currentSession.pageViews,
        articlesClicked: this.currentSession.articlesClicked,
        featuresUsed: this.currentSession.featuresUsed
      });
    }
  }

  // ユーティリティ関数
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  private getTodayString(): string {
    return this.formatDate(Date.now());
  }

  private getScrollPosition(): number {
    return Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  }

  // イベントの永続化
  private saveEvents(): void {
    try {
      localStorage.setItem('analytics_events', JSON.stringify(this.events.slice(-500))); // 最新500件のみ保存
      localStorage.setItem('analytics_session', JSON.stringify(this.currentSession));
    } catch (error) {
      console.warn('Analytics: Failed to save events', error);
    }
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('analytics_events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Analytics: Failed to load stored events', error);
    }
  }

  private flushEvents(): void {
    this.saveEvents();
    // 古いイベントを削除（メモリ使用量制限）
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents / 2);
    }
  }

  private startAutoFlush(): void {
    const flushInterval = window.setInterval(() => {
      this.saveEvents();
    }, 30000); // 30秒ごとに保存

    // クリーンアップ用にコンストラクタで設定
    window.addEventListener('beforeunload', () => {
      clearInterval(flushInterval);
    });
  }

  // ページ可視性追跡
  private setupVisibilityTracking(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_blur', { hiddenTime: Date.now() });
      } else {
        this.trackEvent('page_focus', { visibleTime: Date.now() });
      }
    });
  }

  // ページ離脱追跡
  private setupUnloadTracking(): void {
    window.addEventListener('beforeunload', () => {
      this.endSession();
      this.saveEvents();
    });
  }

  // トラッキング制御
  enableTracking(): void {
    this.isTracking = true;
    console.log('📊 Analytics: トラッキングが有効になりました。');
  }

  disableTracking(): void {
    this.isTracking = false;
    console.log('🛠️ Analytics: トラッキングが無効になりました。');
  }

  // 開発環境でも強制的にトラッキングを有効にする
  forceEnableTracking(): void {
    this.isTracking = true;
    this.isDevelopmentMode = false;
    console.log('🔧 Analytics: 開発環境でのトラッキングが強制的に有効になりました。');
  }

  // 開発環境の状態確認
  isDevelopment(): boolean {
    return this.isDevelopmentMode;
  }

  // トラッキング状態確認
  isTrackingEnabled(): boolean {
    return this.isTracking;
  }

  clearData(): void {
    this.events = [];
    this.currentSession = null;
    localStorage.removeItem('analytics_events');
    localStorage.removeItem('analytics_session');
  }

  // デバッグ情報
  getDebugInfo() {
    return {
      eventsCount: this.events.length,
      currentSession: this.currentSession,
      isTracking: this.isTracking,
      isDevelopmentMode: this.isDevelopmentMode,
      hostname: window.location.hostname,
      port: window.location.port,
      todayStats: this.generateDailyStats()
    };
  }
}

export const analyticsTrackingService = new AnalyticsTrackingService();
export type { AnalyticsEvent, SessionData, DailyStats };