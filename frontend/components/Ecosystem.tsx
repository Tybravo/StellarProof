'use client';

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import React from "react";

interface IntegrationItem {
  name: string;
  category: string;
  logo: React.ReactElement;
  description: string;
}

interface EcosystemProps {
  className?: string;
}

export default function Ecosystem({ className = "" }: EcosystemProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const integrations: IntegrationItem[] = [
    {
      name: "Stellar",
      category: "blockchain",
      description: "Fast, low-cost blockchain network",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.2" />
          <path d="M25 50 L50 25 L75 50 L50 75 Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "Ethereum",
      category: "blockchain",
      description: "Leading smart contract platform",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <polygon points="50,10 50,40 75,50 50,10" fill="currentColor" opacity="0.8" />
          <polygon points="50,10 25,50 50,40 50,10" fill="currentColor" opacity="0.6" />
          <polygon points="50,90 75,50 50,60 50,90" fill="currentColor" opacity="0.8" />
          <polygon points="50,90 50,60 25,50 50,90" fill="currentColor" opacity="0.6" />
        </svg>
      ),
    },
    {
      name: "Sui",
      category: "blockchain",
      description: "Next-generation smart contract platform",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="50" cy="50" r="20" fill="currentColor" opacity="0.7" />
          <circle cx="50" cy="50" r="8" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "Freighter",
      category: "wallet",
      description: "Stellar network wallet",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <rect x="20" y="30" width="60" height="40" rx="8" fill="currentColor" opacity="0.3" />
          <rect x="25" y="35" width="50" height="8" rx="4" fill="currentColor" />
          <rect x="25" y="48" width="35" height="6" rx="3" fill="currentColor" opacity="0.7" />
          <rect x="25" y="58" width="25" height="6" rx="3" fill="currentColor" opacity="0.5" />
        </svg>
      ),
    },
    {
      name: "Albedo",
      category: "wallet",
      description: "Web-based Stellar wallet",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="30" r="8" fill="currentColor" />
          <circle cx="35" cy="60" r="6" fill="currentColor" opacity="0.8" />
          <circle cx="65" cy="60" r="6" fill="currentColor" opacity="0.8" />
        </svg>
      ),
    },
    {
      name: "MetaMask",
      category: "wallet",
      description: "Ethereum wallet browser extension",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <path d="M30 20 C30 15, 35 10, 50 10 C65 10, 70 15, 70 20 L70 60 C70 70, 65 80, 50 80 C35 80, 30 70, 30 60 Z" fill="currentColor" opacity="0.3" />
          <circle cx="42" cy="35" r="4" fill="currentColor" />
          <circle cx="58" cy="35" r="4" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "IPFS",
      category: "storage",
      description: "Distributed file storage",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <circle cx="50" cy="25" r="8" fill="currentColor" />
          <circle cx="25" cy="60" r="8" fill="currentColor" opacity="0.8" />
          <circle cx="75" cy="60" r="8" fill="currentColor" opacity="0.8" />
          <path d="M42 32 L32 52" stroke="currentColor" strokeWidth="3" />
          <path d="M58 32 L68 52" stroke="currentColor" strokeWidth="3" />
          <path d="M33 60 L67 60" stroke="currentColor" strokeWidth="3" />
        </svg>
      ),
    },
    {
      name: "Walrus",
      category: "storage",
      description: "Decentralized blob storage",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <ellipse cx="50" cy="40" rx="30" ry="20" fill="currentColor" opacity="0.4" />
          <ellipse cx="50" cy="60" rx="25" ry="15" fill="currentColor" opacity="0.6" />
        </svg>
      ),
    },
    {
      name: "Cloudinary",
      category: "storage",
      description: "Media management platform",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <path d="M20 60 Q20 40, 35 35 Q40 25, 55 30 Q65 20, 80 35 Q85 45, 75 55 L25 55 Q20 55, 20 60" fill="currentColor" opacity="0.5" />
        </svg>
      ),
    },
  ];

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, IntegrationItem[]>);

  const categoryTitles = {
    blockchain: "Supported Chains",
    wallet: "Wallets",
    storage: "Storage Solutions",
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  if (!mounted) return null;

  return (
    <section id="ecosystem" className={`scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-7xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={containerVariants} className="text-center mb-16">
          <motion.h2 variants={itemVariants} className="text-3xl font-bold tracking-tight text-foreground dark:text-white sm:text-4xl lg:text-5xl">
            Works with the Tools You Love
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-4 max-w-2xl mx-auto text-lg text-foreground/80 dark:text-white/80">
            StellarProof integrates seamlessly with the Web3 ecosystem you already know and trust
          </motion.p>
        </motion.div>

        <div className="space-y-16">
          {Object.entries(groupedIntegrations).map(([category, items]) => (
            <motion.div key={category} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={containerVariants}>
              <motion.h3 variants={itemVariants} className="text-xl font-semibold text-foreground dark:text-white mb-8 text-center">
                {categoryTitles[category as keyof typeof categoryTitles]}
              </motion.h3>
              <div className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((integration) => (
                  <motion.div
                    key={integration.name}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    className="group relative flex flex-col items-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 transition-all hover:shadow-lg hover:shadow-primary/20"
                  >
                    <div className="mb-3 text-gray-600 dark:text-gray-300 group-hover:text-primary transition-all">
                      {integration.logo}
                    </div>
                    <h4 className="text-sm font-medium text-foreground dark:text-white">{integration.name}</h4>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}