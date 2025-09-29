import type { NewsItem, NewsSource } from '../types/news';
import { arxivService } from './arxivService';

class RSSService {
  private parser = new DOMParser();
  private cache = new Map<string, { data: NewsItem[], timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ
  private readonly REQUEST_TIMEOUT = 4000; // 4秒タイムアウト（高速化）
  private proxyUrls = [
    // プライマリプロキシ (corsproxy.io) - 最も高速
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // バックアップ プロキシ (allorigins) - 安定
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  ];

  // キャッシュチェック
  private getCachedData(key: string): NewsItem[] | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  // キャッシュ保存
  private setCachedData(key: string, data: NewsItem[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // タイムアウト付きfetch
  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async fetchRSSFeed(source: NewsSource): Promise<NewsItem[]> {
    // キャッシュチェック
    const cachedData = this.getCachedData(source.url);
    if (cachedData) {
      console.log(`📦 ${source.name}: キャッシュから取得 (${cachedData.length}件)`);
      return cachedData;
    }

    console.log(`🔄 ${source.name}: 新規取得中...`);

    // arXiv API専用処理
    if (source.url === 'ARXIV_API_SOURCE') {
      const data = await arxivService.fetchRecentPapers(arxivService.getAICategories(), 15);
      this.setCachedData(source.url, data);
      return data;
    }

    // 複数プロキシでフォールバック試行（高速化）
    for (let i = 0; i < this.proxyUrls.length; i++) {
      try {
        const proxyUrl = this.proxyUrls[i](source.url);
        const proxyNames = ['corsproxy.io', 'allorigins'];
        const proxyName = proxyNames[i] || `proxy-${i}`;

        const response = await this.fetchWithTimeout(proxyUrl, this.REQUEST_TIMEOUT);

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`${proxyName}: レート制限 (429) - 次のプロキシを試行`);
            continue;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let xmlContent: string;

        // プロキシ別のレスポンス処理（簡素化）
        if (i === 0) {
          // corsproxy.io は直接XML
          xmlContent = await response.text();
        } else {
          // allorigins の場合は JSON形式
          const data = await response.json();
          xmlContent = data.contents;
        }

        const xmlDoc = this.parser.parseFromString(xmlContent, 'text/xml');
        const items = this.parseRSSItems(xmlDoc, source);

        if (items.length > 0) {
          console.log(`✅ ${source.name}: ${items.length}件取得 (${proxyName})`);
          this.setCachedData(source.url, items); // キャッシュに保存
          return items;
        }
      } catch (error) {
        const proxyNames = ['corsproxy.io', 'allorigins'];
        const proxyName = proxyNames[i] || `proxy-${i}`;
        console.warn(`${proxyName} failed for ${source.name}:`, error);

        // 最後のプロキシでもエラーの場合
        if (i === this.proxyUrls.length - 1) {
          console.warn(`❌ ${source.name} - すべてのプロキシで失敗`);
        }
      }
    }

    return [];
  }

  private parseRSSItems(xmlDoc: Document, source: NewsSource): NewsItem[] {
    const items: NewsItem[] = [];
    const itemElements = xmlDoc.querySelectorAll('item');

    itemElements.forEach((item) => {
      const title = this.getElementText(item, 'title');
      const description = this.getElementText(item, 'description');
      const link = this.getElementText(item, 'link');
      const pubDate = this.getElementText(item, 'pubDate');

      if (title && link) {
        items.push({
          title: this.cleanText(title),
          description: this.cleanText(description),
          link,
          pubDate: this.formatDate(pubDate),
          source: source.name,
          category: source.category
        });
      }
    });

    return items;
  }

  private getElementText(parent: Element, tagName: string): string {
    const element = parent.querySelector(tagName);
    return element?.textContent?.trim() || '';
  }

  private cleanText(text: string): string {
    // HTMLタグとCDATAを除去
    return text
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }


  async fetchAllFeeds(sources: NewsSource[]): Promise<NewsItem[]> {
    console.log(`🚀 RSS取得開始: ${sources.length}ソースを並列処理中...`);
    const startTime = Date.now();

    // 高速並列処理 - すべて同時実行
    const promises = sources.map(source => this.fetchRSSFeed(source));
    const results = await Promise.allSettled(promises);

    const allItems: NewsItem[] = [];
    let successCount = 0;
    let failCount = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
        if (result.value.length > 0) {
          successCount++;
        }
      } else {
        failCount++;
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`📊 RSS取得完了: ${duration}ms - 成功 ${successCount}/${sources.length}ソース (失敗 ${failCount}ソース)`);

    // 日付順でソート（新しい順）
    return allItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
  }

}

export const rssService = new RSSService();