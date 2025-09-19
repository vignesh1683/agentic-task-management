'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '../app/context/theme-context';

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <button className="absolute top-4 right-4 px-3 py-1 opacity-0"></button>;
  }

  return (
    <button
      onClick={toggleTheme}
      className="absolute top-4 right-4 rounded px-3 py-1 text-sm border
                 border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
    >
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  );
}
