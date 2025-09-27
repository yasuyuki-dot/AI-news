import type { NewsItem, NewsSource } from '../types/news';
import { arxivService } from './arxivService';

class RSSService {
  private parser = new DOMParser();
  private proxyUrls = [
    // プライマリプロキシ (allorigins)
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    // バックアップ プロキシ (corsproxy.io)
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // 追加プロキシ (thingproxy)
    (url: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
    // 追加プロキシ (jsonp)
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  async fetchRSSFeed(source: NewsSource): Promise<NewsItem[]> {
    console.log(`Fetching RSS from ${source.name}...`);

    // arXiv API専用処理
    if (source.url === 'ARXIV_API_SOURCE') {
      console.log('Using arXiv API instead of RSS...');
      return await arxivService.fetchRecentPapers(arxivService.getAICategories(), 15);
    }

    // 複数プロキシでフォールバック試行
    for (let i = 0; i < this.proxyUrls.length; i++) {
      try {
        const proxyUrl = this.proxyUrls[i](source.url);
        const proxyNames = ['allorigins', 'corsproxy.io', 'thingproxy', 'codetabs'];
        const proxyName = proxyNames[i] || `proxy-${i}`;

        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`${proxyName}: レート制限 (429) - 次のプロキシを試行`);
            continue;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let xmlContent: string;

        // プロキシ別のレスポンス処理
        if (i === 0) {
          // allorigins の場合は JSON形式
          const data = await response.json();
          xmlContent = data.contents;
        } else if (i === 3) {
          // codetabs の場合も JSON形式の可能性
          try {
            const data = await response.json();
            xmlContent = data.content || data.contents || await response.text();
          } catch {
            xmlContent = await response.text();
          }
        } else {
          // その他のプロキシは直接XML
          xmlContent = await response.text();
        }

        const xmlDoc = this.parser.parseFromString(xmlContent, 'text/xml');
        const items = this.parseRSSItems(xmlDoc, source);

        if (items.length > 0) {
          console.log(`✅ ${source.name}: ${items.length}件取得 (${proxyName})`);
          return items;
        }
      } catch (error) {
        const proxyNames = ['allorigins', 'corsproxy.io', 'thingproxy', 'codetabs'];
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
    } catch (error) {
      return dateString;
    }
  }

  // 重複記事を除去（軽量版）
  private removeDuplicates(items: NewsItem[]): NewsItem[] {
    const seen = new Set<string>();
    const uniqueItems: NewsItem[] = [];

    for (const item of items) {
      // シンプルな重複判定：タイトルとリンクの完全一致のみ
      const titleKey = item.title.toLowerCase().trim();
      const linkKey = item.link.toLowerCase().trim();

      // 同じタイトルまたは同じリンクは重複とみなす
      if (!seen.has(titleKey) && !seen.has(linkKey)) {
        seen.add(titleKey);
        seen.add(linkKey);
        uniqueItems.push(item);
      }
    }

    return uniqueItems;
  }

  async fetchAllFeeds(sources: NewsSource[]): Promise<NewsItem[]> {
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

    console.log(`📊 RSS取得結果: 成功 ${successCount}/${sources.length} ソース, ${failCount}ソースは「ただいま表示できません」`);

    // 日付順でソート（新しい順）
    return allItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
  }

  // 経済カテゴリ専用の重複除去（より厳格）
  private removeEconomicsDuplicates(items: NewsItem[]): NewsItem[] {
    const economicsItems = items.filter(item => item.category === '経済');
    const otherItems = items.filter(item => item.category !== '経済');

    if (economicsItems.length === 0) {
      return items;
    }

    const uniqueEconomicsItems: NewsItem[] = [];
    const seen = new Set<string>();

    for (const item of economicsItems) {
      // より厳格な重複判定：タイトルの類似性も考慮
      const cleanTitle = item.title.toLowerCase()
        .replace(/[\s\-_.,!?()\uff08\uff09]/g, '')
        .trim();

      // 短いタイトル（10文字未満）は完全一致
      // 長いタイトルは最初の20文字で判定
      const titleKey = cleanTitle.length < 10 ? cleanTitle : cleanTitle.substring(0, 20);
      const linkKey = item.link.toLowerCase().trim();

      if (!seen.has(titleKey) && !seen.has(linkKey)) {
        seen.add(titleKey);
        seen.add(linkKey);
        uniqueEconomicsItems.push(item);
      }
    }

    return [...otherItems, ...uniqueEconomicsItems];
  }
}

export const rssService = new RSSService();