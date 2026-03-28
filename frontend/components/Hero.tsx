"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-darkblue-dark via-darkblue to-darkblue-dark pt-28 pb-20 px-4 sm:px-6 lg:px-8"
      aria-label="Hero"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-radial from-blue-500/20 via-purple-500/10 to-transparent blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-sm font-medium text-blue-300 uppercase tracking-wider">
              Built on Stellar, Powered by Soroban
            </span>
          </div>
        </motion.div>

        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 text-white" style={{ textShadow: '0 0 30px rgba(37, 106, 244, 0.3)' }}>
            The Truth Engine
          </h1>
          <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            <span className="text-blue-300 block sm:inline">for Digital Content and</span>
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Media Ecosystem
            </span>
          </p>
        </motion.div>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10"
        >
          Verifiable digital authenticity powered by Soroban smart contracts
          and trusted execution environments.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg hover:shadow-blue-500/50">
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-3 border-2 border-gray-500/50 hover:border-gray-300 text-gray-300 hover:text-white font-semibold rounded-lg transition-all duration-300 hover:bg-white/5">
            View Documentation
          </button>
        </motion.div>

        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center mb-20"
        >
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-pink-500/5 border border-pink-500/20">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-pink-300 uppercase tracking-wider">
                Trusted Execution
              </p>
              <p className="text-xs text-pink-200">Hardware-level security</p>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            {
              title: "Stellar Network",
              description: "Decentralized settlement layer with near-instant finality.",
              icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            },
            {
              title: "Soroban Contracts",
              description: "Next-gen WASM-based contracts for sophisticated logic.",
              icon: "M6 2h12a1 1 0 011 1v3h2a1 1 0 110 2h-.5v5.5a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 013 13.5V8H2.5a1 1 0 110-2h2V3a1 1 0 011-1zm1 2v9a.5.5 0 00.5.5h9a.5.5 0 00.5-.5V4H7z"
            },
            {
              title: "Immutable Proofs",
              description: "Cryptographically signed verification certificates.",
              icon: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
            }
          ].map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group p-6 rounded-2xl bg-gradient-to-br from-blue-900/40 to-purple-900/25 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/40 to-blue-400/30 flex items-center justify-center mb-4 group-hover:from-blue-500/60 group-hover:to-blue-400/50 transition-all">
                <svg className="w-6 h-6 text-blue-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d={card.icon} />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
