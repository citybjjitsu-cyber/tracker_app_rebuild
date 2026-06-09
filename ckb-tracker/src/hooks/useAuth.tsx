'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
import { useRouter } from 'next/navigation';
import type { User, Role } from '@/types';

interface AuthContextType {
  user: User | null;
  roles: Role[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  isTablet: boolean;
  login: (email: string, password: string, isTeacherLogin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshSession: () => Promise<void>;
  csrfToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const isTeacher = roles.some(r => r.name === 'Teacher');
  const isAdmin = roles.some(r => r.name === 'Admin');
  const isTablet = roles.some(r => r.name === 'Tablet');
  const isAuthenticated = Boolean(user);

  const logout = async () => {
    const csrfToken = localStorage.getItem('csrf_token');
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setRoles([]);
      setCsrfToken(null);
      localStorage.removeItem('csrf_token');
      await new Promise(resolve => setTimeout(resolve, 50));
      router.push('/');
    }
  };

  const logoutAll = async () => {
    const csrfToken = localStorage.getItem('csrf_token');
    try {
      await fetch(`${API_BASE_URL}/auth/logout-all`, {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      setUser(null);
      setRoles([]);
      setCsrfToken(null);
      localStorage.removeItem('csrf_token');
      await new Promise(resolve => setTimeout(resolve, 50));
      router.push('/');
    }
  };

  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setRoles(data.roles || []);
        setCsrfToken(data.csrf_token || null);
        if (data.csrf_token) {
          localStorage.setItem('csrf_token', data.csrf_token);
        }
      } else {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setUser(refreshData.user);
          setRoles(refreshData.roles || []);
          setCsrfToken(refreshData.csrf_token || null);
          if (refreshData.csrf_token) {
            localStorage.setItem('csrf_token', refreshData.csrf_token);
          }
        } else {
          setUser(null);
          setRoles([]);
          setCsrfToken(null);
          localStorage.removeItem('csrf_token');
        }
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      setUser(null);
      setRoles([]);
      setCsrfToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, isTeacherLogin = false) => {
    const endpoint = isTeacherLogin ? '/auth/teacher-login' : '/auth/login';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setRoles(data.roles || []);
    setCsrfToken(data.csrf_token || null);
    if (data.csrf_token) {
      localStorage.setItem('csrf_token', data.csrf_token);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        isLoading,
        isAuthenticated,
        isTeacher,
        isAdmin,
        isTablet,
        login,
        logout,
        logoutAll,
        refreshSession,
        csrfToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
