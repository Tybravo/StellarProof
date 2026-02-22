"use client";

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

/**
 * Ecosystem integrations section showing supported chains, wallets, and storage solutions.
 * Features hover effects, marquee animation, and light/dark mode compatibility.
 */
export default function Ecosystem({ className = "" }: EcosystemProps) {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Prevent hydration mismatch and detect theme
  useEffect(() => {
    setMounted(true);
    
    // Check for dark mode using various methods
    const checkDarkMode = () => {
      // Method 1: Check HTML class (most common)
      if (document.documentElement.classList.contains('dark')) {
        return true;
      }
      
      // Method 2: Check data attribute
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        return true;
      }
      
      // Method 3: Check CSS variables or computed styles
      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = computedStyle.getPropertyValue('--background') || computedStyle.backgroundColor;
      
      // Method 4: Fallback to system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
      }
      
      return false;
    };

    setIsDarkMode(checkDarkMode());

    // Observer to watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(checkDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setIsDarkMode(checkDarkMode());
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const integrations: IntegrationItem[] = [
    // Supported Chains
    {
      name: "Stellar",
      category: "blockchain",
      description: "Fast, low-cost blockchain network",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.2" />
          <path
            d="M25 50 L50 25 L75 50 L50 75 Z"
            fill="currentColor"
            className="transition-all duration-300"
          />
        </svg>
      ),
    },
    {
      name: "Ethereum",
      category: "blockchain",
      description: "Leading smart contract platform",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <polygon
            points="50,10 50,40 75,50 50,10"
            fill="currentColor"
            opacity="0.8"
          />
          <polygon
            points="50,10 25,50 50,40 50,10"
            fill="currentColor"
            opacity="0.6"
          />
          <polygon
            points="50,90 75,50 50,60 50,90"
            fill="currentColor"
            opacity="0.8"
          />
          <polygon
            points="50,90 50,60 25,50 50,90"
            fill="currentColor"
            opacity="0.6"
          />
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
    // Wallets
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
          <path
            d="M30 20 C30 15, 35 10, 50 10 C65 10, 70 15, 70 20 L70 60 C70 70, 65 80, 50 80 C35 80, 30 70, 30 60 Z"
            fill="currentColor"
            opacity="0.3"
          />
          <circle cx="42" cy="35" r="4" fill="currentColor" />
          <circle cx="58" cy="35" r="4" fill="currentColor" />
          <path d="M35 55 Q50 65, 65 55" stroke="currentColor" strokeWidth="3" fill="none" />
        </svg>
      ),
    },
    // Storage Solutions
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
          <circle cx="40" cy="35" r="3" fill="currentColor" />
          <circle cx="60" cy="35" r="3" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "Cloudinary",
      category: "storage",
      description: "Media management platform",
      logo: (
        <svg viewBox="0 0 100 100" className="w-12 h-12">
          <path
            d="M20 60 Q20 40, 35 35 Q40 25, 55 30 Q65 20, 80 35 Q85 45, 75 55 L25 55 Q20 55, 20 60"
            fill="currentColor"
            opacity="0.5"
          />
          <circle cx="35" cy="70" r="4" fill="currentColor" opacity="0.7" />
          <circle cx="50" cy="75" r="3" fill="currentColor" opacity="0.8" />
          <circle cx="65" cy="70" r="4" fill="currentColor" opacity="0.7" />
        </svg>
      ),
    },
  ];

  // Group integrations by category
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const marqueeVariants = {
    animate: {
      x: [0, -1200],
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop",
          duration: 30,
          ease: "linear",
        },
      },
    },
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <section
      id="ecosystem"
      className={`scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8 ${className}`}
      aria-label="Ecosystem Integrations"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-bold tracking-tight text-foreground dark:text-white sm:text-4xl lg:text-5xl"
          >
            Works with the Tools You Love
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-4 max-w-2xl mx-auto text-lg text-foreground/80 dark:text-white/80"
          >
            StellarProof integrates seamlessly with the Web3 ecosystem you already know and trust
          </motion.p>
        </motion.div>

        {/* Integration Categories */}
        <div className="space-y-16">
          {Object.entries(groupedIntegrations).map(([category, items]) => (
            <motion.div
              key={category}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={containerVariants}
            >
              <motion.h3
                variants={itemVariants}
                className="text-xl font-semibold text-foreground dark:text-white mb-8 text-center"
              >
                {categoryTitles[category as keyof typeof categoryTitles]}
              </motion.h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
                {items.map((integration, index) => (
                  <motion.div
                    key={integration.name}
                    variants={itemVariants}
                    whileHover={{ 
                      scale: 1.05,
                      transition: { duration: 0.2 }
                    }}
                    className="group relative flex flex-col items-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/10"
                  >
                    {/* Logo */}
                    <div className="mb-3 text-gray-600 dark:text-gray-300 group-hover:text-primary transition-all duration-300 transform group-hover:scale-110">
                      {integration.logo}
                    </div>
                    
                    {/* Name */}
                    <h4 className="text-sm font-medium text-foreground dark:text-white text-center">
                      {integration.name}
                    </h4>
                    
                    {/* Description - appears on hover */}
                    <p className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-10">
                      {integration.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Marquee Section */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="mt-20 overflow-hidden"
        >
          <motion.h3
            variants={itemVariants}
            className="text-lg font-medium text-foreground/60 dark:text-white/60 mb-8 text-center"
          >
            Trusted by developers worldwide
          </motion.h3>
          
          <div className="relative">
            <motion.div
              variants={marqueeVariants}
              animate="animate"
              className="flex space-x-16"
            >
              {/* Double the integrations for seamless loop */}
              {[...integrations, ...integrations].map((integration, index) => (
                <div
                  key={`${integration.name}-${index}`}
                  className="flex-shrink-0 flex items-center space-x-3 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors duration-300"
                >
                  <div className="w-8 h-8 opacity-60">
                    {integration.logo}
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {integration.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Enterprise API Mention */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="mt-16 text-center"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center px-6 py-3 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20"
          >
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-primary">
              Enterprise API compatible with existing infrastructure
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}