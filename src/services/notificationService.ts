import type { NewsItem } from '../types/news';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  categories: string[];
  keywords: string[];
  soundEnabled: boolean;
  showOnlyWhenInactive: boolean;
  maxNotificationsPerHour: number;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private settings: NotificationSettings = {
    enabled: false,
    categories: ['AI・機械学習'],
    keywords: ['ChatGPT', 'OpenAI', 'AI', '人工知能', 'GPT'],
    soundEnabled: true,
    showOnlyWhenInactive: true,
    maxNotificationsPerHour: 5
  };
  private notificationCount = 0;
  private hourlyResetTimer: number | null = null;

  constructor() {
    this.initializeNotifications();
    this.setupHourlyReset();
  }

  // 通知の初期化
  private async initializeNotifications(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('このブラウザは通知をサポートしていません');
      return;
    }

    this.permission = Notification.permission;
    console.log(`通知許可状態: ${this.permission}`);

    // 保存された設定を読み込み
    this.loadSettings();
  }

  // 通知許可のリクエスト
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('通知がサポートされていません');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log(`通知許可結果: ${this.permission}`);

      if (this.permission === 'granted') {
        this.settings.enabled = true;
        this.saveSettings();
        return true;
      }

      return false;
    } catch (error) {
      console.error('通知許可リクエストエラー:', error);
      return false;
    }
  }

  // ニュース通知の送信
  async notifyNews(newsItems: NewsItem[]): Promise<void> {
    if (!this.shouldSendNotifications()) {
      return;
    }

    const importantNews = this.filterImportantNews(newsItems);

    if (importantNews.length === 0) {
      return;
    }

    // 通知数制限チェック
    if (this.notificationCount >= this.settings.maxNotificationsPerHour) {
      console.log('1時間あたりの通知数制限に達しました');
      return;
    }

    for (const news of importantNews.slice(0, 3)) { // 最大3件まで
      if (this.notificationCount >= this.settings.maxNotificationsPerHour) {
        break;
      }

      await this.sendNewsNotification(news);
      this.notificationCount++;

      // 通知間隔を空ける
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 個別ニュース通知の送信
  private async sendNewsNotification(news: NewsItem): Promise<void> {
    const options: NotificationOptions = {
      title: `📰 ${news.source}`,
      body: this.truncateText(news.title, 100),
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: `news-${news.link}`,
      data: { url: news.link, newsItem: news },
      requireInteraction: false,
      silent: !this.settings.soundEnabled
    };

    try {
      const notification = new Notification(options.title, options);

      // 通知クリック時の処理
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        window.open(news.link, '_blank');
        notification.close();
      };

      // 5秒後に自動で閉じる
      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log(`通知送信: ${news.title}`);

    } catch (error) {
      console.error('通知送信エラー:', error);
    }
  }

  // 重要なニュースのフィルタリング
  private filterImportantNews(newsItems: NewsItem[]): NewsItem[] {
    return newsItems.filter(news => {
      // カテゴリフィルター
      if (this.settings.categories.length > 0) {
        if (!news.category || !this.settings.categories.includes(news.category)) {
          return false;
        }
      }

      // キーワードフィルター
      if (this.settings.keywords.length > 0) {
        const text = `${news.title} ${news.description}`.toLowerCase();
        const hasKeyword = this.settings.keywords.some(keyword =>
          text.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return false;
        }
      }

      return true;
    });
  }

  // 通知を送信すべきかチェック
  private shouldSendNotifications(): boolean {
    if (!this.settings.enabled || this.permission !== 'granted') {
      return false;
    }

    // 非アクティブ時のみ通知する設定の場合
    if (this.settings.showOnlyWhenInactive && !document.hidden) {
      return false;
    }

    return true;
  }

  // システム通知の送信（接続状態など）
  async notifySystem(message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    if (!this.shouldSendNotifications()) {
      return;
    }

    const icons = {
      info: '📘',
      warning: '⚠️',
      error: '❌'
    };

    const options: NotificationOptions = {
      title: `${icons[type]} AIニュース`,
      body: message,
      icon: '/vite.svg',
      tag: `system-${type}`,
      silent: type === 'info'
    };

    try {
      const notification = new Notification(options.title, options);
      setTimeout(() => notification.close(), 3000);
    } catch (error) {
      console.error('システム通知エラー:', error);
    }
  }

  // 設定の更新
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    console.log('通知設定が更新されました:', this.settings);
  }

  // 現在の設定を取得
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // 通知の無効化
  disable(): void {
    this.settings.enabled = false;
    this.saveSettings();
    console.log('通知が無効化されました');
  }

  // テスト通知の送信
  async sendTestNotification(): Promise<void> {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('通知の許可が必要です');
      }
    }

    await this.notifySystem('テスト通知です。通知が正常に動作しています。', 'info');
  }

  // 設定の保存
  private saveSettings(): void {
    try {
      localStorage.setItem('notification-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('通知設定の保存エラー:', error);
    }
  }

  // 設定の読み込み
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('notification-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsedSettings };
        console.log('通知設定を読み込みました:', this.settings);
      }
    } catch (error) {
      console.error('通知設定の読み込みエラー:', error);
    }
  }

  // 1時間ごとの通知数リセット
  private setupHourlyReset(): void {
    this.hourlyResetTimer = window.setInterval(() => {
      this.notificationCount = 0;
      console.log('通知数カウンターをリセットしました');
    }, 60 * 60 * 1000); // 1時間
  }

  // テキストの切り詰め
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  // サービスの破棄
  destroy(): void {
    if (this.hourlyResetTimer) {
      clearInterval(this.hourlyResetTimer);
    }
  }

  // 通知統計の取得
  getStats() {
    return {
      permission: this.permission,
      enabled: this.settings.enabled,
      notificationCount: this.notificationCount,
      maxPerHour: this.settings.maxNotificationsPerHour,
      supportedFeatures: {
        notifications: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator
      }
    };
  }
}

export const notificationService = new NotificationService();