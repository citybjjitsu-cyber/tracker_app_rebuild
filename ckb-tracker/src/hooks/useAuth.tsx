'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role } from '@/types';
import { apiUrl } from '@/lib/apiBase';

interface AuthContextType {
  user: User | null;
  roles: Role[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  isLiteAdmin: boolean;
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
  const authRequestId = useRef(0);

  const isTeacher = roles.some(r => r.name === 'Teacher');
  const isAdmin = roles.some(r => r.name === 'Admin');
  const isLiteAdmin = roles.some(r => r.name === 'Lite-Admin') || isAdmin;
  const isTablet = roles.some(r => r.name === 'Tablet');
  const isAuthenticated = Boolean(user);

  const logout = async () => {
    const csrfToken = sessionStorage.getItem('csrf_token');
    try {
      await fetch(apiUrl('/auth/logout'), {
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
      sessionStorage.removeItem('csrf_token');
      await new Promise(resolve => setTimeout(resolve, 50));
      router.push('/');
    }
  };

  const logoutAll = async () => {
    const csrfToken = sessionStorage.getItem('csrf_token');
    try {
      await fetch(apiUrl('/auth/logout-all'), {
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
      sessionStorage.removeItem('csrf_token');
      await new Promise(resolve => setTimeout(resolve, 50));
      router.push('/');
    }
  };

  const refreshSession = async () => {
    const requestId = ++authRequestId.current;
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/auth/me'), {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (requestId === authRequestId.current) {
          setUser(data.user);
          setRoles(data.roles || []);
          setCsrfToken(data.csrf_token || null);
          if (data.csrf_token) {
            sessionStorage.setItem('csrf_token', data.csrf_token);
          }
        }
      } else {
        const refreshResponse = await fetch(apiUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (requestId === authRequestId.current) {
            setUser(refreshData.user);
            setRoles(refreshData.roles || []);
            setCsrfToken(refreshData.csrf_token || null);
            if (refreshData.csrf_token) {
              sessionStorage.setItem('csrf_token', refreshData.csrf_token);
            }
          }
        } else if (requestId === authRequestId.current) {
          setUser(null);
          setRoles([]);
          setCsrfToken(null);
          sessionStorage.removeItem('csrf_token');
        }
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      if (requestId === authRequestId.current) {
        setUser(null);
        setRoles([]);
        setCsrfToken(null);
      }
    } finally {
      if (requestId === authRequestId.current) setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, isTeacherLogin = false) => {
    const requestId = ++authRequestId.current;
    const endpoint = isTeacherLogin ? '/auth/teacher-login' : '/auth/login';

    const response = await fetch(apiUrl(endpoint), {
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
    if (requestId === authRequestId.current) {
      setUser(data.user);
      setRoles(data.roles || []);
      setCsrfToken(data.csrf_token || null);
      if (data.csrf_token) {
        sessionStorage.setItem('csrf_token', data.csrf_token);
      }
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
        isLiteAdmin,
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
