import { analyticsTrackingService } from './analyticsTrackingService';

interface LogEntry {
  timestamp: string;
  event: string;
  data: any;
}

class DataLogger {
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly LOG_INTERVAL = 30000; // 30秒ごと
  private intervalId: number | null = null;
  private isProduction = false; // 本番環境フラグ

  constructor() {
    this.checkEnvironment();
    this.startLogging();
    this.setupPeriodicSave();
  }

  // 環境チェック
  private checkEnvironment(): void {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // 本番環境の検出（localhost以外）
    this.isProduction =
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      hostname !== '::1' &&
      !hostname.includes('.local') &&
      !['5173', '5174', '3000', '8080', '4200', '8000'].includes(port);

    console.log(`📁 DataLogger: ${this.isProduction ? '本番' : '開発'}環境を検出`);
  }

  private startLogging(): void {
    // 定期的にアナリティクスデータを記録
    this.intervalId = window.setInterval(() => {
      this.logCurrentState();
    }, this.LOG_INTERVAL);

    // ページ離脱時にも記録
    window.addEventListener('beforeunload', () => {
      this.logCurrentState();
      this.saveToFile(true); // 強制保存
    });
  }

  private logCurrentState(): void {
    try {
      // 現在のアナリティクス状態を取得
      const debugInfo = analyticsTrackingService.getDebugInfo();
      const dailyStats = analyticsTrackingService.generateDailyStats();
      const allTimeStats = analyticsTrackingService.getAllTimeStats();

      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        event: 'periodic_analytics_snapshot',
        data: {
          debug: debugInfo,
          daily: dailyStats,
          allTime: allTimeStats,
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      };

      this.addToBuffer(logEntry);

      // ファイルに保存（開発環境用）
      this.saveToFile();

    } catch (error) {
      console.error('Data logging failed:', error);
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // バッファサイズ制限
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer = this.logBuffer.slice(-this.MAX_BUFFER_SIZE / 2);
    }
  }

  // コンソールとダウンロードでデータを出力
  private saveToFile(force: boolean = false): void {
    if (this.logBuffer.length === 0 && !force) return;

    try {
      // 1. コンソールに出力（開発時確認用）
      if (!this.isProduction) {
        console.group('📊 Analytics Data Log (Dev)');
        console.log('Buffer size:', this.logBuffer.length);
        console.log('Latest entries:', this.logBuffer.slice(-3));
        console.groupEnd();
      }

      // 2. ローカルストレージに保存（バックアップ）
      const dataKey = `analytics_log_${this.formatDate(new Date())}`;
      localStorage.setItem(dataKey, JSON.stringify({
        exported: new Date().toISOString(),
        entries: this.logBuffer,
        summary: this.generateSummary()
      }));

      // 3. 自動ダウンロード（本番環境のみ、1時間に1回程度）
      if (this.isProduction) {
        const now = new Date();
        const lastDownload = localStorage.getItem('last_analytics_download');
        const shouldDownload = force || !lastDownload ||
          (now.getTime() - new Date(lastDownload).getTime()) > (60 * 60 * 1000); // 1時間

        if (shouldDownload) {
          this.downloadAnalyticsFile();
          localStorage.setItem('last_analytics_download', now.toISOString());
        }
      } else if (force) {
        // 開発環境では手動でのみダウンロード実行
        this.downloadAnalyticsFile();
      }

    } catch (error) {
      console.error('Failed to save analytics data:', error);
    }
  }

  private downloadAnalyticsFile(): void {
    try {
      const fullData = {
        exported: new Date().toISOString(),
        summary: this.generateSummary(),
        recentLogs: this.logBuffer,
        fullAnalytics: analyticsTrackingService.exportData()
      };

      const jsonData = JSON.stringify(fullData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${this.formatDate(new Date())}-${this.formatTime(new Date())}.json`;
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      console.log('📁 Analytics data downloaded:', a.download);

    } catch (error) {
      console.error('Failed to download analytics file:', error);
    }
  }

  private generateSummary(): any {
    try {
      const stats = analyticsTrackingService.generateDailyStats();
      const allTime = analyticsTrackingService.getAllTimeStats();

      return {
        generated: new Date().toISOString(),
        today: {
          date: stats.date,
          visitors: stats.uniqueVisitors,
          pageViews: stats.totalPageViews,
          sessions: stats.totalSessions,
          avgDuration: stats.avgSessionDuration,
          topArticles: stats.popularArticles.slice(0, 5),
          topCategories: stats.popularCategories.slice(0, 3),
          topSearches: stats.searchQueries.slice(0, 5)
        },
        allTime: {
          totalDays: allTime.totalDays,
          totalEvents: allTime.totalEvents,
          firstVisit: allTime.firstVisit,
          lastVisit: allTime.lastVisit
        },
        system: {
          bufferSize: this.logBuffer.length,
          loggingInterval: this.LOG_INTERVAL / 1000 + 's',
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      };
    } catch (error) {
      return { error: 'Failed to generate summary', message: error };
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0].replace(/:/g, '-');
  }

  private setupPeriodicSave(): void {
    // 5分ごとにローカルストレージに保存
    setInterval(() => {
      this.saveToFile();
    }, 5 * 60 * 1000);
  }

  // 手動でデータを取得する関数
  public getCurrentData(): any {
    return {
      logs: this.logBuffer,
      summary: this.generateSummary(),
      analytics: analyticsTrackingService.exportData()
    };
  }

  // 手動でファイル保存
  public forceDownload(): void {
    this.downloadAnalyticsFile();
  }

  // ログ停止
  public stopLogging(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 環境確認
  public isProductionMode(): boolean {
    return this.isProduction;
  }

  // 設定確認
  public getConfig(): any {
    return {
      isProduction: this.isProduction,
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.MAX_BUFFER_SIZE,
      logInterval: this.LOG_INTERVAL / 1000 + 's',
      autoDownloadEnabled: this.isProduction
    };
  }
}

// シングルトンインスタンス
export const dataLogger = new DataLogger();

// デバッグ用にグローバルに公開
(window as any).analyticsLogger = dataLogger;