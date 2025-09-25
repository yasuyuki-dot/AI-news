import type { NewsItem } from '../types/news';

export interface SearchFilters {
  category?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

class SearchService {
  searchNews(
    articles: NewsItem[],
    query: string,
    filters: SearchFilters = {}
  ): NewsItem[] {
    if (!query.trim() && Object.keys(filters).length === 0) {
      return articles;
    }

    let filtered = [...articles];

    // テキスト検索
    if (query.trim()) {
      const searchTerms = this.normalizeSearchQuery(query);
      filtered = filtered.filter(article =>
        this.matchesSearchTerms(article, searchTerms)
      );
    }

    // フィルター適用
    if (filters.category) {
      filtered = filtered.filter(article =>
        article.category === filters.category
      );
    }

    if (filters.source) {
      filtered = filtered.filter(article =>
        article.source.includes(filters.source!)
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(article =>
        new Date(article.pubDate) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // 日付の最後まで含める
      filtered = filtered.filter(article =>
        new Date(article.pubDate) <= toDate
      );
    }

    // 関連度順にソート
    if (query.trim()) {
      filtered = this.sortByRelevance(filtered, query);
    }

    return filtered;
  }

  private normalizeSearchQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[　\s]+/g, ' ') // 全角・半角スペースを統一
      .trim()
      .split(' ')
      .filter(term => term.length > 0);
  }

  private matchesSearchTerms(article: NewsItem, searchTerms: string[]): boolean {
    const searchText = [
      article.title,
      article.description,
      article.source
    ]
      .join(' ')
      .toLowerCase();

    // すべての検索語が含まれている場合にマッチ
    return searchTerms.every(term => searchText.includes(term));
  }

  private sortByRelevance(articles: NewsItem[], query: string): NewsItem[] {
    const searchTerms = this.normalizeSearchQuery(query);

    return articles
      .map(article => ({
        article,
        score: this.calculateRelevanceScore(article, searchTerms)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.article);
  }

  private calculateRelevanceScore(article: NewsItem, searchTerms: string[]): number {
    let score = 0;

    const title = article.title.toLowerCase();
    const description = article.description.toLowerCase();

    searchTerms.forEach(term => {
      // タイトルにマッチした場合は高得点
      if (title.includes(term)) {
        score += 10;
      }

      // 説明文にマッチした場合は中程度の得点
      if (description.includes(term)) {
        score += 5;
      }

      // タイトルの最初にマッチした場合はさらにボーナス
      if (title.startsWith(term)) {
        score += 5;
      }
    });

    // 新しい記事にボーナス
    const articleDate = new Date(article.pubDate);
    const now = new Date();
    const daysDiff = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff <= 1) {
      score += 3;
    } else if (daysDiff <= 7) {
      score += 1;
    }

    return score;
  }

  // 検索サジェスション
  generateSearchSuggestions(
    articles: NewsItem[],
    query: string,
    limit: number = 5
  ): string[] {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    // タイトルから関連キーワードを抽出
    articles.forEach(article => {
      const words = article.title
        .toLowerCase()
        .split(/[　\s\n\r\t。、！？]+/)
        .filter(word =>
          word.length >= 2 &&
          word.includes(queryLower) &&
          word !== queryLower
        );

      words.forEach(word => {
        if (suggestions.size < limit * 2) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions).slice(0, limit);
  }
}

export const searchService = new SearchService();