'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../app/context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="
            relative flex items-center justify-center
            w-9 h-9 rounded-lg
            text-gray-600 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-white/10
            transition-colors duration-300
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue
        "
        >
        {/* Sun icon — visible in dark mode (click to go light) */}
        <Sun
            size={18}
            className={`
            absolute transition-all duration-300
            ${theme === 'dark'
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 rotate-90 scale-50 pointer-events-none'}
            `}
            aria-hidden="true"
        />

        {/* Moon icon — visible in light mode (click to go dark) */}
        <Moon
            size={18}
            className={`
            absolute transition-all duration-300
            ${theme === 'light'
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-90 scale-50 pointer-events-none'}
            `}
            aria-hidden="true"
        />
        </button>
    );
}