// packages/frontend/src/context/ThemeContext.jsx
// Injects the active theme's CSS variables onto <body> as inline styles.
// Also sets data-theme on <html> so per-theme CSS selectors work.

import { createContext, useContext, useEffect, useState } from 'react';
import themes from '../themes/themes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeNameState] = useState(
    () => localStorage.getItem('bc_theme') || 'biocube'
  );

  useEffect(() => {
    const theme = themes[themeName] || themes.biocube;
    const body  = document.body;
    const root  = document.documentElement;

    // Remove all old --bc- variables
    for (const key of Object.keys(themes.biocube)) {
      if (key.startsWith('--')) body.style.removeProperty(key);
    }

    // Apply new theme variables
    for (const [key, value] of Object.entries(theme)) {
      if (key.startsWith('--')) body.style.setProperty(key, value);
    }

    // Set data-theme on <html> for CSS [data-theme="x"] selectors
    root.setAttribute('data-theme', themeName);

    // Remove old theme classes and add new one
    Object.values(themes).forEach(t => {
      if (t.themeClass) root.classList.remove(t.themeClass);
    });
    if (theme.themeClass) root.classList.add(theme.themeClass);

    localStorage.setItem('bc_theme', themeName);
  }, [themeName]);

  const setTheme = (name) => {
    if (themes[name]) setThemeNameState(name);
  };

  return (
    <ThemeContext.Provider value={{ themeName, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
};
