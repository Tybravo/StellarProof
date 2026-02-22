
import { Github, Twitter, Send,  DiscIcon } from 'lucide-react';

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
  return (
    <footer className="bg-gradient-to-b from-blue-900 to-slate-900 text-slate-300 px-6 py-16 lg:px-16">
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
            <p className="text-sm leading-relaxed mb-6 max-w-xs">
              The Truth Engine for Digital Content and Media Ecosystem. Verifiable digital authenticity powered by Soroban smart contracts.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 flex items-center justify-center transition-colors"
                aria-label="Discord"
              >
                <DiscIcon className="w-5 h-5 text-blue-400" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 flex items-center justify-center transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5 text-blue-400" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-blue-400" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 flex items-center justify-center transition-colors"
                aria-label="Website"
              >
                <Send className="w-5 h-5 text-blue-400" />
              </a>
            </div>
          </div>

          {/* PLATFORM OVERVIEW */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">
              Platform<br />Overview
            </h3>
            <nav className="flex flex-col space-y-3">
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                What is StellarProof
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                How It Works
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Core Technology
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Smart Contracts
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Network Status
              </a>
            </nav>
          </div>

          {/* SUPPORT CENTER */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">
              Support Center
            </h3>
            <nav className="flex flex-col space-y-3">
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Documentation
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Troubleshooting
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                API Reference
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Report an Issue
              </a>
            </nav>
          </div>

          {/* RESOURCES */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">
              Resources
            </h3>
            <nav className="flex flex-col space-y-3">
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Proof Registry
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Brand Assets
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Ecosystem Fund
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Developer Blog
              </a>
            </nav>
          </div>

          {/* COMPLIANCE */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">
              Compliance
            </h3>
            <nav className="flex flex-col space-y-3">
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Terms of Use
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Legal Disclaimer
              </a>
              <a href="#" className="block text-sm hover:text-blue-300 transition-colors">
                Cookie Policy
              </a>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/50 pt-8">
          <p className="text-center text-sm text-slate-500">
            © 2026 StellarProof, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

