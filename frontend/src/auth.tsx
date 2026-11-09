import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, Me, setToken } from './api';

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const refresh = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (getToken()) refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const finish = async (res: { accessToken: string }) => {
    setToken(res.accessToken);
    await refresh();
  };

  const value: AuthState = {
    user,
    loading,
    refresh,
    login: async (e, p) => finish(await api.login(e, p)),
    register: async (n, e, p) => finish(await api.register(n, e, p)),
    loginWithGoogle: async (t) => finish(await api.google(t)),
    logout: () => {
      setToken(null);
      setUser(null);
    },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
