'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check local storage or system default
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Prevent hydration mismatch by returning a placeholder of the same size
  if (!mounted) {
    return <div style={{ width: '38px', height: '38px' }} />;
  }

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      style={{
        borderRadius: '50%',
        width: '38px',
        height: '38px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        padding: 0
      }}
      className="theme-toggle-btn"
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
    </button>
  );
}
