"use client";

// import { useTheme } from "@/app/context/ThemeContext";
import { useTheme } from "../app/context/ThemeContext";


// import { ThemeProvider } from './context/ThemeContext';
import { Github, Twitter, Send, DiscIcon } from "lucide-react";

function LogoIcon() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
      style={{
        background: "linear-gradient(135deg, #ff7ce9 0%, #60a5fa 100%)",
      }}
      aria-hidden
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
          fill="white"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="#012254"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default function Footer() {
  const { theme } = useTheme();

  // Define theme‑dependent classes
  const isDark = theme === "dark" || true; // Always use dark theme
  const bgGradient = "from-darkblue-dark via-darkblue to-darkblue-dark";
  const textPrimary = "text-white";
  const textSecondary = "text-gray-300";
  const borderColor = "border-blue-500/20";
  const iconBg = "bg-blue-500/20 hover:bg-blue-500/40";
  const iconColor = "text-blue-300";

  return (
    <footer
      className={`bg-gradient-to-b ${bgGradient} ${textSecondary} px-6 py-16 lg:px-16 transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <LogoIcon />
              <div className="flex gap-1">
                <span className="text-xl font-bold text-blue-400">Stellar</span>
                <span className="text-xl font-bold text-pink-400">Proof</span>
              </div>
            </div>
            <p
              className={`text-sm leading-relaxed mb-6 max-w-xs ${textSecondary}`}
            >
              The Truth Engine for Digital Content and Media Ecosystem.
              Verifiable digital authenticity powered by Soroban smart
              contracts.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              {[DiscIcon, Github, Twitter, Send].map((Icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center transition-colors`}
                  aria-label="Social"
                >
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </a>
              ))}
            </div>
          </div>

          {/* Column Headers & Links */}
          {[
            {
              title: "PLATFORM OVERVIEW",
              links: [
                "What is StellarProof",
                "How It Works",
                "Core Technology",
                "Smart Contracts",
                "Network Status",
              ],
            },
            {
              title: "SUPPORT CENTER",
              links: [
                "Documentation",
                "Troubleshooting",
                "API Reference",
                "Report an Issue",
                "Contact Us",
              ],
            },
            {
              title: "RESOURCES",
              links: [
                "Proof Registry",
                "Brand Assets",
                "Ecosystem Fund",
                "Developer Blog",
              ],
            },
            {
              title: "COMPLIANCE",
              links: [
                "Terms of Use",
                "Privacy Policy",
                "Legal Disclaimer",
                "Cookie Policy",
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h3
                className={`font-bold ${textPrimary} text-sm uppercase tracking-wider mb-6`}
              >
                {section.title}
              </h3>
              <nav className="space-y-3">
                {section.links.map((link) => {
                  const href =
                    link === "Report an Issue"
                      ? "/report-issue"
                      : link === "Contact Us"
                        ? "/contact"
                        : "#";
                  return (
                    <a
                      key={link}
                      href={href}
                      className={`text-sm ${textSecondary} hover:text-blue-300 transition-colors block`}
                    >
                      {link}
                    </a>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className={`border-t ${borderColor} pt-8`}>
          <p
            className="text-center text-sm text-gray-400"
          >
            © 2026 StellarProof, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
