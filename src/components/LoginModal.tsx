import React, { useState } from 'react';
import { authService, type AuthCredentials } from '../services/authService';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [credentials, setCredentials] = useState<AuthCredentials>({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    // 少し遅延を追加してリアルな認証感を演出
    setTimeout(() => {
      const success = authService.login(credentials);

      if (success) {
        setCredentials({ username: '', password: '' });
        onLoginSuccess();
        onClose();
      } else {
        setError('ユーザー名またはパスワードが正しくありません');
      }

      setIsLoading(false);
    }, 800);
  };

  const handleInputChange = (field: keyof AuthCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    if (error) setError(''); // エラーをクリア
  };

  const handleClose = () => {
    setCredentials({ username: '', password: '' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={handleClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-header">
          <h2>🔐 管理者ログイン</h2>
          <button onClick={handleClose} className="login-modal-close">✕</button>
        </div>

        <div className="login-modal-content">
          <p className="login-description">
            アナリティクスダッシュボードにアクセスするには管理者認証が必要です
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">ユーザー名</label>
              <input
                id="username"
                type="text"
                value={credentials.username}
                onChange={handleInputChange('username')}
                placeholder="管理者ユーザー名"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={handleInputChange('password')}
                placeholder="パスワード"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                className="cancel-btn"
                disabled={isLoading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="login-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner">🔄</span>
                    認証中...
                  </>
                ) : (
                  'ログイン'
                )}
              </button>
            </div>
          </form>

          <div className="login-hint">
            💡 管理者のみアクセス可能です
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;