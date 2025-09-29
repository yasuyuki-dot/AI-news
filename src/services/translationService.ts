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

  // ローカル辞書による簡易翻訳（大幅拡張版）
  private translateWithDictionary(text: string): string {
    const aiTerms: Record<string, string> = {
      // AI・機械学習用語
      'artificial intelligence': '人工知能',
      'machine learning': '機械学習',
      'deep learning': '深層学習',
      'neural network': 'ニューラルネットワーク',
      'large language model': '大規模言語モデル',
      'language model': '言語モデル',
      'transformers': 'Transformer',
      'transformer': 'Transformer',
      'swift transformers': 'Swift Transformers',
      'reasoning': '推論',
      'scientific reasoning': '科学的推論',
      'scireasoner': 'SciReasoner',
      'smol2operator': 'Smol2Operator',
      'post-training': 'ポストトレーニング',
      'gui agents': 'GUIエージェント',
      'computer use': 'コンピュータ利用',

      // 企業・製品名
      'OpenAI': 'OpenAI',
      'ChatGPT': 'ChatGPT',
      'ChatGPT Pulse': 'ChatGPT Pulse',
      'Google': 'Google',
      'Meta': 'Meta',
      'Anthropic': 'Anthropic',
      'NVIDIA': 'NVIDIA',
      'SAP': 'SAP',
      'Oracle': 'Oracle',
      'SoftBank': 'ソフトバンク',
      'Hugging Face': 'Hugging Face',
      'AARP': 'AARP',
      'Stargate': 'Stargate',

      // 基本用語・略語
      'LLM': 'LLM',
      'LLMs': 'LLM',
      'GPT': 'GPT',
      'AI': 'AI',
      'DL': '深層学習',
      'ML': '機械学習',
      'NLP': '自然言語処理',
      'CV': 'コンピュータビジョン',

      // 物理学・科学用語
      'physics': '物理学',
      'Physics': '物理学',
      'toward physics': '物理学への応用',
      'Toward Physics': '物理学への応用',
      'brains': '脳科学',
      'Brains': '脳科学',
      'brain': '脳',
      'Brain': '脳',
      'neuroscience': '神経科学',
      'Neuroscience': '神経科学',
      'API': 'API',
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
      'manufacturing': '製造業',
      'industry': '業界',

      // ビジネス・投資用語
      'partner': 'パートナー',
      'partnering': '提携',
      'partnership': 'パートナーシップ',
      'investment': '投資',
      'invest': '投資する',
      'funding': '資金調達',
      'billion': '億',
      'trillion': '兆',
      'dollar': 'ドル',
      'dollars': 'ドル',
      'market': '市場',
      'expansion': '拡大',
      'expand': '拡大する',
      'infrastructure': 'インフラ',
      'data center': 'データセンター',
      'data centers': 'データセンター',
      'datacenter': 'データセンター',
      'datacenters': 'データセンター',

      // 動詞・形容詞
      'introduce': '導入する',
      'introducing': '導入',
      'launch': 'ローンチ',
      'launching': 'ローンチ',
      'transform': '変革する',
      'transforming': '変革',
      'measure': '測定する',
      'measuring': '測定',
      'reach': '到達する',
      'reaches': '到達',
      'help': '支援する',
      'helping': '支援',
      'work': '作業する',
      'working': '作業',
      'team': 'チーム',
      'teams': 'チーム',
      'tools': 'ツール',
      'tool': 'ツール',
      'ways': '方法',
      'way': '方法',
      'more': 'より多くの',
      'new': '新しい',
      'latest': '最新の',
      'real-world': '実世界の',
      'real world': '実世界',
      'strong': '強力な',
      'powerful': '強力な',
      'advanced': '高度な',
      'traditional': '従来の',
      'sovereign': 'ソブリン',
      'safe': '安全な',
      'safety': '安全',
      'online': 'オンライン',
      'older': '高齢の',
      'adults': '大人',
      'keep': '保つ',
      'stay': '維持する',
      'spotting': '発見',
      'scam': '詐欺',
      'scam-spotting': '詐欺発見',

      // 技術用語
      'computer': 'コンピュータ',
      'software': 'ソフトウェア',
      'hardware': 'ハードウェア',
      'platform': 'プラットフォーム',
      'system': 'システム',
      'service': 'サービス',
      'application': 'アプリケーション',
      'framework': 'フレームワーク',
      'interface': 'インターフェース',
      'network': 'ネットワーク',
      'cloud': 'クラウド',
      'server': 'サーバー',
      'database': 'データベース',
      'security': 'セキュリティ',
      'privacy': 'プライバシー',

      // 前置詞・接続詞・冠詞
      'with': 'と',
      'and': 'と',
      'to': 'に',
      'for': 'のために',
      'in': 'で',
      'on': 'で',
      'at': 'で',
      'by': 'によって',
      'of': 'の',
      'the': '',
      'a': '',
      'an': '',
      'is': 'は',
      'are': 'は',
      'was': 'だった',
      'were': 'だった',
      'be': 'である',
      'been': 'された',
      'have': '持つ',
      'has': '持つ',
      'had': '持った',
      'will': 'する予定',
      'would': 'するだろう',
      'can': 'できる',
      'could': 'できた',
      'should': 'すべき',
      'must': 'しなければならない',
      'may': 'かもしれない',
      'might': 'かもしれない'
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
      // 不自然な混在表現を修正
      .replace(/([ァ-ヾあ-ん一-龯]+)のDL([^a-zA-Z]|$)/g, '$1における深層学習$2')
      .replace(/([ァ-ヾあ-ん一-龯]+)のML([^a-zA-Z]|$)/g, '$1における機械学習$2')
      .replace(/([ァ-ヾあ-ん一-龯]+)のAI([^a-zA-Z]|$)/g, '$1におけるAI$2')
      .replace(/([ァ-ヾあ-ん一-龯]+)のNLP([^a-zA-Z]|$)/g, '$1における自然言語処理$2')
      .replace(/([ァ-ヾあ-ん一-龯]+)のCV([^a-zA-Z]|$)/g, '$1におけるコンピュータビジョン$2')
      .replace(/Toward\s*([ァ-ヾあ-ん一-龯]+)/g, '$1への応用')
      .replace(/toward\s*([ァ-ヾあ-ん一-龯]+)/g, '$1への応用')
      .replace(/([ァ-ヾあ-ん一-龯]+)とBrains/g, '$1と脳科学')
      .replace(/([ァ-ヾあ-ん一-龯]+)とbrains/g, '$1と脳科学')
      .replace(/DLと([ァ-ヾあ-ん一-龯]+)/g, '深層学習と$1')
      .replace(/MLと([ァ-ヾあ-ん一-龯]+)/g, '機械学習と$1')
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

  // タイトルを翻訳（Google翻訳優先版）
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
      const googleTranslated = await this.translateWithGoogle(title);
      if (googleTranslated !== title && googleTranslated.length > 5) {
        // Google翻訳が成功した場合
        const fixedTranslation = this.fixTranslationIssues(googleTranslated);
        this.translatedCache.set(title, fixedTranslation);
        console.log(`Google翻訳成功: ${title} → ${fixedTranslation}`);
        return fixedTranslation;
      }
    } catch (error) {
      console.warn(`Google翻訳失敗 (${title}):`, error);
    }

    // Google翻訳が失敗した場合は辞書翻訳をフォールバック
    console.log(`辞書翻訳を使用: ${title}`);
    const dictionaryTranslated = this.translateWithDictionary(title);
    const fixedTranslation = this.fixTranslationIssues(dictionaryTranslated);

    // キャッシュに保存
    this.translatedCache.set(title, fixedTranslation);

    return fixedTranslation;
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
    } catch {
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

  // バッチ翻訳（Google翻訳使用版）
  async translateNewsItems(newsItems: NewsItem[]): Promise<NewsItem[]> {
    console.log(`🔤 Google翻訳バッチ処理開始: ${newsItems.length}件`);
    const startTime = Date.now();

    // 並列処理でGoogle翻訳を実行（レート制限対応）
    const translatePromises = newsItems.map(async (item, index) => {
      try {
        // 少し間隔を開けてレート制限を回避
        await new Promise(resolve => setTimeout(resolve, index * 50));

        const translatedTitle = await this.translateTitle(item.title);
        return {
          ...item,
          title: translatedTitle,
          originalTitle: item.title !== translatedTitle ? item.title : undefined
        };
      } catch (error) {
        console.warn(`翻訳エラー (記事${index + 1}):`, error);
        return item; // エラー時は元の記事を使用
      }
    });

    const translatedItems = await Promise.all(translatePromises);

    const endTime = Date.now();
    const translationTime = endTime - startTime;
    const translatedCount = translatedItems.filter(item => item.originalTitle).length;

    console.log(`✅ 高速翻訳完了: ${translationTime}ms - ${translatedCount}/${newsItems.length}件を翻訳`);
    return translatedItems;
  }


  // キャッシュクリア
  clearCache(): void {
    this.translatedCache.clear();
  }
}

export const translationService = new TranslationService();