"use client";

import { motion } from "framer-motion";
import { ArrowRight, Network, ScanLine, ShieldCheck, Lock } from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Stellar Network",
    description: "Decentralized settlement layer with near-instant finality.",
  },
  {
    icon: ScanLine,
    title: "Soroban Contracts",
    description: "Next-gen WASM-based contracts for sophisticated logic.",
  },
  {
    icon: ShieldCheck,
    title: "Immutable Proofs",
    description: "Cryptographically signed verification certificates.",
  },
];

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Dark radial gradient background */}
      {/* <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1f2e_0%,_#0B1120_80%)]" /> */}
      {/* <div className="absolute inset-0 bg-gradient-to-r from-[#256AF4] via-[##60A5FA] to-[#FF7CE9_30%]" /> */}
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,_#eef2ff_20%,_#ffffff_60%)] dark:bg-[radial-gradient(ellipse_at_70%_30%,_#1e2a3a_20%,_#0a0f1a_50%)]" />
      {/* Glow effects (optional, enhances the gradient) */}
      <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/15 dark:bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 w-[500px] h-[500px] bg-purple-500/15 dark:bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Soft overlay to improve text contrast */}
      <div className="absolute inset-0 bg-black/0 dark:bg-black/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-6 pt-24 pb-20 md:pt-32 md:pb-28 mx-auto max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-full px-5 py-2 mb-10 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-[#FF7CE9]" />
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-[#FF7CE9]">
              Built on Stellar, Powered by Soroban
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1 variants={itemVariants} className="text-center max-w-4xl">
            <span className="block text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
              The Truth Engine
            </span>
            <span className="block text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-[1.1] mt-2">
              for Digital Content and
            </span>
            <span className="block text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-[1.1]">
              Media Ecosystem
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="mt-8 text-center max-w-xl text-gray-600 dark:text-white/70 text-base md:text-lg leading-relaxed"
          >
            Verifiable digital authenticity powered by Soroban smart contracts
            and trusted execution environments.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          >
            <button className="group flex items-center gap-2 px-8 py-3.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all duration-200">
              Get Started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="px-8 py-3.5 rounded-lg border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white font-semibold text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200">
              View Documentation
            </button>
          </motion.div>

          {/* Trust Badge */}
          <motion.div
            variants={itemVariants}
            className="mt-14 bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-xl px-6 py-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#FF7CE9]" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#FF7CE9]">
                Trusted Execution
              </p>
              <p className="text-xs text-gray-600 dark:text-white/60">Hardware-Level Security</p>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            variants={itemVariants}
            className="mt-20 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:border-blue-400/30 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-400/20 flex items-center justify-center mb-5 group-hover:bg-blue-600/30 transition-colors">
                  <feature.icon
                    className="w-6 h-6 text-blue-400"
                    style={{
                      color:
                        feature.title === "Soroban Contracts"
                          ? "#FF7CE9"
                          : undefined,
                    }}
                  />
                </div>
                <h3 className="text-gray-900 dark:text-white font-semibold text-base mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-white/60 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
