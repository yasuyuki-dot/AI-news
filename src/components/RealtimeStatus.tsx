import { useState, useEffect } from 'react';
import { realtimeService, type ConnectionStatus, type RealtimeEvent } from '../services/realtimeService';
import { notificationService } from '../services/notificationService';
import './RealtimeStatus.css';

interface RealtimeStatusProps {
  onStatusChange?: (connected: boolean) => void;
}

const RealtimeStatus: React.FC<RealtimeStatusProps> = ({ onStatusChange }) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    realtimeService.getConnectionStatus()
  );
  const [showSettings, setShowSettings] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [newsCount, setNewsCount] = useState<number>(0);
  const [notificationSettings, setNotificationSettings] = useState(
    notificationService.getSettings()
  );

  useEffect(() => {
    const handleRealtimeEvent = (event: RealtimeEvent) => {
      switch (event.type) {
        case 'connection_status':
          const newStatus = realtimeService.getConnectionStatus();
          setConnectionStatus(newStatus);
          onStatusChange?.(newStatus.connected);
          break;

        case 'news_update':
          if (Array.isArray(event.data)) {
            setLastUpdateTime(event.timestamp);
            setNewsCount(event.data.length);

            // 通知送信
            notificationService.notifyNews(event.data);
          }
          break;

        case 'error':
          console.error('Realtime error:', event.data);
          break;
      }
    };

    // リアルタイムサービスに購読
    realtimeService.subscribe('status-component', handleRealtimeEvent);

    return () => {
      realtimeService.unsubscribe('status-component');
    };
  }, [onStatusChange]);

  const handleToggleRealtime = () => {
    if (connectionStatus.connected) {
      realtimeService.stopRealtimeUpdates();
    } else {
      realtimeService.startRealtimeUpdates();
    }
  };

  const handleFrequencyChange = (frequency: 'high' | 'normal' | 'low') => {
    realtimeService.setUpdateFrequency(frequency);
  };

  const handleManualUpdate = async () => {
    try {
      await realtimeService.triggerManualUpdate();
    } catch (error) {
      console.error('Manual update failed:', error);
    }
  };

  const handleNotificationToggle = async () => {
    if (notificationSettings.enabled) {
      notificationService.disable();
    } else {
      const granted = await notificationService.requestPermission();
      if (granted) {
        notificationService.updateSettings({ enabled: true });
      }
    }
    setNotificationSettings(notificationService.getSettings());
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
    } catch (error) {
      alert('通知の許可が必要です。ブラウザの設定で通知を許可してください。');
    }
  };

  const formatLastUpdate = (timestamp: number) => {
    if (timestamp === 0) return '未更新';

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) { // 1分未満
      return 'たった今';
    } else if (diff < 3600000) { // 1時間未満
      return `${Math.floor(diff / 60000)}分前`;
    } else {
      return new Date(timestamp).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusIcon = () => {
    if (connectionStatus.connected) {
      return connectionStatus.retryCount > 0 ? '🟡' : '🟢';
    }
    return connectionStatus.error ? '🔴' : '⚫';
  };

  const getStatusText = () => {
    if (connectionStatus.connected) {
      return connectionStatus.retryCount > 0 ? 'リトライ中' : 'オンライン';
    }
    return connectionStatus.error ? 'エラー' : 'オフライン';
  };

  return (
    <div className="realtime-status">
      <div className="status-main">
        <div className="status-indicator">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
        </div>

        <div className="status-info">
          {lastUpdateTime > 0 && (
            <span className="last-update">
              📰 {newsCount}件 | 📅 {formatLastUpdate(lastUpdateTime)}
            </span>
          )}
        </div>

        <div className="status-controls">
          <button
            className={`toggle-btn ${connectionStatus.connected ? 'active' : ''}`}
            onClick={handleToggleRealtime}
            title={connectionStatus.connected ? 'リアルタイム更新を停止' : 'リアルタイム更新を開始'}
          >
            {connectionStatus.connected ? '⏸️ 停止' : '▶️ 開始'}
          </button>

          <button
            className="manual-update-btn"
            onClick={handleManualUpdate}
            disabled={connectionStatus.connected}
            title="手動更新"
          >
            🔄
          </button>

          <button
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="設定"
          >
            ⚙️
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h4>リアルタイム設定</h4>
            <button
              className="close-settings"
              onClick={() => setShowSettings(false)}
            >
              ✕
            </button>
          </div>

          <div className="settings-content">
            <div className="setting-group">
              <label>更新頻度</label>
              <div className="frequency-buttons">
                <button
                  className="frequency-btn"
                  onClick={() => handleFrequencyChange('high')}
                >
                  高頻度 (2分)
                </button>
                <button
                  className="frequency-btn"
                  onClick={() => handleFrequencyChange('normal')}
                >
                  通常 (5分)
                </button>
                <button
                  className="frequency-btn"
                  onClick={() => handleFrequencyChange('low')}
                >
                  低頻度 (10分)
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={notificationSettings.enabled}
                  onChange={handleNotificationToggle}
                />
                デスクトップ通知
              </label>
              {notificationSettings.enabled && (
                <button
                  className="test-notification-btn"
                  onClick={handleTestNotification}
                >
                  テスト通知
                </button>
              )}
            </div>

            {connectionStatus.error && (
              <div className="error-info">
                <strong>エラー:</strong> {connectionStatus.error}
              </div>
            )}

            {connectionStatus.retryCount > 0 && (
              <div className="retry-info">
                リトライ回数: {connectionStatus.retryCount}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeStatus;