/** @type {import('tailwindcss').Config} */
module.exports = {
  // ✅ ADDED: enables dark mode via the 'dark' class on <html>
  darkMode: 'class',

  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#256AF4', // Deep Blue
          foreground: '#ffffff',
          light: '#60A5FA',   // Medium Blue
          dark: '#012254',    // Dark Blue
        },
        secondary: {
          DEFAULT: '#FF7CE9', // Deep Pink
          foreground: '#000000',
          light: '#FFB7F3',   // Light Pink
          dark: '#FF7CE9',    // Deep Pink
        },
        accent: {
          DEFAULT: '#60A5FA', // Medium Blue
          foreground: '#000000',
          light: '#FFB7F3',   // Light Pink
          dark: '#256AF4',    // Deep Blue
        },
        darkblue: {
          DEFAULT: '#012254', // Dark Blue  ← used as dark:bg-darkblue base
          light: '#256AF4',   // Deep Blue
          dark: '#000000',    // Black
        },
      },
      boxShadow: {
        'glow': '0 0 10px 2px rgba(37, 106, 244, 0.7)',
        'header': '0 4px 6px -1px rgba(1, 34, 84, 0.3)',
        'button-glow': '0 0 15px rgba(37, 106, 244, 0.5)',
        'button-glow-secondary': '0 0 15px rgba(255, 124, 233, 0.5)',
      },
    },
  },
  plugins: [],
}
