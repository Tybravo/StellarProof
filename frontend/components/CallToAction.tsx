"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Rocket } from "lucide-react";
import Link from "next/link"; 

export default function CallToAction() {
  return (
    <section 
      id="cta"
      className="relative w-full max-w-full overflow-hidden py-24 bg-gray-50 dark:bg-[#050507] transition-colors duration-300 font-sans border-t border-gray-200 dark:border-white/5"
    >

      <motion.div
        animate={{ y: [0, -30, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-primary/20 dark:bg-primary/10 blur-[100px] rounded-full pointer-events-none"
      />
      
      <motion.div
        animate={{ y: [0, 30, 0], x: [0, -20, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-secondary/20 dark:bg-secondary/10 blur-[100px] rounded-full pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden bg-white dark:bg-[#0D0E15] border border-gray-200 dark:border-white/5 shadow-xl dark:shadow-none text-center px-6 py-16 transition-colors duration-300"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold tracking-wide text-primary uppercase">
              Ready to deploy?
            </span>
          </div>

          {/* Headline */}
          <h2 className="mx-auto max-w-3xl text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
            Build Trust Into Your Applications.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              On-Chain.
            </span>
          </h2>

          {/* Subtext */}
          <p className="text-base md:text-lg text-gray-600 dark:text-white/80 mb-10 max-w-2xl mx-auto">
            Join the ecosystem of creators and developers leveraging StellarProof to secure, verify, and immortalize digital assets with zero-trust architecture.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            
        
            <Link 
              href="/register" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary text-white font-semibold hover:bg-blue-600 transition-colors shadow-button-glow"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <Link 
              href="/docs" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-secondary text-secondary font-semibold hover:bg-secondary/10 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              View Docs
            </Link>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
