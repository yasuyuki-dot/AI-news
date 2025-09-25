import type { NewsArticle, BookmarkedArticle } from '../types';

export class BookmarkService {
  private static STORAGE_KEY = 'bookmarked_articles';

  static getBookmarkedArticles(): BookmarkedArticle[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static addBookmark(article: NewsArticle): void {
    const bookmarks = this.getBookmarkedArticles();
    const bookmarkedArticle: BookmarkedArticle = {
      ...article,
      bookmarkedAt: new Date().toISOString()
    };

    const updatedBookmarks = [bookmarkedArticle, ...bookmarks.filter(b => b.id !== article.id)];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedBookmarks));
  }

  static removeBookmark(articleId: string): void {
    const bookmarks = this.getBookmarkedArticles();
    const updatedBookmarks = bookmarks.filter(b => b.id !== articleId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedBookmarks));
  }

  static isBookmarked(articleId: string): boolean {
    const bookmarks = this.getBookmarkedArticles();
    return bookmarks.some(b => b.id === articleId);
  }
}