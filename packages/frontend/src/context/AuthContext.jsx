// packages/frontend/src/context/AuthContext.jsx
// Provides authentication state to the entire app.
// Handles: login, logout, token refresh, mustChangePassword flag.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ── State ────────────────────────────────────────────────────────
  const [user, setUser]           = useState(null);     // Full user object
  const [loading, setLoading]     = useState(true);     // True during initial auth check
  const [mustChangePwd, setMustChangePwd] = useState(false);

  const refreshTimerRef = useRef(null); // Stores the setTimeout handle for auto-refresh

  // ── Token helpers ─────────────────────────────────────────────────
  const getAccess  = () => localStorage.getItem('bc_access');
  const getRefresh = () => localStorage.getItem('bc_refresh');
  const saveTokens = (access, refresh) => {
    localStorage.setItem('bc_access', access);
    if (refresh) localStorage.setItem('bc_refresh', refresh);
  };
  const clearTokens = () => {
    localStorage.removeItem('bc_access');
    localStorage.removeItem('bc_refresh');
  };

  // ── scheduleRefresh ───────────────────────────────────────────────
  // Automatically refreshes the access token before it expires.
  // Access token lives for 15 min; we refresh at 13 min.
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.post('/auth/refresh', { refreshToken: getRefresh() });
        saveTokens(data.accessToken, data.refreshToken);
        scheduleRefresh(); // Schedule the next refresh
      } catch {
        // Refresh failed — session expired, force logout
        clearSession();
      }
    }, 13 * 60 * 1000); // 13 minutes
  }, []);

  // ── clearSession ──────────────────────────────────────────────────
  const clearSession = useCallback(() => {
    clearTokens();
    clearTimeout(refreshTimerRef.current);
    setUser(null);
    setMustChangePwd(false);
  }, []);

  // ── On mount: restore session from localStorage ───────────────────
  useEffect(() => {
    const access = getAccess();
    if (!access) { setLoading(false); return; }

    // Validate the stored token by fetching the user profile
    api.get('/settings/me', { headers: { Authorization: `Bearer ${access}` } })
      .then(({ data }) => {
        setUser(data);
        scheduleRefresh();
      })
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, [scheduleRefresh]);

  // ── login ─────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setMustChangePwd(data.mustChangePassword || false);
    scheduleRefresh();
    return data;
  }, [scheduleRefresh]);

  // ── signup ────────────────────────────────────────────────────────
  const signup = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/signup', { username, password });
    saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    scheduleRefresh();
    return data;
  }, [scheduleRefresh]);

  // ── logout ────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    clearSession();
  }, [clearSession]);

  // ── recoverWithToken ──────────────────────────────────────────────
  // Used after fuzzy-match or admin approval recovery
  const recoverWithToken = useCallback(async (recoveryToken) => {
    const { data } = await api.post('/auth/recover', { recoveryToken });
    saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    setMustChangePwd(true);
    scheduleRefresh();
    return data;
  }, [scheduleRefresh]);

  // ── updateUser ────────────────────────────────────────────────────
  // Call this after settings changes (username, theme) to keep
  // the in-memory user object in sync.
  const updateUser = useCallback((partial) => {
    setUser(prev => ({ ...prev, ...partial }));
  }, []);

  const value = {
    user, loading, mustChangePwd, setMustChangePwd,
    login, signup, logout, recoverWithToken, updateUser,
    getAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Convenience hook
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
