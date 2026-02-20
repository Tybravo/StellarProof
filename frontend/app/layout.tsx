import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext"; // ✅ ADDED

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StellarProof",
  description: "The Truth Engine for the Stellar Ecosystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ✅ suppressHydrationWarning: prevents React warning caused by the
    //    inline script adding the 'dark' class before hydration
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          ✅ FOUC Prevention Script — must be the FIRST thing in <head>.
          Runs before React hydrates so the correct theme class is applied
          instantly on page load, eliminating any flash of incorrect theme.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('stellarproof-theme');
                  if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    // No saved preference — fall back to OS setting
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-darkblue text-gray-900 dark:text-gray-100 transition-colors duration-300`}
      >
        {/* ✅ ThemeProvider wraps all children so useTheme() works anywhere in the app */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}