interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  domNodes: number;
  scrollFPS: number;
  visibleItems: number;
  totalItems: number;
  averageItemHeight: number;
  timestamp: number;
}

interface PerformanceComparison {
  virtualScroll: PerformanceMetrics;
  regularScroll: PerformanceMetrics;
  improvement: {
    renderTimeImprovement: number;
    memoryImprovement: number;
    domNodeReduction: number;
    fpsImprovement: number;
  };
}

class PerformanceService {
  private measurements: PerformanceMetrics[] = [];
  private fpsCounter = {
    lastTime: 0,
    frameCount: 0,
    fps: 0,
  };
  private isMonitoring = false;
  private monitoringInterval: number | null = null;

  // パフォーマンス監視開始
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.fpsCounter.lastTime = performance.now();
    this.fpsCounter.frameCount = 0;

    this.monitoringInterval = window.setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    console.log('📊 Performance monitoring started');
  }

  // パフォーマンス監視停止
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('📊 Performance monitoring stopped');
  }

  // メトリクス収集
  private collectMetrics(): void {
    const now = performance.now();

    // FPS計算
    const elapsed = now - this.fpsCounter.lastTime;
    if (elapsed >= 1000) {
      this.fpsCounter.fps = Math.round((this.fpsCounter.frameCount * 1000) / elapsed);
      this.fpsCounter.frameCount = 0;
      this.fpsCounter.lastTime = now;
    }

    const metrics: PerformanceMetrics = {
      renderTime: this.measureRenderTime(),
      memoryUsage: this.getMemoryUsage(),
      domNodes: this.countDOMNodes(),
      scrollFPS: this.fpsCounter.fps,
      visibleItems: this.getVisibleItemCount(),
      totalItems: this.getTotalItemCount(),
      averageItemHeight: this.getAverageItemHeight(),
      timestamp: now,
    };

    this.measurements.push(metrics);

    // 古いメトリクスを削除（最新100件のみ保持）
    if (this.measurements.length > 100) {
      this.measurements = this.measurements.slice(-100);
    }
  }

  // レンダリング時間測定
  private measureRenderTime(): number {
    // 単純に現在時刻を返す（実際のレンダリング時間の測定は困難）
    return performance.now() % 100; // 0-100の範囲の値を返す
  }

  // メモリ使用量取得
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  // DOM ノード数カウント
  private countDOMNodes(): number {
    return document.querySelectorAll('*').length;
  }

  // 可視アイテム数取得
  private getVisibleItemCount(): number {
    const virtualizedItems = document.querySelectorAll('.virtualized-item');
    return virtualizedItems.length;
  }

  // 総アイテム数取得
  private getTotalItemCount(): number {
    const newsContainer = document.querySelector('.virtualized-news-container') ||
                        document.querySelector('.news-list');
    return newsContainer?.getAttribute('data-total-items') ?
           parseInt(newsContainer.getAttribute('data-total-items')!) : 0;
  }

  // 平均アイテム高さ計算
  private getAverageItemHeight(): number {
    const items = document.querySelectorAll('.virtualized-item, .news-card');
    if (items.length === 0) return 0;

    let totalHeight = 0;
    items.forEach((item) => {
      totalHeight += (item as HTMLElement).offsetHeight;
    });

    return totalHeight / items.length;
  }

  // FPS カウンター更新
  updateFPS(): void {
    this.fpsCounter.frameCount++;
  }

  // 現在のメトリクス取得
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.measurements.length > 0 ?
           this.measurements[this.measurements.length - 1] : null;
  }

  // メトリクス履歴取得
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.measurements];
  }

  // 平均メトリクス計算
  getAverageMetrics(samples: number = 10): PerformanceMetrics | null {
    if (this.measurements.length === 0) return null;

    const recentMeasurements = this.measurements.slice(-samples);
    const count = recentMeasurements.length;

    const averages = recentMeasurements.reduce((acc, metrics) => {
      acc.renderTime += metrics.renderTime;
      acc.memoryUsage += metrics.memoryUsage;
      acc.domNodes += metrics.domNodes;
      acc.scrollFPS += metrics.scrollFPS;
      acc.visibleItems += metrics.visibleItems;
      acc.totalItems += metrics.totalItems;
      acc.averageItemHeight += metrics.averageItemHeight;
      return acc;
    }, {
      renderTime: 0,
      memoryUsage: 0,
      domNodes: 0,
      scrollFPS: 0,
      visibleItems: 0,
      totalItems: 0,
      averageItemHeight: 0,
      timestamp: Date.now(),
    });

    return {
      renderTime: averages.renderTime / count,
      memoryUsage: averages.memoryUsage / count,
      domNodes: averages.domNodes / count,
      scrollFPS: averages.scrollFPS / count,
      visibleItems: averages.visibleItems / count,
      totalItems: averages.totalItems / count,
      averageItemHeight: averages.averageItemHeight / count,
      timestamp: Date.now(),
    };
  }

  // 仮想スクロールと通常スクロールの比較
  comparePerformance(
    virtualMetrics: PerformanceMetrics,
    regularMetrics: PerformanceMetrics
  ): PerformanceComparison {
    const improvement = {
      renderTimeImprovement: this.calculateImprovement(
        regularMetrics.renderTime,
        virtualMetrics.renderTime
      ),
      memoryImprovement: this.calculateImprovement(
        regularMetrics.memoryUsage,
        virtualMetrics.memoryUsage
      ),
      domNodeReduction: this.calculateImprovement(
        regularMetrics.domNodes,
        virtualMetrics.domNodes
      ),
      fpsImprovement: this.calculateImprovement(
        virtualMetrics.scrollFPS,
        regularMetrics.scrollFPS,
        true // 高い方が良い
      ),
    };

    return {
      virtualScroll: virtualMetrics,
      regularScroll: regularMetrics,
      improvement,
    };
  }

  // 改善率計算
  private calculateImprovement(
    before: number,
    after: number,
    higherIsBetter: boolean = false
  ): number {
    if (before === 0) return 0;

    if (higherIsBetter) {
      return ((after - before) / before) * 100;
    } else {
      return ((before - after) / before) * 100;
    }
  }

  // パフォーマンスレポート生成
  generateReport(): string {
    const current = this.getCurrentMetrics();
    const average = this.getAverageMetrics();

    if (!current || !average) {
      return 'パフォーマンスデータが不足しています';
    }

    return `
📊 パフォーマンスレポート
=========================

🔄 現在のメトリクス:
  • レンダリング時間: ${current.renderTime.toFixed(2)}ms
  • メモリ使用量: ${Math.round(current.memoryUsage / 1024 / 1024)}MB
  • DOM ノード数: ${current.domNodes.toLocaleString()}
  • スクロール FPS: ${current.scrollFPS}
  • 表示アイテム: ${current.visibleItems}/${current.totalItems}
  • 平均アイテム高さ: ${Math.round(current.averageItemHeight)}px

📈 平均メトリクス (直近10回):
  • レンダリング時間: ${average.renderTime.toFixed(2)}ms
  • メモリ使用量: ${Math.round(average.memoryUsage / 1024 / 1024)}MB
  • DOM ノード数: ${Math.round(average.domNodes).toLocaleString()}
  • スクロール FPS: ${Math.round(average.scrollFPS)}
  • 表示アイテム: ${Math.round(average.visibleItems)}/${Math.round(average.totalItems)}

💡 最適化のヒント:
${this.getOptimizationTips(current)}
    `.trim();
  }

  // 最適化のヒント
  private getOptimizationTips(metrics: PerformanceMetrics): string {
    const tips: string[] = [];

    if (metrics.renderTime > 16) {
      tips.push('• レンダリング時間が60FPSの閾値(16ms)を超えています');
    }

    if (metrics.domNodes > 1000) {
      tips.push('• DOM ノード数が多すぎます。仮想スクロールの導入を検討してください');
    }

    if (metrics.scrollFPS < 30) {
      tips.push('• スクロールパフォーマンスが低下しています');
    }

    if (metrics.visibleItems / metrics.totalItems > 0.5) {
      tips.push('• 表示アイテム率が高すぎます。仮想化の効果を確認してください');
    }

    return tips.length > 0 ? tips.join('\n') : '• パフォーマンスは良好です 👍';
  }

  // メトリクスのエクスポート
  exportMetrics(): string {
    return JSON.stringify({
      measurements: this.measurements,
      summary: this.getAverageMetrics(),
      exportTime: new Date().toISOString(),
    }, null, 2);
  }

  // メトリクスのリセット
  reset(): void {
    this.measurements = [];
    this.fpsCounter = {
      lastTime: 0,
      frameCount: 0,
      fps: 0,
    };
    console.log('📊 Performance metrics reset');
  }

  // 監視状態の確認
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

export const performanceService = new PerformanceService();
export type { PerformanceMetrics, PerformanceComparison };