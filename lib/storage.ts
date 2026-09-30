/**
 * Simple Storage Utility
 * Wrapper for localStorage with auth helpers
 */

interface UserInfo {
  username: string;
  email: string;
}

const USER_KEY = 'user_info';

export const storage = {
  login(user: UserInfo) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('token');
    }
  },

  getUser(): UserInfo | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn(): boolean {
    return this.getUser() !== null;
  },
};
