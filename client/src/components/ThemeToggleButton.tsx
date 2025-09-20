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
      className="absolute top-4 right-4 rounded px-3 py-1 text-sm
                 border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
    >
      {theme === 'light' ? (
        <div className="flex items-center gap-2">
          <Moon size={16} /> Dark
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Sun size={16} /> Light
        </div>
      )}
    </button>
  );
}
