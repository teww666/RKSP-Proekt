import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, getStoredToken, persistToken } from '../api';
import type { Profile, Role } from '../types';

type AuthState = {
  profile: Profile | null;
  token: string | null;
  busy: boolean;
  error: string | null;
};

type AuthActions = {
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    payload: Pick<Profile, 'email' | 'fullName'> & { password: string },
  ) => Promise<boolean>;
  logout: () => void;
  reloadProfile: () => Promise<void>;
  canModerateRooms: boolean;
};

const AuthContext = createContext<(AuthState & AuthActions) | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setProfile(null);
      setBusy(false);
      return;
    }
    persistToken(token);
    const res = await apiClient.get<Profile>('/users/me').catch(() => null);
    if (!res?.data) {
      persistToken(null);
      setProfile(null);
    } else {
      setProfile(res.data);
    }
    setBusy(false);
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await apiClient.post<{ accessToken: string }>('/auth/login', {
      email,
      password,
    });
    persistToken(res.data.accessToken);
    await hydrate();
    return true;
  }, [hydrate]);

  const register = useCallback(
    async (payload: Pick<Profile, 'email' | 'fullName'> & { password: string }) => {
      setError(null);
      const res = await apiClient.post<{ accessToken: string }>('/auth/register', payload);
      persistToken(res.data.accessToken);
      await hydrate();
      return true;
    },
    [hydrate],
  );

  const logout = useCallback(() => {
    persistToken(null);
    setProfile(null);
  }, []);

  const reloadProfile = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const actions = useMemo<AuthActions>(() => {
    const canModerateRooms = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
    return {
      login: async (...args) => {
        try {
          return await login(...args);
        } catch {
          setError('Неверные учётные данные или сервер недоступен.');
          persistToken(null);
          return false;
        }
      },
      register: async (payload) => {
        try {
          return await register(payload);
        } catch {
          setError('Регистрация не удалась. Проверьте почту или пароль.');
          persistToken(null);
          return false;
        }
      },
      logout,
      reloadProfile,
      canModerateRooms,
    };
  }, [login, logout, reloadProfile, register, profile?.role]);

  const value = useMemo(
    () => ({
      profile,
      busy,
      error,
      token: getStoredToken(),
      ...actions,
    }),
    [profile, busy, error, actions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider отсутствует');
  }
  return ctx;
}

export function canConfirmBookings(role: Role | undefined) {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function canDestroyRooms(role: Role | undefined) {
  return role === 'ADMIN';
}
