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
    category: 'AIエージェント'
  },
  {
    name: 'arXiv AI Papers (API)',
    url: 'ARXIV_API_SOURCE',
    category: 'AIエージェント'
  },
  {
    name: 'AI Business News',
    url: 'https://news.google.com/rss/search?q=OpenAI+ChatGPT+AI+投資&hl=ja&gl=JP&ceid=JP:ja',
    category: '経済'
  },
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    category: 'AIエージェント'
  }
];