'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, setAccessToken } from './api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    authAPI.logout().catch(() => {});
    setAccessToken(null);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    // Attempt auto-login using the HTTP-only refresh cookie
    authAPI.refresh()
      .then((res) => {
        const { accessToken } = res.data;
        setAccessToken(accessToken);
        setToken(accessToken);
        return authAPI.me();
      })
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        setAccessToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    // Handle global logout events from axios interceptor
    const handleLogoutEvent = () => {
      setAccessToken(null);
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const r = await authAPI.login({ email, password });
    const { accessToken, user } = r.data;
    setAccessToken(accessToken);
    setToken(accessToken);
    setUser(user);
    return user;
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const r = await authAPI.register({ name, email, password, phone });
    // User needs to verify email before logging in, so we do not save any tokens here.
    return r.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
