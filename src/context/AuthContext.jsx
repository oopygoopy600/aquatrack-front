import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const TOKEN_KEY = 'aquatrack_token';
const USER_KEY = 'aquatrack_user';
const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Holds the signed-in user and JWT. On first load it validates any stored
 * token against /auth/me so a stale token can never render a protected page.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    localStorage.getItem(TOKEN_KEY) ? readStoredUser() : null
  );
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [initializing, setInitializing] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY))
  );

  useEffect(() => {
    let cancelled = false;
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!storedToken) {
      setInitializing(false);
      return undefined;
    }

    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (cancelled) return;
        setUser(data.data);
        setToken(storedToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data.data));
      } catch {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('aquatrack:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('aquatrack:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    const { token: nextToken, user: nextUser } = data.data;
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [user, token, initializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}
