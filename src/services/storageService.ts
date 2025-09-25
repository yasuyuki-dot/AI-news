import type { NewsItem } from '../types/news';

export interface SavedNewsItem extends NewsItem {
  savedAt: string;
  id: string;
}

class StorageService {
  private readonly SAVED_NEWS_KEY = 'saved_news';
  private readonly SEARCH_HISTORY_KEY = 'search_history';

  // 記事保存関連
  saveArticle(article: NewsItem): void {
    const savedArticles = this.getSavedArticles();
    const id = this.generateId(article.title + article.link);

    // 重複チェック
    if (savedArticles.some(item => item.id === id)) {
      throw new Error('この記事は既に保存されています');
    }

    const savedArticle: SavedNewsItem = {
      ...article,
      id,
      savedAt: new Date().toISOString()
    };

    savedArticles.unshift(savedArticle);
    this.setSavedArticles(savedArticles);
  }

  getSavedArticles(): SavedNewsItem[] {
    try {
      const saved = localStorage.getItem(this.SAVED_NEWS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('保存記事の読み込みに失敗しました:', error);
      return [];
    }
  }

  removeSavedArticle(id: string): void {
    const savedArticles = this.getSavedArticles();
    const filtered = savedArticles.filter(article => article.id !== id);
    this.setSavedArticles(filtered);
  }

  isArticleSaved(article: NewsItem): boolean {
    const id = this.generateId(article.title + article.link);
    const savedArticles = this.getSavedArticles();
    return savedArticles.some(item => item.id === id);
  }

  private setSavedArticles(articles: SavedNewsItem[]): void {
    try {
      localStorage.setItem(this.SAVED_NEWS_KEY, JSON.stringify(articles));
    } catch (error) {
      console.error('記事の保存に失敗しました:', error);
      throw new Error('記事の保存に失敗しました');
    }
  }

  // 検索履歴関連
  addSearchHistory(query: string): void {
    if (!query.trim()) return;

    const history = this.getSearchHistory();
    const filtered = history.filter(item => item !== query);
    filtered.unshift(query);

    // 最大20件まで保持
    const limited = filtered.slice(0, 20);

    try {
      localStorage.setItem(this.SEARCH_HISTORY_KEY, JSON.stringify(limited));
    } catch (error) {
      console.error('検索履歴の保存に失敗しました:', error);
    }
  }

  getSearchHistory(): string[] {
    try {
      const history = localStorage.getItem(this.SEARCH_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('検索履歴の読み込みに失敗しました:', error);
      return [];
    }
  }

  clearSearchHistory(): void {
    try {
      localStorage.removeItem(this.SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('検索履歴のクリアに失敗しました:', error);
    }
  }

  // ユーティリティ
  private generateId(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(36);
  }

  // 統計情報
  getStorageStats(): {
    savedArticlesCount: number;
    searchHistoryCount: number;
  } {
    return {
      savedArticlesCount: this.getSavedArticles().length,
      searchHistoryCount: this.getSearchHistory().length
    };
  }
}

export const storageService = new StorageService();