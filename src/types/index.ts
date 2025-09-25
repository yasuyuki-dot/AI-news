export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  source: string;
  category: NewsCategory;
}

export type NewsCategory = '経済' | '企業' | '市場' | 'テクノロジー' | '政治' | 'その他';

export interface BookmarkedArticle extends NewsArticle {
  bookmarkedAt: string;
}