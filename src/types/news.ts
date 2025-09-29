export interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category?: string;
  originalTitle?: string; // 翻訳前の元のタイトル
  originalDescription?: string; // 翻訳前の元の説明文
}

export interface NewsSource {
  name: string;
  url: string;
  category: string;
}

export const NEWS_SOURCES: NewsSource[] = [
  // 確実に動作するAIニュースソース
  {
    name: 'OpenAI News',
    url: 'https://openai.com/news/rss.xml',
    category: 'AI・機械学習'
  },
  {
    name: 'arXiv AI Papers (API)',
    url: 'ARXIV_API_SOURCE',
    category: 'AI・機械学習'
  },
  {
    name: 'AI Business News',
    url: 'https://news.google.com/rss/search?q=OpenAI+ChatGPT+AI+投資&hl=ja&gl=JP&ceid=JP:ja',
    category: '経済・ビジネス'
  },
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    category: 'AI・機械学習'
  }
];