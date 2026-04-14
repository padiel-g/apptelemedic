"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  role: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    console.log('Login API response status:', res.status, 'body:', data);
    if (!res.ok) {
      console.log('Login failed, not ok');
      throw new Error(data.error || 'Login failed');
    }
    setUser(data.user);
    const role = data.user?.role || data.role;
    if (role === 'patient') {
      console.log('Redirecting to /patient');
      router.push('/patient');
    } else if (role === 'doctor') {
      console.log('Redirecting to /doctor');
      router.push('/doctor');
    } else if (role === 'admin') {
      console.log('Redirecting to /admin');
      router.push('/admin');
    } else {
      console.log('Redirecting to /');
      router.push('/');
    }
    // CRITICAL: force Next.js to re-run middleware with new cookie
    router.refresh();
    console.log('router.refresh() called after push');
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAuthenticated: !!user, role: user?.role || null }}>
      {children}
    </AuthContext.Provider>
  );
}
