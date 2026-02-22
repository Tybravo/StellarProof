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

    const applyTheme = (t: Theme) => {
        const root = document.documentElement;
        root.dataset.theme = t;
        if (t === 'dark') {
        root.classList.add('dark');
        } else {
        root.classList.remove('dark');
        }
    };

    useEffect(() => {
        try {
            const stored = localStorage.getItem('stellarproof-theme') as Theme | null;
            if (stored === 'light') {
                setTheme('light');
                applyTheme('light');
            } else {
                setTheme('dark');
                applyTheme('dark');
            }
        } catch {
            setTheme('dark');
            applyTheme('dark');
        }
    }, []);

    const toggleTheme = () => {
        setTheme((prev) => {
        const next: Theme = prev === 'dark' ? 'light' : 'dark';
        localStorage.setItem('stellarproof-theme', next);
        applyTheme(next);
        return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
