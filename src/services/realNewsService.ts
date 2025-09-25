import type { NewsArticle, NewsCategory } from '../types';

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: { id: string; name: string };
    author: string;
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
    content: string;
  }>;
}

export class RealNewsService {
  // NewsAPIを使用した実装例
  static async getJapanNews(): Promise<NewsArticle[]> {
    const response = await fetch(
      `${NEWS_API_BASE_URL}/top-headlines?country=jp&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('ニュースの取得に失敗しました');
    }

    const data: NewsAPIResponse = await response.json();

    return data.articles.map(article => ({
      id: article.url,
      title: article.title,
      description: article.description,
      content: article.content || article.description,
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source.name,
      category: this.categorizeArticle(article.title + ' ' + article.description)
    }));
  }

  // RSSフィードを使用した実装例
  static async getRSSNews(rssUrl: string): Promise<any[]> {
    try {
      // CORSプロキシを使用（本番では適切なバックエンド実装が必要）
      const proxyUrl = 'https://api.allorigins.win/get?url=';
      const response = await fetch(proxyUrl + encodeURIComponent(rssUrl));
      const data = await response.json();

      // RSSをパースしてニュース記事に変換
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
      const items = xmlDoc.querySelectorAll('item');

      return Array.from(items).map(item => ({
        id: item.querySelector('link')?.textContent || '',
        title: item.querySelector('title')?.textContent || '',
        description: item.querySelector('description')?.textContent || '',
        url: item.querySelector('link')?.textContent || '',
        publishedAt: item.querySelector('pubDate')?.textContent || '',
        source: rssUrl.includes('nikkei') ? '日本経済新聞' : 'RSS',
        category: '経済'
      }));
    } catch (error) {
      console.error('RSSの取得に失敗:', error);
      return [];
    }
  }

  static async getNewsByCategory(category: NewsCategory): Promise<NewsArticle[]> {
    if (!NEWS_API_KEY) {
      throw new Error('NewsAPI キーが設定されていません');
    }

    const query = this.getCategoryQuery(category);
    const response = await fetch(
      `${NEWS_API_BASE_URL}/everything?q=${query}&language=ja&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('ニュースの取得に失敗しました');
    }

    const data: NewsAPIResponse = await response.json();

    return data.articles.map(article => ({
      id: article.url,
      title: article.title,
      description: article.description || '',
      content: article.content || article.description || '',
      url: article.url,
      imageUrl: article.urlToImage || undefined,
      publishedAt: article.publishedAt,
      source: article.source.name,
      category: category
    }));
  }

  static async searchNews(query: string): Promise<NewsArticle[]> {
    if (!NEWS_API_KEY) {
      throw new Error('NewsAPI キーが設定されていません');
    }

    const response = await fetch(
      `${NEWS_API_BASE_URL}/everything?q=${encodeURIComponent(query)}&language=ja&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('ニュースの検索に失敗しました');
    }

    const data: NewsAPIResponse = await response.json();

    return data.articles.map(article => ({
      id: article.url,
      title: article.title,
      description: article.description || '',
      content: article.content || article.description || '',
      url: article.url,
      imageUrl: article.urlToImage || undefined,
      publishedAt: article.publishedAt,
      source: article.source.name,
      category: this.categorizeArticle(article.title + ' ' + (article.description || ''))
    }));
  }

  private static getCategoryQuery(category: NewsCategory): string {
    const queries = {
      '経済': '経済 OR GDP OR 金利 OR インフレ',
      '企業': '企業 OR 会社 OR 業績 OR 決算',
      '市場': '株価 OR 市場 OR 投資 OR 証券',
      'テクノロジー': 'AI OR DX OR IT OR テクノロジー',
      '政治': '政治 OR 政府 OR 政策',
      'その他': 'ニュース'
    };
    return encodeURIComponent(queries[category] || 'ニュース');
  }

  private static categorizeArticle(text: string): NewsCategory {
    const keywords = {
      '経済': ['GDP', '経済', '金利', 'インフレ'],
      '企業': ['企業', '会社', '業績', '決算'],
      '市場': ['株価', '市場', '投資', '証券'],
      'テクノロジー': ['AI', 'DX', 'IT', 'テクノロジー'],
      '政治': ['政治', '政府', '政策']
    };

    for (const [category, terms] of Object.entries(keywords)) {
      if (terms.some(term => text.includes(term))) {
        return category as NewsCategory;
      }
    }

    return 'その他';
  }
}

// 使用方法のメモ
/*
1. NewsAPIの場合:
   - https://newsapi.org/ でAPIキー取得
   - NEWS_API_KEY を実際のキーに置き換え

2. RSSの場合:
   - CORSの問題があるため、本番環境では
     バックエンドでRSS取得を行う

3. 統合方法:
   - newsService.ts でこのクラスを呼び出す
   - 環境変数でAPIキーを管理
*/