import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import AnalyticsDashboard from './AnalyticsDashboard';
import './AdminAccess.css';

interface AdminAccessProps {
  onClose?: () => void;
}

const AdminAccess: React.FC<AdminAccessProps> = ({ onClose }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // 管理者セッションが有効かチェック
    const isAuthenticated = authService.isAuthenticated();
    if (isAuthenticated) {
      setIsAdminAuthenticated(true);
      setShowLogin(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const success = authService.login(loginData);

    if (success) {
      setIsAdminAuthenticated(true);
      setShowLogin(false);
      setLoginData({ username: '', password: '' });
    } else {
      setLoginError('ユーザー名またはパスワードが正しくありません');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAdminAuthenticated(false);
    setShowAnalytics(false);
    setShowLogin(false);
  };

  // 何も表示しない場合はnullを返す
  if (!showLogin && !isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="admin-access">
      {/* ログインモーダル */}
      {showLogin && !isAdminAuthenticated && (
        <div className="admin-login-overlay">
          <div className="admin-login-modal">
            <div className="admin-login-header">
              <h3>🔐 管理者ログイン</h3>
              <button
                onClick={() => {
                  setShowLogin(false);
                  onClose?.();
                }}
                className="close-login-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogin} className="admin-login-form">
              <div className="input-group">
                <label htmlFor="admin-username">ユーザー名:</label>
                <input
                  type="text"
                  id="admin-username"
                  value={loginData.username}
                  onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="input-group">
                <label htmlFor="admin-password">パスワード:</label>
                <input
                  type="password"
                  id="admin-password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
              </div>

              {loginError && (
                <div className="login-error">❌ {loginError}</div>
              )}

              <div className="login-actions">
                <button type="submit" className="login-btn">
                  🔓 ログイン
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogin(false);
                    onClose?.();
                  }}
                  className="cancel-btn"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 管理者メニュー */}
      {isAdminAuthenticated && !showAnalytics && (
        <div className="admin-menu">
          <div className="admin-menu-header">
            <div className="admin-menu-top">
              <h3>🛠️ 管理者メニュー</h3>
              <button
                onClick={() => {
                  handleLogout();
                  onClose?.();
                }}
                className="close-admin-btn"
              >
                ✕
              </button>
            </div>
            <div className="admin-actions">
              <button
                onClick={() => setShowAnalytics(true)}
                className="analytics-btn"
              >
                📊 アナリティクス
              </button>
              <button onClick={handleLogout} className="logout-btn">
                🔐 ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アナリティクスダッシュボード */}
      {isAdminAuthenticated && showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
};

// useAdminShortcut フックは App.tsx に移動しました

export default AdminAccess;