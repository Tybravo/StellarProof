'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('stellarproof-theme') as Theme | null;
        if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
        applyTheme(stored);
        } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial: Theme = prefersDark ? 'dark' : 'light';
        setTheme(initial);
        applyTheme(initial);
        }
        setMounted(true);
    }, []);

    const applyTheme = (t: Theme) => {
        const root = document.documentElement;
        if (t === 'dark') {
        root.classList.add('dark');
        } else {
        root.classList.remove('dark');
        }
    };

    const toggleTheme = () => {
        setTheme((prev) => {
        const next: Theme = prev === 'dark' ? 'light' : 'dark';
        localStorage.setItem('stellarproof-theme', next);
        applyTheme(next);
        return next;
        });
    };

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}