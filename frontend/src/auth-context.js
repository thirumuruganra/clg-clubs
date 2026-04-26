import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext(null);

const AUTH_CACHE_KEY = 'wavc.auth.user';

function readCachedUser() {
  if (typeof window === 'undefined') return null;

  try {
    const cached = window.sessionStorage.getItem(AUTH_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user) {
  if (typeof window === 'undefined') return;

  try {
    if (user) {
      window.sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
      return;
    }

    window.sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // Ignore storage write failures and continue with in-memory auth state.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const payload = await response.json();
        setUser(payload);
        writeCachedUser(payload);
      } else {
        setUser(null);
        writeCachedUser(null);
      }
    } catch {
      setUser(null);
      writeCachedUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    window.location.href = '/api/auth/logout';
  }, []);

  const value = useMemo(
    () => ({ user, loading, logout, refetchUser: fetchUser }),
    [user, loading, logout, fetchUser],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
