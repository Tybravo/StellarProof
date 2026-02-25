import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import "./globals.css";
import { WalletProvider } from "../context/WalletContext";
import { ThemeProvider } from "./context/ThemeContext";

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
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('stellarproof-theme');
                  if (!stored) {
                    stored = 'dark';
                    localStorage.setItem('stellarproof-theme', stored);
                  }
                  var isDark = stored !== 'light';
                  document.documentElement.classList.toggle('dark', isDark);
                  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-darkblue text-gray-900 dark:text-gray-100 transition-colors duration-300`}
      >
        <ThemeProvider>
          <WalletProvider>
            {children}
            <Footer />
            <ScrollToTop />
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
