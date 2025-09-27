import type { NewsItem } from '../types/news';
import { rssService } from './rssService';
import { NEWS_SOURCES } from '../types/news';

export interface RealtimeEvent {
  type: 'news_update' | 'connection_status' | 'error';
  data: NewsItem[] | string | boolean;
  timestamp: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastUpdate: number;
  retryCount: number;
  error?: string;
}

class RealtimeService {
  private subscribers: Map<string, (event: RealtimeEvent) => void> = new Map();
  private updateInterval: number | null = null;
  private lastNewsUpdate: number = 0;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    lastUpdate: 0,
    retryCount: 0
  };
  private maxRetries = 5;
  private baseRetryDelay = 1000;

  private readonly UPDATE_INTERVALS = {
    HIGH_FREQUENCY: 2 * 60 * 1000,    // 2分 - 高頻度更新
    NORMAL: 5 * 60 * 1000,            // 5分 - 通常更新
    LOW_FREQUENCY: 10 * 60 * 1000     // 10分 - 低頻度更新
  };

  private currentUpdateInterval = this.UPDATE_INTERVALS.NORMAL;

  constructor() {
    this.setupVisibilityListener();
  }

  // リアルタイム更新の開始
  startRealtimeUpdates(updateFrequency: 'high' | 'normal' | 'low' = 'normal'): void {
    console.log('🔴 Starting realtime news updates...');

    // 更新頻度の設定
    this.setUpdateFrequency(updateFrequency);

    // 既存の間隔をクリア
    this.stopRealtimeUpdates();

    // 接続状態を更新
    this.updateConnectionStatus(true);

    // 初回更新を即座に実行
    this.performNewsUpdate();

    // 定期更新の開始
    this.updateInterval = window.setInterval(() => {
      this.performNewsUpdate();
    }, this.currentUpdateInterval);

    this.notifySubscribers({
      type: 'connection_status',
      data: this.connectionStatus.connected,
      timestamp: Date.now()
    });
  }

  // リアルタイム更新の停止
  stopRealtimeUpdates(): void {
    console.log('🔴 Stopping realtime news updates...');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.updateConnectionStatus(false);
    this.notifySubscribers({
      type: 'connection_status',
      data: this.connectionStatus.connected,
      timestamp: Date.now()
    });
  }

  // 更新頻度の設定
  setUpdateFrequency(frequency: 'high' | 'normal' | 'low'): void {
    switch (frequency) {
      case 'high':
        this.currentUpdateInterval = this.UPDATE_INTERVALS.HIGH_FREQUENCY;
        break;
      case 'normal':
        this.currentUpdateInterval = this.UPDATE_INTERVALS.NORMAL;
        break;
      case 'low':
        this.currentUpdateInterval = this.UPDATE_INTERVALS.LOW_FREQUENCY;
        break;
    }

    // 既に動作中の場合は再起動
    if (this.updateInterval) {
      this.stopRealtimeUpdates();
      this.startRealtimeUpdates(frequency);
    }
  }

  // イベント購読
  subscribe(id: string, callback: (event: RealtimeEvent) => void): void {
    this.subscribers.set(id, callback);
    console.log(`📡 Subscriber added: ${id} (total: ${this.subscribers.size})`);
  }

  // 購読解除
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
    console.log(`📡 Subscriber removed: ${id} (remaining: ${this.subscribers.size})`);

    // 購読者がいない場合は更新を停止
    if (this.subscribers.size === 0) {
      this.stopRealtimeUpdates();
    }
  }

  // 手動更新の実行
  async triggerManualUpdate(): Promise<NewsItem[]> {
    console.log('🔄 Manual update triggered');
    return await this.performNewsUpdate();
  }

  // 接続状態の取得
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // ニュース更新の実行
  private async performNewsUpdate(): Promise<NewsItem[]> {
    try {
      console.log('📰 Fetching latest news...');
      const startTime = Date.now();

      const newsItems = await rssService.fetchAllFeeds(NEWS_SOURCES);

      const updateTime = Date.now();
      const fetchDuration = updateTime - startTime;

      // 新しいニュースがあるかチェック
      const hasNewNews = this.hasNewNewsItems(newsItems);

      if (hasNewNews || this.lastNewsUpdate === 0) {
        this.lastNewsUpdate = updateTime;

        console.log(`✅ News updated: ${newsItems.length} items (${fetchDuration}ms)`);

        // 購読者に通知
        this.notifySubscribers({
          type: 'news_update',
          data: newsItems,
          timestamp: updateTime
        });
      } else {
        console.log('📰 No new news items found');
      }

      // 成功時の接続状態更新
      this.updateConnectionStatus(true, undefined, 0);

      return newsItems;

    } catch (error) {
      console.error('❌ Realtime update failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // 失敗時の接続状態更新
      this.updateConnectionStatus(false, errorMessage);

      // エラー通知
      this.notifySubscribers({
        type: 'error',
        data: errorMessage,
        timestamp: Date.now()
      });

      // リトライ機能
      this.handleRetry();

      return [];
    }
  }

  // 新しいニュースアイテムがあるかチェック
  private hasNewNewsItems(newsItems: NewsItem[]): boolean {
    if (newsItems.length === 0) return false;

    // 最新記事の日付をチェック
    const latestNewsDate = Math.max(
      ...newsItems.map(item => new Date(item.pubDate).getTime())
    );

    return latestNewsDate > this.lastNewsUpdate;
  }

  // 購読者への通知
  private notifySubscribers(event: RealtimeEvent): void {
    this.subscribers.forEach((callback, id) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error notifying subscriber ${id}:`, error);
      }
    });
  }

  // 接続状態の更新
  private updateConnectionStatus(connected: boolean, error?: string, retryCount?: number): void {
    this.connectionStatus = {
      connected,
      lastUpdate: Date.now(),
      retryCount: retryCount ?? this.connectionStatus.retryCount,
      error
    };
  }

  // リトライ処理
  private handleRetry(): void {
    if (this.connectionStatus.retryCount < this.maxRetries) {
      const retryDelay = this.baseRetryDelay * Math.pow(2, this.connectionStatus.retryCount);

      console.log(`🔄 Retrying in ${retryDelay}ms (attempt ${this.connectionStatus.retryCount + 1}/${this.maxRetries})`);

      setTimeout(() => {
        this.connectionStatus.retryCount++;
        this.performNewsUpdate();
      }, retryDelay);
    } else {
      console.error('❌ Max retries reached. Stopping realtime updates.');
      this.stopRealtimeUpdates();
    }
  }

  // ページの可視性変更に対応
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // ページが非表示になった場合は低頻度更新に切り替え
        if (this.updateInterval) {
          this.setUpdateFrequency('low');
        }
      } else {
        // ページが表示された場合は通常更新に戻し、即座に更新
        if (this.updateInterval) {
          this.setUpdateFrequency('normal');
          this.performNewsUpdate();
        }
      }
    });
  }

  // デバッグ情報の取得
  getDebugInfo() {
    return {
      subscribers: this.subscribers.size,
      connectionStatus: this.connectionStatus,
      updateInterval: this.currentUpdateInterval,
      isActive: this.updateInterval !== null,
      lastNewsUpdate: new Date(this.lastNewsUpdate).toLocaleString()
    };
  }
}

export const realtimeService = new RealtimeService();