import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, AUTH_SESSION_CHANGED_EVENT, AUTH_UNAUTHORIZED_EVENT, bindSessionToken, TOKEN_KEY } from "../lib/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  sessionError: string | null;
  retrySession: () => void;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  const logout = useCallback(() => {
    pending.current?.abort();
    localStorage.removeItem(TOKEN_KEY);
    bindSessionToken(null);
    setUser(null);
    setSessionError(null);
    setLoading(false);
  }, []);

  const restoreSession = useCallback(async (): Promise<User | null> => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const token = localStorage.getItem(TOKEN_KEY);
    bindSessionToken(null);
    setUser(null);
    setLoading(true);
    setSessionError(null);
    if (!token) {
      setLoading(false);
      return null;
    }
    try {
      const currentUser = await api.getMe(controller.signal, token);
      if (controller.signal.aborted || localStorage.getItem(TOKEN_KEY) !== token) return null;
      bindSessionToken(token);
      setUser(currentUser);
      return currentUser;
    } catch (cause) {
      if (controller.signal.aborted || localStorage.getItem(TOKEN_KEY) !== token) return null;
      if (cause instanceof ApiError && cause.status === 401) logout();
      else setSessionError("Chưa thể kiểm tra phiên đăng nhập. Hãy kiểm tra kết nối và thử lại.");
      return null;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void restoreSession();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY || event.key === null) void restoreSession();
    };
    const handleChanged = () => { void restoreSession(); };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      pending.current?.abort();
      bindSessionToken(undefined);
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, [logout, restoreSession]);

  const login = useCallback(async (identifier: string, password: string) => {
    const token = await api.login(identifier, password);
    localStorage.setItem(TOKEN_KEY, token.access_token);
    const currentUser = await restoreSession();
    if (!currentUser) throw new ApiError("Chưa thể kiểm tra phiên đăng nhập. Hãy thử lại.", 503);
    return currentUser;
  }, [restoreSession]);

  const value = useMemo(
    () => ({ user, loading, sessionError, retrySession: () => { void restoreSession(); }, login, logout }),
    [loading, login, logout, restoreSession, sessionError, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được sử dụng bên trong AuthProvider.");
  return context;
}
