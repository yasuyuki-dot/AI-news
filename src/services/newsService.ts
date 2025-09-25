import type { NewsArticle, NewsCategory } from '../types';
import { RealNewsService } from './realNewsService';

const MOCK_NEWS: NewsArticle[] = [
  {
    id: '1',
    title: '日本の経済成長率が2四半期連続でプラス成長を記録',
    description: '内閣府が発表した四半期GDP速報値によると、日本の経済成長率が2四半期連続でプラス成長となった。',
    content: '内閣府が発表した四半期GDP速報値によると、日本の経済成長率が2四半期連続でプラス成長となった。個人消費と設備投資の回復が寄与している。',
    url: '#',
    imageUrl: 'https://via.placeholder.com/400x200',
    publishedAt: new Date().toISOString(),
    source: 'Economic Times Japan',
    category: '経済'
  },
  {
    id: '2',
    title: 'トヨタ自動車、EV戦略の転換を発表',
    description: 'トヨタ自動車が電気自動車（EV）戦略の大幅な転換を発表し、2030年までの新たな目標を設定した。',
    content: 'トヨタ自動車が電気自動車（EV）戦略の大幅な転換を発表し、2030年までに全世界でのEV販売台数を大幅に拡大する計画を明らかにした。',
    url: '#',
    imageUrl: 'https://via.placeholder.com/400x200',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    source: 'Business News Japan',
    category: '企業'
  },
  {
    id: '3',
    title: '東京証券取引所、プライム市場で新制度導入へ',
    description: '東京証券取引所がプライム市場において新たな取引制度の導入を発表した。',
    content: '東京証券取引所がプライム市場において、より効率的な取引を実現するための新制度を2024年から導入することを発表した。',
    url: '#',
    imageUrl: 'https://via.placeholder.com/400x200',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    source: 'Market Watch Japan',
    category: '市場'
  },
  {
    id: '4',
    title: '生成AI技術の活用が日本企業で急速に拡大',
    description: '最新の調査によると、日本企業での生成AI技術の導入が急速に進んでいることが明らかになった。',
    content: '最新の調査によると、日本企業での生成AI技術の導入が急速に進んでおり、業務効率化と新サービス開発の両面で活用が拡大している。',
    url: '#',
    imageUrl: 'https://via.placeholder.com/400x200',
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    source: 'Tech News Japan',
    category: 'テクノロジー'
  }
];

export class NewsService {
  private static readonly USE_REAL_API = false; // 一時的にモックデータを使用

  static async getNews(): Promise<NewsArticle[]> {
    if (this.USE_REAL_API) {
      try {
        return await RealNewsService.getJapanNews();
      } catch (error) {
        console.error('NewsAPI エラー:', error);
        console.log('モックデータを使用します');
        return this.getMockNews();
      }
    }
    return this.getMockNews();
  }

  static async getNewsByCategory(category: NewsCategory): Promise<NewsArticle[]> {
    if (this.USE_REAL_API) {
      try {
        return await RealNewsService.getNewsByCategory(category);
      } catch (error) {
        console.error('NewsAPI エラー:', error);
        console.log('モックデータを使用します');
        return this.getMockNewsByCategory(category);
      }
    }
    return this.getMockNewsByCategory(category);
  }

  static async searchNews(query: string): Promise<NewsArticle[]> {
    if (this.USE_REAL_API) {
      try {
        return await RealNewsService.searchNews(query);
      } catch (error) {
        console.error('NewsAPI エラー:', error);
        console.log('モックデータを使用します');
        return this.getMockSearchResults(query);
      }
    }
    return this.getMockSearchResults(query);
  }

  private static async getMockNews(): Promise<NewsArticle[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_NEWS;
  }

  private static async getMockNewsByCategory(category: NewsCategory): Promise<NewsArticle[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_NEWS.filter(article => article.category === category);
  }

  private static async getMockSearchResults(query: string): Promise<NewsArticle[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return MOCK_NEWS.filter(article =>
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.description.toLowerCase().includes(query.toLowerCase())
    );
  }
}