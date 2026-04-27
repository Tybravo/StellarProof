import type { Metadata, Viewport } from "next"; // <-- Added Viewport type
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { DebugPanel } from "@/components/dev/DebugPanel";
import "./globals.css";

import { WalletProvider } from "../context/WalletContext";
import { WizardProvider } from "../context/WizardContext";
import { ToastProvider } from "../context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import QueryProvider from "../context/QueryProvider";
 
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. STANDARD METADATA (Viewport and ThemeColor removed from here)
export const metadata: Metadata = {
  title: "StellarProof - The Truth Engine for Digital Content",
  description: "Verifiable digital authenticity powered by Soroban smart contracts. Cryptographically signed verification for digital content and media ecosystems.",
  keywords: "stellar, blockchain, verification, authenticity, soroban, smart contracts",
};

// 2. NEW VIEWPORT EXPORT
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#256af4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark" data-theme="dark">
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
                } catch(e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-darkblue-dark text-gray-900 dark:text-gray-100 transition-colors duration-300`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
       <ThemeProvider>
          <ToastProvider>
            <WalletProvider>
              <WizardProvider>
                <QueryProvider>
                  <AuthProvider>
                    {children}
                    <Footer />
                    <ScrollToTop />
                    <DebugPanel />
                  </AuthProvider>
                </QueryProvider>
              </WizardProvider>
            </WalletProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
