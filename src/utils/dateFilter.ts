/**
 * 日付フィルタリングユーティリティ
 */

export function isWithinTwoWeeks(dateString: string): boolean {
  try {
    const articleDate = new Date(dateString);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // 無効な日付の場合は表示しない
    if (isNaN(articleDate.getTime())) {
      return false;
    }

    return articleDate >= twoWeeksAgo;
  } catch (error) {
    console.warn('日付の解析に失敗しました:', dateString, error);
    return false;
  }
}

export function isWithinOneMonth(dateString: string): boolean {
  try {
    const articleDate = new Date(dateString);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // 無効な日付の場合は表示しない
    if (isNaN(articleDate.getTime())) {
      return false;
    }

    return articleDate >= oneMonthAgo;
  } catch (error) {
    console.warn('日付の解析に失敗しました:', dateString, error);
    return false;
  }
}

// 2週間以内の記事のみ表示（高速化）
export function filterRecentNews<T extends { pubDate: string }>(news: T[]): T[] {
  return news.filter(item => isWithinTwoWeeks(item.pubDate));
}

export function getDateRangeText(): string {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  return `${twoWeeksAgo.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })} 以降`;
}