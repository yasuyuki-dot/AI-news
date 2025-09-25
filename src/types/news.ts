export interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category?: string;
}

export interface NewsSource {
  name: string;
  url: string;
  category: string;
}

export const NEWS_SOURCES: NewsSource[] = [
  // 経済
  {
    name: 'Google News（ビジネス）',
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZ4ZERBU0FtcGhHZ0pLVUFnS0FBOAB?hl=ja&gl=JP&ceid=JP:ja',
    category: '経済'
  },
  {
    name: 'Yahoo!ニュース（経済）',
    url: 'https://news.yahoo.co.jp/rss/categories/business.xml',
    category: '経済'
  },
  {
    name: '東洋経済オンライン',
    url: 'https://toyokeizai.net/list/feed/rss',
    category: '経済'
  },
  // 社会
  {
    name: 'NHKニュース',
    url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    category: '社会'
  },
  {
    name: 'Google News（日本）',
    url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja',
    category: '社会'
  },
  {
    name: 'Yahoo!ニュース（国内）',
    url: 'https://news.yahoo.co.jp/rss/categories/domestic.xml',
    category: '社会'
  },
  // テクノロジー
  {
    name: 'Google News（テクノロジー）',
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y0RBU0FtcGhHZ0pLVUFnS0FBOAB?hl=ja&gl=JP&ceid=JP:ja',
    category: 'テクノロジー'
  },
  {
    name: 'ITmedia ニュース',
    url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml',
    category: 'テクノロジー'
  },
  {
    name: 'CNET Japan',
    url: 'https://feeds.japan.cnet.com/rss/cnet/all.rdf',
    category: 'テクノロジー'
  },
  // スポーツ
  {
    name: 'Google News（スポーツ）',
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtcGhHZ0pLVUFnS0FBOAB?hl=ja&gl=JP&ceid=JP:ja',
    category: 'スポーツ'
  },
  {
    name: 'Yahoo!ニュース（スポーツ）',
    url: 'https://news.yahoo.co.jp/rss/categories/sports.xml',
    category: 'スポーツ'
  },
  {
    name: 'スポーツナビ',
    url: 'https://sports.yahoo.co.jp/rss/all',
    category: 'スポーツ'
  }
];