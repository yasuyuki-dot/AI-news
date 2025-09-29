import React, { useState, useEffect } from 'react';
import './AnalyticsFilters.css';

interface FilterState {
  dateRange: {
    start: string;
    end: string;
    preset: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  };
  eventTypes: string[];
  sources: string[];
  categories: string[];
  searchTerms: string[];
  sessionDuration: {
    min: number;
    max: number;
  };
  userAgent: string[];
}

interface AnalyticsFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  availableFilters: {
    eventTypes: string[];
    sources: string[];
    categories: string[];
    searchTerms: string[];
    userAgents: string[];
  };
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({ onFilterChange, availableFilters }) => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: 'today'
    },
    eventTypes: [],
    sources: [],
    categories: [],
    searchTerms: [],
    sessionDuration: {
      min: 0,
      max: 3600 // 1 hour in seconds
    },
    userAgent: []
  });

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleDatePresetChange = (preset: FilterState['dateRange']['preset']) => {
    const today = new Date();
    let start: string, end: string;

    switch (preset) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        start = end = yesterday.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start = monthAgo.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      dateRange: { ...prev.dateRange, preset, start, end }
    }));
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        preset: 'custom',
        [field]: value
      }
    }));
  };

  const handleArrayFilterToggle = (
    filterType: keyof Pick<FilterState, 'eventTypes' | 'sources' | 'categories' | 'searchTerms' | 'userAgent'>,
    value: string
  ) => {
    setFilters(prev => {
      const currentArray = prev[filterType];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];

      return {
        ...prev,
        [filterType]: newArray
      };
    });
  };

  const handleSessionDurationChange = (field: 'min' | 'max', value: number) => {
    setFilters(prev => ({
      ...prev,
      sessionDuration: {
        ...prev.sessionDuration,
        [field]: value
      }
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      dateRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
        preset: 'today'
      },
      eventTypes: [],
      sources: [],
      categories: [],
      searchTerms: [],
      sessionDuration: {
        min: 0,
        max: 3600
      },
      userAgent: []
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.eventTypes.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.searchTerms.length > 0) count++;
    if (filters.userAgent.length > 0) count++;
    if (filters.sessionDuration.min > 0 || filters.sessionDuration.max < 3600) count++;
    return count;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds >= 3600) {
      return `${Math.floor(seconds / 3600)}時間`;
    } else if (seconds >= 60) {
      return `${Math.floor(seconds / 60)}分`;
    } else {
      return `${seconds}秒`;
    }
  };

  return (
    <div className={`analytics-filters ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="filters-header">
        <div className="filters-title">
          <h3>🔍 フィルター</h3>
          {getActiveFilterCount() > 0 && (
            <span className="active-filter-count">{getActiveFilterCount()}</span>
          )}
        </div>
        <div className="filters-controls">
          <button
            onClick={clearAllFilters}
            className="clear-filters-btn"
            disabled={getActiveFilterCount() === 0}
          >
            🗑️ クリア
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="toggle-filters-btn"
          >
            {isExpanded ? '🔼 折りたたむ' : '🔽 展開'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="filters-content">
          {/* 日付範囲フィルター */}
          <div className="filter-section">
            <h4>📅 日付範囲</h4>
            <div className="date-presets">
              {['today', 'yesterday', 'week', 'month'].map(preset => (
                <button
                  key={preset}
                  onClick={() => handleDatePresetChange(preset as any)}
                  className={`date-preset-btn ${filters.dateRange.preset === preset ? 'active' : ''}`}
                >
                  {preset === 'today' && '今日'}
                  {preset === 'yesterday' && '昨日'}
                  {preset === 'week' && '過去1週間'}
                  {preset === 'month' && '過去1ヶ月'}
                </button>
              ))}
            </div>
            <div className="custom-date-range">
              <div className="date-input-group">
                <label>開始日:</label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label>終了日:</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
          </div>

          {/* イベントタイプフィルター */}
          <div className="filter-section">
            <h4>📊 イベントタイプ</h4>
            <div className="checkbox-grid">
              {availableFilters.eventTypes.map(eventType => (
                <label key={eventType} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={filters.eventTypes.includes(eventType)}
                    onChange={() => handleArrayFilterToggle('eventTypes', eventType)}
                  />
                  <span className="checkbox-label">
                    {eventType === 'page_view' && '📄 ページビュー'}
                    {eventType === 'article_click' && '📰 記事クリック'}
                    {eventType === 'search' && '🔍 検索'}
                    {eventType === 'category_view' && '📂 カテゴリ表示'}
                    {eventType === 'feature_use' && '⚡ 機能使用'}
                    {eventType === 'session_start' && '🚀 セッション開始'}
                    {eventType === 'session_end' && '🏁 セッション終了'}
                    {!['page_view', 'article_click', 'search', 'category_view', 'feature_use', 'session_start', 'session_end'].includes(eventType) && eventType}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* ソースフィルター */}
          {availableFilters.sources.length > 0 && (
            <div className="filter-section">
              <h4>📰 ニュースソース</h4>
              <div className="checkbox-grid">
                {availableFilters.sources.slice(0, 10).map(source => (
                  <label key={source} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(source)}
                      onChange={() => handleArrayFilterToggle('sources', source)}
                    />
                    <span className="checkbox-label">{source}</span>
                  </label>
                ))}
              </div>
              {availableFilters.sources.length > 10 && (
                <div className="more-items">
                  +{availableFilters.sources.length - 10} その他のソース
                </div>
              )}
            </div>
          )}

          {/* カテゴリフィルター */}
          {availableFilters.categories.length > 0 && (
            <div className="filter-section">
              <h4>📂 カテゴリ</h4>
              <div className="checkbox-grid">
                {availableFilters.categories.map(category => (
                  <label key={category} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={() => handleArrayFilterToggle('categories', category)}
                    />
                    <span className="checkbox-label">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 検索キーワードフィルター */}
          {availableFilters.searchTerms.length > 0 && (
            <div className="filter-section">
              <h4>🔍 検索キーワード</h4>
              <div className="checkbox-grid">
                {availableFilters.searchTerms.slice(0, 15).map(term => (
                  <label key={term} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={filters.searchTerms.includes(term)}
                      onChange={() => handleArrayFilterToggle('searchTerms', term)}
                    />
                    <span className="checkbox-label">"{term}"</span>
                  </label>
                ))}
              </div>
              {availableFilters.searchTerms.length > 15 && (
                <div className="more-items">
                  +{availableFilters.searchTerms.length - 15} その他のキーワード
                </div>
              )}
            </div>
          )}

          {/* セッション時間フィルター */}
          <div className="filter-section">
            <h4>⏱️ セッション時間</h4>
            <div className="duration-filter">
              <div className="duration-input-group">
                <label>最小時間:</label>
                <select
                  value={filters.sessionDuration.min}
                  onChange={(e) => handleSessionDurationChange('min', parseInt(e.target.value))}
                  className="duration-select"
                >
                  <option value={0}>制限なし</option>
                  <option value={30}>30秒以上</option>
                  <option value={60}>1分以上</option>
                  <option value={300}>5分以上</option>
                  <option value={600}>10分以上</option>
                  <option value={1800}>30分以上</option>
                </select>
              </div>
              <div className="duration-input-group">
                <label>最大時間:</label>
                <select
                  value={filters.sessionDuration.max}
                  onChange={(e) => handleSessionDurationChange('max', parseInt(e.target.value))}
                  className="duration-select"
                >
                  <option value={60}>1分以下</option>
                  <option value={300}>5分以下</option>
                  <option value={600}>10分以下</option>
                  <option value={1800}>30分以下</option>
                  <option value={3600}>1時間以下</option>
                  <option value={7200}>2時間以下</option>
                  <option value={86400}>制限なし</option>
                </select>
              </div>
            </div>
            <div className="duration-display">
              現在の設定: {formatDuration(filters.sessionDuration.min)} 〜 {formatDuration(filters.sessionDuration.max)}
            </div>
          </div>

          {/* ユーザーエージェントフィルター */}
          {availableFilters.userAgents.length > 0 && (
            <div className="filter-section">
              <h4>💻 ユーザーエージェント</h4>
              <div className="checkbox-grid">
                {availableFilters.userAgents.slice(0, 8).map(ua => (
                  <label key={ua} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={filters.userAgent.includes(ua)}
                      onChange={() => handleArrayFilterToggle('userAgent', ua)}
                    />
                    <span className="checkbox-label">
                      {ua.includes('Chrome') && '🌐 Chrome'}
                      {ua.includes('Firefox') && '🦊 Firefox'}
                      {ua.includes('Safari') && '🧭 Safari'}
                      {ua.includes('Edge') && '🔷 Edge'}
                      {ua.includes('Mobile') && '📱 Mobile'}
                      {!['Chrome', 'Firefox', 'Safari', 'Edge', 'Mobile'].some(browser => ua.includes(browser)) && '🖥️ その他'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsFilters;