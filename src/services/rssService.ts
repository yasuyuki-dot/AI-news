import type { NewsItem, NewsSource } from '../types/news';

class RSSService {
  private parser = new DOMParser();

  async fetchRSSFeed(source: NewsSource): Promise<NewsItem[]> {
    try {
      console.log(`Fetching RSS from ${source.name}...`);

      // CORS対応のためのプロキシサーバーを使用
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`;

      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const xmlDoc = this.parser.parseFromString(data.contents, 'text/xml');

      const items = this.parseRSSItems(xmlDoc, source);
      console.log(`Successfully fetched ${items.length} items from ${source.name}`);

      return items;
    } catch (error) {
      console.error(`Error fetching RSS from ${source.name}:`, error);
      return [];
    }
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

  async fetchAllFeeds(sources: NewsSource[]): Promise<NewsItem[]> {
    const promises = sources.map(source => this.fetchRSSFeed(source));
    const results = await Promise.allSettled(promises);

    const allItems: NewsItem[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    });

    // 日付順でソート（新しい順）
    return allItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
  }
}

export const rssService = new RSSService();