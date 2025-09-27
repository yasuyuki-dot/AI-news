import type { NewsItem } from '../types/news';

// interface ArxivEntry {
//   id: string;
//   title: string;
//   summary: string;
//   authors: string[];
//   published: string;
//   link: string;
//   categories: string[];
// }

class ArxivService {
  private baseUrl = 'http://export.arxiv.org/api/query';
  private proxyUrls = [
    // allorigins プロキシ
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    // corsproxy.io プロキシ
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  async fetchRecentPapers(categories: string[], maxResults: number = 20): Promise<NewsItem[]> {
    console.log('Fetching recent papers from arXiv API...');

    const query = categories.map(cat => `cat:${cat}`).join('+OR+');
    const url = `${this.baseUrl}?search_query=${query}&start=0&max_results=${maxResults}&sortBy=lastUpdatedDate&sortOrder=descending`;

    // プロキシを使用してCORS問題を回避
    for (let i = 0; i < this.proxyUrls.length; i++) {
      try {
        const proxyUrl = this.proxyUrls[i](url);
        const proxyName = i === 0 ? 'allorigins' : 'corsproxy.io';

        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`${proxyName}: HTTP error ${response.status}`);
          continue;
        }

        let xmlContent: string;

        if (i === 0) {
          // allorigins の場合は JSON形式
          const data = await response.json();
          xmlContent = data.contents;
        } else {
          // corsproxy.io の場合は直接XML
          xmlContent = await response.text();
        }

        const papers = this.parseArxivXML(xmlContent);

        if (papers.length > 0) {
          console.log(`✅ arXiv API: ${papers.length}件の論文を取得 (${proxyName})`);
          return papers;
        }
      } catch (error) {
        const proxyName = i === 0 ? 'allorigins' : 'corsproxy.io';
        console.warn(`${proxyName} failed for arXiv:`, error);
      }
    }

    console.warn('❌ arXiv API - すべてのプロキシで失敗');
    return [];
  }

  private parseArxivXML(xmlContent: string): NewsItem[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    const entries = xmlDoc.querySelectorAll('entry');
    const papers: NewsItem[] = [];

    entries.forEach((entry) => {
      try {
        const id = this.getElementText(entry, 'id');
        const title = this.getElementText(entry, 'title');
        const summary = this.getElementText(entry, 'summary');
        const published = this.getElementText(entry, 'published');

        // 著者情報を取得
        const authorElements = entry.querySelectorAll('author name');
        const authors: string[] = [];
        authorElements.forEach(author => {
          const name = author.textContent?.trim();
          if (name) authors.push(name);
        });

        // カテゴリ情報を取得
        const categoryElements = entry.querySelectorAll('category');
        const categories: string[] = [];
        categoryElements.forEach(cat => {
          const term = cat.getAttribute('term');
          if (term) categories.push(term);
        });

        if (title && id) {
          const arxivId = this.extractArxivId(id);
          const arxivUrl = `https://arxiv.org/abs/${arxivId}`;

          papers.push({
            title: this.cleanText(title),
            description: this.formatDescription(summary, authors, categories),
            link: arxivUrl,
            pubDate: this.formatDate(published),
            source: 'arXiv',
            category: this.mapToAppCategory(categories)
          });
        }
      } catch (error) {
        console.warn('論文の解析中にエラー:', error);
      }
    });

    return papers;
  }

  private getElementText(parent: Element, tagName: string): string {
    const element = parent.querySelector(tagName);
    return element?.textContent?.trim() || '';
  }

  private extractArxivId(fullId: string): string {
    // http://arxiv.org/abs/2401.12345v1 -> 2401.12345
    const match = fullId.match(/\/(\d{4}\.\d{4,5})/);
    return match ? match[1] : fullId;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
  }

  private formatDescription(summary: string, authors: string[], categories: string[]): string {
    const cleanSummary = this.cleanText(summary);
    const authorsText = authors.length > 0 ? `👥 著者: ${authors.slice(0, 3).join(', ')}${authors.length > 3 ? ' 他' : ''}` : '';
    const categoriesText = categories.length > 0 ? `🏷️ カテゴリ: ${categories.slice(0, 2).join(', ')}` : '';

    return [cleanSummary, authorsText, categoriesText].filter(Boolean).join('\n\n');
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

  private mapToAppCategory(categories: string[]): string {
    // arXivカテゴリをアプリのカテゴリにマップ
    for (const cat of categories) {
      if (cat.includes('cs.AI') || cat.includes('cs.LG') || cat.includes('cs.CL')) {
        return 'AIエージェント';
      }
      if (cat.includes('cs.') || cat.includes('stat.ML')) {
        return 'テクノロジー';
      }
    }
    return 'テクノロジー'; // デフォルト
  }

  // 主要なAI/ML分野のカテゴリ
  getAICategories(): string[] {
    return [
      'cs.AI',    // Artificial Intelligence
      'cs.LG',    // Machine Learning
      'cs.CL',    // Computational Linguistics (NLP)
      'cs.CV',    // Computer Vision
      'cs.RO',    // Robotics
      'stat.ML'   // Statistics - Machine Learning
    ];
  }
}

export const arxivService = new ArxivService();