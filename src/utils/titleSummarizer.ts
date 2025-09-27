/**
 * ニュースの見出しを要約して読みやすくするユーティリティ
 */

export function summarizeTitle(title: string): string {
  // HTMLタグを除去
  const cleanTitle = title.replace(/<[^>]*>/g, '');

  // 特殊文字をデコード
  const decodedTitle = cleanTitle
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");

  // 長すぎる見出しを要約
  if (decodedTitle.length > 80) {
    return summarizeLongTitle(decodedTitle);
  }

  // AI関連キーワードを強調するために整理
  return enhanceAITitle(decodedTitle);
}

function summarizeLongTitle(title: string): string {
  // 不要な前置詞や冗長な表現を除去
  let summary = title
    .replace(/^.*?：/, '') // コロンより前を除去
    .replace(/^.*?：/, '') // 全角コロンより前を除去
    .replace(/\s*-\s*.*$/, '') // ハイフン以降を除去
    .replace(/\s*\|\s*.*$/, '') // パイプ以降を除去
    .replace(/\s*\[\s*.*?\s*\]\s*$/, '') // 末尾の角括弧を除去
    .replace(/\s*\(\s*.*?\s*\)\s*$/, '') // 末尾の丸括弧を除去;

  // まだ長い場合は文の区切りで切る
  if (summary.length > 60) {
    const sentences = summary.split(/[。．.!?？]/);
    if (sentences.length > 1 && sentences[0].length > 20) {
      summary = sentences[0] + (sentences[0].endsWith('。') || sentences[0].endsWith('.') ? '' : '...');
    }
  }

  // 最大文字数制限
  if (summary.length > 70) {
    summary = summary.substring(0, 67) + '...';
  }

  return summary.trim();
}

function enhanceAITitle(title: string): string {
  // AI関連の略語を統一
  let enhanced = title
    .replace(/ChatGPT/gi, 'ChatGPT')
    .replace(/OpenAI/gi, 'OpenAI')
    .replace(/Google AI/gi, 'Google AI')
    .replace(/DeepMind/gi, 'DeepMind')
    .replace(/人工知能/g, 'AI')
    .replace(/機械学習/g, 'ML')
    .replace(/深層学習/g, 'DL')
    .replace(/大規模言語モデル/g, 'LLM');

  // 冗長な表現をシンプルに
  enhanced = enhanced
    .replace(/について|に関して|に関する/g, 'の')
    .replace(/を発表しました|を公開しました/g, 'を発表')
    .replace(/することを発表|することが判明/g, 'を発表')
    .replace(/ということが|ことが明らかに/g, 'が');

  return enhanced.trim();
}

export function getDisplayTitle(title: string): string {
  const summarized = summarizeTitle(title);

  // 空文字や短すぎる場合は元のタイトルを使用
  if (!summarized || summarized.length < 10) {
    return title.length > 100 ? title.substring(0, 97) + '...' : title;
  }

  return summarized;
}