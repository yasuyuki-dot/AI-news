import React, { useMemo } from 'react';
import './AnalyticsCharts.css';

interface AnalyticsEvent {
  type: string;
  timestamp: number;
  sessionId: string;
  data: Record<string, any>;
}

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface TimeSeriesData {
  time: string;
  value: number;
}

interface AnalyticsChartsProps {
  events: AnalyticsEvent[];
  timeRange: '24h' | '7d' | '30d' | 'all';
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ events, timeRange }) => {
  // Calculate time series data for page views
  const pageViewsTimeSeries = useMemo(() => {
    const now = Date.now();
    const msInHour = 60 * 60 * 1000;
    const msInDay = 24 * msInHour;

    let timeStep: number;
    let maxPoints: number;
    let formatTime: (time: number) => string;

    switch (timeRange) {
      case '24h':
        timeStep = msInHour; // 1 hour
        maxPoints = 24;
        formatTime = (time) => new Date(time).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        break;
      case '7d':
        timeStep = msInDay; // 1 day
        maxPoints = 7;
        formatTime = (time) => new Date(time).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
        break;
      case '30d':
        timeStep = msInDay; // 1 day
        maxPoints = 30;
        formatTime = (time) => new Date(time).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
        break;
      default:
        timeStep = msInDay * 7; // 1 week
        maxPoints = 52;
        formatTime = (time) => new Date(time).toLocaleDateString('ja-JP', { year: '2-digit', month: '2-digit', day: '2-digit' });
    }

    const timeSlots: { [key: string]: number } = {};

    // Initialize time slots
    for (let i = maxPoints - 1; i >= 0; i--) {
      const slotTime = now - (i * timeStep);
      const slotKey = Math.floor(slotTime / timeStep).toString();
      timeSlots[slotKey] = 0;
    }

    // Count page views in each time slot
    events
      .filter(event => event.type === 'page_view')
      .forEach(event => {
        const slotKey = Math.floor(event.timestamp / timeStep).toString();
        if (timeSlots.hasOwnProperty(slotKey)) {
          timeSlots[slotKey]++;
        }
      });

    return Object.entries(timeSlots)
      .map(([key, value]) => ({
        time: formatTime(parseInt(key) * timeStep),
        value
      }))
      .slice(-maxPoints);
  }, [events, timeRange]);

  // Calculate event type distribution
  const eventTypeDistribution = useMemo(() => {
    const distribution: { [key: string]: number } = {};

    events.forEach(event => {
      distribution[event.type] = (distribution[event.type] || 0) + 1;
    });

    const colors = ['#00d4ff', '#00ff88', '#ff6b35', '#f7931e', '#9b59b6', '#e74c3c'];

    return Object.entries(distribution)
      .map(([type, count], index) => ({
        label: type === 'page_view' ? 'ページビュー' :
               type === 'article_click' ? '記事クリック' :
               type === 'search' ? '検索' :
               type === 'category_view' ? 'カテゴリ表示' :
               type === 'feature_use' ? '機能使用' :
               type === 'session_start' ? 'セッション開始' :
               type === 'session_end' ? 'セッション終了' : type,
        value: count,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [events]);

  // Calculate session duration histogram
  const sessionDurations = useMemo(() => {
    const sessions: { [sessionId: string]: { start: number; end?: number } } = {};

    events.forEach(event => {
      if (event.type === 'session_start') {
        sessions[event.sessionId] = { start: event.timestamp };
      } else if (event.type === 'session_end' && sessions[event.sessionId]) {
        sessions[event.sessionId].end = event.timestamp;
      }
    });

    const durations = Object.values(sessions)
      .filter(session => session.end)
      .map(session => (session.end! - session.start) / 1000 / 60); // minutes

    const buckets = [
      { label: '0-1分', min: 0, max: 1 },
      { label: '1-5分', min: 1, max: 5 },
      { label: '5-10分', min: 5, max: 10 },
      { label: '10-30分', min: 10, max: 30 },
      { label: '30分+', min: 30, max: Infinity }
    ];

    return buckets.map(bucket => ({
      label: bucket.label,
      value: durations.filter(d => d >= bucket.min && d < bucket.max).length
    }));
  }, [events]);

  const LineChart: React.FC<{ data: TimeSeriesData[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const width = 800;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = data.map((point, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight;
      return { x, y, value: point.value, label: point.time };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return (
      <div className="line-chart">
        <svg width={width} height={height} className="chart-svg">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#00ff88" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <line
              key={ratio}
              x1={padding.left}
              y1={padding.top + chartHeight * ratio}
              x2={width - padding.right}
              y2={padding.top + chartHeight * ratio}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          ))}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <text
              key={ratio}
              x={padding.left - 10}
              y={padding.top + chartHeight * (1 - ratio) + 5}
              fill="rgba(255,255,255,0.6)"
              fontSize="12"
              textAnchor="end"
            >
              {Math.round(maxValue * ratio)}
            </text>
          ))}

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#00d4ff"
              stroke="white"
              strokeWidth="2"
            >
              <title>{`${point.label}: ${point.value}`}</title>
            </circle>
          ))}

          {/* X-axis labels */}
          {points.filter((_, index) => index % Math.ceil(points.length / 8) === 0).map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={height - 10}
              fill="rgba(255,255,255,0.6)"
              fontSize="11"
              textAnchor="middle"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  const PieChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
    const size = 200;
    const center = size / 2;
    const radius = size / 2 - 20;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    return (
      <div className="pie-chart">
        <svg width={size} height={size} className="chart-svg">
          {data.map((item, index) => {
            const percentage = item.value / total;
            const angle = percentage * 2 * Math.PI;

            const x1 = center + radius * Math.cos(currentAngle);
            const y1 = center + radius * Math.sin(currentAngle);
            const x2 = center + radius * Math.cos(currentAngle + angle);
            const y2 = center + radius * Math.sin(currentAngle + angle);

            const largeArcFlag = angle > Math.PI ? 1 : 0;

            const pathData = [
              `M ${center} ${center}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');

            currentAngle += angle;

            return (
              <path
                key={index}
                d={pathData}
                fill={item.color}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="1"
              >
                <title>{`${item.label}: ${item.value} (${(percentage * 100).toFixed(1)}%)`}</title>
              </path>
            );
          })}
        </svg>
        <div className="pie-chart-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: item.color }}></div>
              <span className="legend-label">{item.label}</span>
              <span className="legend-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BarChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 60, left: 40 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;

    return (
      <div className="bar-chart">
        <svg width={width} height={height} className="chart-svg">
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00ff88" />
              <stop offset="100%" stopColor="#00d4ff" />
            </linearGradient>
          </defs>

          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = padding.left + index * (barWidth + barSpacing);
            const y = padding.top + chartHeight - barHeight;

            return (
              <g key={index}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                  rx="2"
                >
                  <title>{`${item.label}: ${item.value}`}</title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={height - 5}
                  fill="rgba(255,255,255,0.8)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {item.label}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  fill="white"
                  fontSize="12"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {item.value}
                </text>
              </g>
            );
          })}

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="analytics-charts">
      <div className="chart-section">
        <h3>📈 ページビュー推移</h3>
        <LineChart data={pageViewsTimeSeries} />
      </div>

      <div className="chart-section">
        <h3>📊 イベント種別分布</h3>
        <PieChart data={eventTypeDistribution} />
      </div>

      <div className="chart-section">
        <h3>⏱️ セッション時間分布</h3>
        <BarChart data={sessionDurations} />
      </div>
    </div>
  );
};

export default AnalyticsCharts;