import type { NewsItem } from '../types/news';

class TranslationService {
  private translatedCache = new Map<string, string>();

  // 英語かどうかを判定（改良版）
  private isEnglish(text: string): boolean {
    if (!text) return false;

    // 日本語文字（ひらがな、カタカナ、漢字）の存在確認
    const hasJapanese = /[ひらがなカタカナ漢字ァ-ヶー一-龯]/.test(text);

    // 既に日本語が含まれている場合は英語ではない
    if (hasJapanese) {
      // ただし、英語と日本語が混在している場合は翻訳対象とする
      const englishWords = text.match(/\b[a-zA-Z]{3,}\b/g);
      const hasMixedContent = !!(englishWords && englishWords.length >= 2);
      return hasMixedContent;
    }

    // 英語の単語パターン（3文字以上の英単語が複数存在）
    const englishWords = text.match(/\b[a-zA-Z]{3,}\b/g);
    const hasMultipleEnglishWords = !!(englishWords && englishWords.length >= 2);

    // ASCII文字の割合
    const asciiCount = text.split('').filter(char => char.charCodeAt(0) < 128).length;
    const totalCount = text.length;
    const asciiRatio = asciiCount / totalCount;

    // 英語判定：ASCII文字が60%以上 + 英語単語が複数
    return asciiRatio > 0.6 && hasMultipleEnglishWords;
  }

  // Google翻訳APIを使用（レート制限対応版）
  private async translateWithGoogle(text: string, retryCount = 0): Promise<string> {
    try {
      // レート制限対応：リトライ間隔を追加
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }

      const encodedText = encodeURIComponent(text);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${encodedText}`;

      // 複数のプロキシを試行
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      ];

      let lastError: any;
      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          // Google翻訳のレスポンス解析
          if (data && data[0] && Array.isArray(data[0])) {
            let translatedText = '';
            for (const segment of data[0]) {
              if (segment && segment[0]) {
                translatedText += segment[0];
              }
            }
            if (translatedText && translatedText !== text) {
              return translatedText;
            }
          }
        } catch (error) {
          lastError = error;
          console.warn(`プロキシ ${proxyUrl} でエラー:`, error);
          continue;
        }
      }

      // 全プロキシが失敗した場合のリトライ
      if (retryCount < 2) {
        console.log(`翻訳リトライ ${retryCount + 1}/2`);
        return await this.translateWithGoogle(text, retryCount + 1);
      }

      throw lastError || new Error('All proxies failed');
    } catch (error) {
      console.warn('Google翻訳エラー:', error);
      return text;
    }
  }

  // ローカル辞書による簡易翻訳（拡張版）
  private translateWithDictionary(text: string): string {
    const aiTerms: Record<string, string> = {
      // AI・機械学習用語
      'artificial intelligence': '人工知能',
      'machine learning': '機械学習',
      'deep learning': '深層学習',
      'neural network': 'ニューラルネットワーク',
      'large language model': '大規模言語モデル',
      'language model': '言語モデル',
      'LLM': 'LLM',
      'LLMs': 'LLM',
      'GPT': 'GPT',
      'ChatGPT': 'ChatGPT',
      'OpenAI': 'OpenAI',
      'Google': 'Google',
      'Meta': 'Meta',
      'Anthropic': 'Anthropic',
      'algorithm': 'アルゴリズム',
      'model': 'モデル',
      'models': 'モデル',
      'training': 'トレーニング',
      'dataset': 'データセット',
      'benchmark': 'ベンチマーク',
      'benchmarks': 'ベンチマーク',
      'performance': 'パフォーマンス',
      'breakthrough': 'ブレイクスルー',
      'research': '研究',
      'paper': '論文',
      'release': 'リリース',
      'announcement': '発表',
      'update': 'アップデート',
      'technology': 'テクノロジー',
      'innovation': 'イノベーション',
      'development': '開発',

      // 一般的な動詞・形容詞
      'achieve': '達成する',
      'strong': '強力な',
      'traditional': '従来の',
      'new': '新しい',
      'latest': '最新の',
      'help': '支援する',
      'stay': '維持する',
      'safe': '安全な',
      'online': 'オンライン',
      'with': 'と',
      'and': 'と',
      'are': 'は',
      'is': 'は',
      'to': 'に',
      'for': 'のために',
      'partnering': '提携している',
      'adults': '大人',
      'older': '高齢の',
      'tools': 'ツール',
      'scam-spotting': '詐欺発見',
      'spotting': '発見',
      'scam': '詐欺',

      // 頻出単語
      'AI': 'AI',
      'AARP': 'AARP'
    };

    let translatedText = text;

    // 長いフレーズから順に置換（より正確な翻訳のため）
    const sortedTerms = Object.entries(aiTerms).sort((a, b) => b[0].length - a[0].length);

    sortedTerms.forEach(([english, japanese]) => {
      const regex = new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      translatedText = translatedText.replace(regex, japanese);
    });

    return translatedText;
  }

  // 翻訳後の文字化け修正（強化版）
  private fixTranslationIssues(text: string): string {
    return text
      // 英語とカタカナ・ひらがな・漢字の間のスペース調整
      .replace(/([a-zA-Z])\s+([ァ-ヾあ-ん一-龯])/g, '$1$2')
      .replace(/([ァ-ヾあ-ん一-龯])\s+([a-zA-Z])/g, '$1$2')
      // 日本語文字間の不要スペース除去
      .replace(/([ァ-ヾあ-ん一-龯])\s+([ァ-ヾあ-ん一-龯])/g, '$1$2')
      // 句読点前後のスペース調整
      .replace(/([。、])\s+/g, '$1')
      .replace(/\s+([。、])/g, '$1')
      // 連続スペースを1つに
      .replace(/\s{2,}/g, ' ')
      // 行頭・行末のスペース除去
      .trim()
      // 翻訳の重複を修正
      .replace(/(.+?)\1+/g, '$1')
      // 不完全な翻訳の修正（英語と日本語が混在している場合）
      .replace(/([a-zA-Z]+)\s*([ァ-ヾあ-ん一-龯]+)\s*([a-zA-Z]+)/g, (_match, eng1, jp, eng2) => {
        // 英語部分も翻訳を試行
        const translatedEng1 = this.translateSingleWord(eng1);
        const translatedEng2 = this.translateSingleWord(eng2);
        return `${translatedEng1}${jp}${translatedEng2}`;
      });
  }

  // 単語レベルの翻訳
  private translateSingleWord(word: string): string {
    const commonWords: Record<string, string> = {
      'tools': 'ツール',
      'training': 'トレーニング',
      'with': 'と',
      'and': 'と',
      'help': '支援',
      'safe': '安全',
      'online': 'オンライン',
      'adults': '大人',
      'older': '高齢者',
      'stay': '維持',
      'scam': '詐欺',
      'spotting': '発見',
      'partnering': '提携'
    };

    return commonWords[word.toLowerCase()] || word;
  }

  // タイトルを翻訳
  async translateTitle(title: string): Promise<string> {
    if (!this.isEnglish(title)) {
      return title; // 既に日本語の場合はそのまま返す
    }

    // キャッシュをチェック
    if (this.translatedCache.has(title)) {
      return this.translatedCache.get(title)!;
    }

    try {
      // まずGoogle翻訳を試行
      const translated = await this.translateWithGoogle(title);

      // 翻訳が成功した場合（元のテキストと異なる場合）
      if (translated !== title) {
        const fixedTranslation = this.fixTranslationIssues(translated);
        this.translatedCache.set(title, fixedTranslation);
        return fixedTranslation;
      }

      // Google翻訳が失敗した場合は辞書翻訳
      const dictionaryTranslated = this.translateWithDictionary(title);
      const fixedDictionary = this.fixTranslationIssues(dictionaryTranslated);
      this.translatedCache.set(title, fixedDictionary);
      return fixedDictionary;

    } catch (error) {
      console.warn('タイトル翻訳エラー:', error);
      // エラー時は辞書翻訳にフォールバック
      const fallbackTranslation = this.translateWithDictionary(title);
      return this.fixTranslationIssues(fallbackTranslation);
    }
  }

  // 説明文を翻訳（強化版）
  async translateDescription(description: string): Promise<string> {
    if (!description) {
      return description;
    }

    // より厳密な英語判定
    const isEnglishText = this.isDescriptionEnglish(description);
    console.log('Description translation check:', {
      text: description.substring(0, 50) + '...',
      isEnglish: isEnglishText,
      hasEnglishWords: /\b[a-zA-Z]{3,}\b/g.test(description),
      englishWordCount: (description.match(/\b[a-zA-Z]{3,}\b/g) || []).length
    });

    if (!isEnglishText) {
      return description;
    }

    // キャッシュをチェック
    const cacheKey = `desc_${description.substring(0, 100)}`;
    if (this.translatedCache.has(cacheKey)) {
      return this.translatedCache.get(cacheKey)!;
    }

    // 長すぎる場合は最初の200文字のみ翻訳
    const shortDescription = description.substring(0, 200);

    try {
      const translated = await this.translateWithGoogle(shortDescription);
      let finalTranslation: string;

      if (translated !== shortDescription && translated.length > 10) {
        // Google翻訳が成功した場合
        finalTranslation = this.fixTranslationIssues(translated) + (description.length > 200 ? '...' : '');
      } else {
        // Google翻訳が失敗した場合は辞書翻訳
        const dictionaryTranslated = this.translateWithDictionary(shortDescription);
        finalTranslation = this.fixTranslationIssues(dictionaryTranslated) + (description.length > 200 ? '...' : '');
      }

      // キャッシュに保存
      this.translatedCache.set(cacheKey, finalTranslation);

      console.log('Description translation result:', {
        original: shortDescription,
        translated: finalTranslation
      });

      return finalTranslation;
    } catch (error) {
      const fallback = this.fixTranslationIssues(this.translateWithDictionary(shortDescription)) + (description.length > 200 ? '...' : '');
      console.log('Description translation fallback:', fallback);
      return fallback;
    }
  }

  // 説明文専用の英語判定（より厳格）
  private isDescriptionEnglish(text: string): boolean {
    if (!text || text.length < 10) return false;

    // 日本語文字の存在確認
    const hasJapanese = /[ひらがなカタカナ漢字ァ-ヶー一-龯]/.test(text);

    // 英語単語の数をカウント
    const englishWords = text.match(/\b[a-zA-Z]{2,}\b/g) || [];
    const englishWordCount = englishWords.length;

    // ASCII文字の割合
    const asciiCount = text.split('').filter(char => char.charCodeAt(0) < 128).length;
    const asciiRatio = asciiCount / text.length;

    // より厳格な判定条件
    if (hasJapanese) {
      // 日本語が含まれている場合、英語単語が5個以上あれば混合テキストとして翻訳対象
      return englishWordCount >= 5;
    }

    // 純粋な英語判定：ASCII比率50%以上 かつ 英語単語3個以上
    return asciiRatio >= 0.5 && englishWordCount >= 3;
  }

  // ニュースアイテム全体を翻訳（タイトルのみ - 高速版）
  async translateNewsItem(newsItem: NewsItem): Promise<NewsItem> {
    const translatedTitle = await this.translateTitle(newsItem.title);
    // 説明文は翻訳しない（速度優先）

    return {
      ...newsItem,
      title: translatedTitle,
      // 元のタイトルを保持（ツールチップ表示用）
      originalTitle: newsItem.title !== translatedTitle ? newsItem.title : undefined
    };
  }

  // バッチ翻訳（レート制限対応・強化版）
  async translateNewsItems(newsItems: NewsItem[]): Promise<NewsItem[]> {
    console.log(`Starting batch translation for ${newsItems.length} news items...`);
    const translatedItems: NewsItem[] = [];

    for (let i = 0; i < newsItems.length; i++) {
      try {
        console.log(`Translating item ${i + 1}/${newsItems.length}: ${newsItems[i].title.substring(0, 50)}...`);

        const translatedItem = await this.translateNewsItem(newsItems[i]);
        translatedItems.push(translatedItem);

        // 翻訳結果をログ出力
        if (translatedItem.title !== newsItems[i].title) {
          console.log(`Translation applied for item ${i + 1}`);
        }

        // レート制限対応：100件ごとに1秒待機（高速化）
        if (i > 0 && i % 100 === 0) {
          console.log(`Rate limiting: waiting 1 second after ${i + 1} items...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`翻訳エラー (記事${i + 1}):`, error);
        translatedItems.push(newsItems[i]); // エラー時は元の記事を使用
      }
    }

    console.log(`Batch translation completed. Processed ${translatedItems.length} items.`);
    return translatedItems;
  }

  // キャッシュクリア
  clearCache(): void {
    this.translatedCache.clear();
  }
}

export const translationService = new TranslationService();