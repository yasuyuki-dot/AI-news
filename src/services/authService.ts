interface AuthCredentials {
  username: string;
  password: string;
}

interface AuthSession {
  isAuthenticated: boolean;
  username: string;
  loginTime: number;
  expiresAt: number;
}

class AuthService {
  private readonly ADMIN_USERNAME = 'admin';
  private readonly ADMIN_PASSWORD = 'ai-news-2025';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間
  private readonly SESSION_KEY = 'ai_news_auth_session';

  // ログイン
  login(credentials: AuthCredentials): boolean {
    if (
      credentials.username === this.ADMIN_USERNAME &&
      credentials.password === this.ADMIN_PASSWORD
    ) {
      const now = Date.now();
      const session: AuthSession = {
        isAuthenticated: true,
        username: credentials.username,
        loginTime: now,
        expiresAt: now + this.SESSION_DURATION
      };

      try {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return true;
      } catch (error) {
        console.error('Failed to save session:', error);
        return false;
      }
    }
    return false;
  }

  // ログアウト
  logout(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to remove session:', error);
    }
  }

  // 認証状態チェック
  isAuthenticated(): boolean {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return false;

      const session: AuthSession = JSON.parse(sessionData);
      const now = Date.now();

      // セッションが期限切れかチェック
      if (now > session.expiresAt) {
        this.logout();
        return false;
      }

      return session.isAuthenticated;
    } catch (error) {
      console.error('Failed to check authentication:', error);
      this.logout();
      return false;
    }
  }

  // セッション情報取得
  getSession(): AuthSession | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;

      const session: AuthSession = JSON.parse(sessionData);
      if (this.isAuthenticated()) {
        return session;
      }
      return null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  // セッション延長
  extendSession(): boolean {
    if (!this.isAuthenticated()) return false;

    try {
      const session = this.getSession();
      if (session) {
        session.expiresAt = Date.now() + this.SESSION_DURATION;
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return true;
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
    return false;
  }

  // 残り時間取得（分）
  getTimeRemaining(): number {
    const session = this.getSession();
    if (!session) return 0;

    const remaining = session.expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / (60 * 1000))); // 分単位
  }
}

export const authService = new AuthService();
export type { AuthCredentials, AuthSession };