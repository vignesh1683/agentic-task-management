'use client';

import { useTheme } from '@/app/context/theme-context';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
      style={{
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {theme === 'light' ? (
        <Moon size={16} className="transition-transform duration-300" />
      ) : (
        <Sun size={16} className="transition-transform duration-300" />
      )}
    </button>
  );
}
