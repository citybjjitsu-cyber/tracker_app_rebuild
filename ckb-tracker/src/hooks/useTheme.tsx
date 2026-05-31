'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ThemeConfig } from '@/types';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  activeTheme: ThemeConfig | null;
  activeThemeName: string | null;
  resetToDefault: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_VAR_KEYS = [
  '--background', '--foreground', '--card', '--card-foreground',
  '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
  '--muted', '--muted-foreground', '--accent', '--accent-foreground',
  '--destructive', '--destructive-foreground', '--border', '--input',
  '--ring', '--radius', '--headline-font', '--body-font',
] as const;

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored) return stored;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function clearThemeVars() {
  const root = document.documentElement;
  for (const key of THEME_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}

function applyThemeVars(config: ThemeConfig, isDark: boolean) {
  const root = document.documentElement;
  const vars = isDark && config.dark ? { ...config, ...config.dark } : config;
  Object.entries(vars).forEach(([key, value]) => {
    if (key === 'dark' || key === 'headline_font' || key === 'body_font' || key === 'logo_url') return;
    if (typeof value === 'string') {
      root.style.setProperty(key, value);
    }
  });
  if (config.headline_font) {
    root.style.setProperty('--headline-font', config.headline_font);
  }
  if (config.body_font) {
    root.style.setProperty('--body-font', config.body_font);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [activeTheme, setActiveTheme] = useState<ThemeConfig | null>(null);
  const [activeThemeName, setActiveThemeName] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (activeTheme) {
      applyThemeVars(activeTheme, theme === 'dark');
    }
  }, [theme, activeTheme]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/themes/active`)
      .then(res => {
        if (!res.ok) throw new Error('No active theme');
        return res.json();
      })
      .then(data => {
        try {
          const config = typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
          setActiveTheme(config as ThemeConfig);
          setActiveThemeName(data.name);
          applyThemeVars(config as ThemeConfig, getInitialTheme() === 'dark');
        } catch {
          clearThemeVars();
        }
      })
      .catch(() => {
        clearThemeVars();
      });
  }, []);

  const resetToDefault = useCallback(() => {
    clearThemeVars();
    setActiveTheme(null);
    setActiveThemeName(null);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, activeTheme, activeThemeName, resetToDefault }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
