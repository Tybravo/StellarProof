"use client";

import { motion } from "framer-motion";
import { Upload, Database, Shield, CheckCircle2, Zap, Lock, Code } from "lucide-react";
import Image from "next/image";

const steps = [
  {
    id: 1,
    title: "Ingest",
    desc: "Upload media files with original metadata.",
    icon: Upload,
    label: "METADATA ATTACHMENT",
    glowColor: "shadow-pink-500/50",
    imageSrc: "/about-imgs/ingest.png",
  },
  {
    id: 2,
    title: "Storage",
    desc: "Files are fragmented and distributed via IPFS.",
    icon: Database,
    label: "DECENTRALIZED IPFS",
    glowColor: "shadow-blue-500/50",
    imageSrc: "/about-imgs/storage.png", 
  },
  {
    id: 3,
    title: "TEE Verify",
    desc: "Trusted Execution Environments process data off-chain.",
    icon: Shield,
    label: "CONFIDENTIAL COMPUTE",
    glowColor: "shadow-pink-500/50",
    imageSrc: "/about-imgs/the_landscape.jpeg", 
  },
  {
    id: 4,
    title: "Certify",
    desc: "A cryptographic certificate is minted on the Stellar blockchain.",
    icon: CheckCircle2,
    label: "ON-CHAIN PROVENANCE",
    glowColor: "shadow-blue-500/50",
    imageSrc: "/about-imgs/certify.png", 
  },
];

// Data for the 3 bottom feature cards
const bottomFeatures = [
  {
    title: "Ultra-Fast Processing",
    desc: "Verification results returned in seconds via our optimized global node network.",
    icon: Zap,
  },
  {
    title: "Zero-Trust Security",
    desc: "No single entity holds control over your media in the verification layer.",
    icon: Lock,
  },
  {
    title: "API-First Design",
    desc: "Easy integration for platforms, marketplaces, and hardware manufacturers.",
    icon: Code,
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-24 bg-gray-50 dark:bg-[#08090C] transition-colors duration-300 overflow-hidden font-sans">
      
      {/* Background ambient glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* --- Header Section --- */}
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="px-4 py-1.5 border border-secondary/30 rounded-full bg-secondary/10 mb-6"
          >
            <span className="text-xs font-bold tracking-wider text-secondary uppercase">
              Protocol Workflow
            </span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight transition-colors duration-300"
          >
            Securing Truth in a <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary via-purple-400 to-secondary">
              Digital-First World
            </span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 dark:text-white/60 max-w-2xl mx-auto text-base md:text-lg leading-relaxed transition-colors duration-300"
          >
            Our multi-stage cryptographic pipeline ensures that every piece of media is 
            verified, secured, and immortalized with provable integrity.
          </motion.p>
        </div>

        {/* --- 4-Step Media Cards Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-white dark:bg-[#13141C] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col hover:border-secondary/30 transition-all duration-300 group shadow-sm dark:shadow-none"
            >
              {/* --- Image Placeholder Div --- */}
              <div className="w-full aspect-[4/3] relative overflow-hidden bg-gray-200 dark:bg-[#0A0B0F]">
                <Image
                  src={step.imageSrc}
                  alt={step.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
                {/* Gradient overlay adapts to light/dark mode */}
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#13141C] via-transparent to-transparent opacity-80 transition-colors duration-300" />
              </div>
              
              <div className="p-6 flex flex-col flex-grow relative">
                <div className={`absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r ${index % 2 === 0 ? 'from-secondary/50 to-purple-500/50' : 'from-primary/50 to-cyan-500/50'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <step.icon className={`w-6 h-6 mb-4 ${index % 2 === 0 ? 'text-secondary' : 'text-primary'}`} />
                <h3 className="text-gray-900 dark:text-white font-bold text-xl mb-2 transition-colors duration-300">{step.title}</h3>
                <p className="text-gray-600 dark:text-white/50 text-sm leading-relaxed transition-colors duration-300">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* --- Detached Timeline Tracker (Hidden on small mobile) --- */}
        <div className="hidden md:block relative w-full max-w-5xl mx-auto mb-24 px-4">
          {/* Base inactive line */}
          <div className="absolute top-[28px] left-0 w-full h-[2px] bg-gray-300 dark:bg-white/10 transition-colors duration-300" />
          
          {/* Animated active glowing line */}
          <motion.div 
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute top-[28px] left-0 w-full h-[2px] bg-gradient-to-r from-secondary via-purple-500 to-primary origin-left blur-[1px]" 
          />

          <div className="relative flex justify-between">
            {steps.map((step, index) => (
              <motion.div 
                key={`timeline-${step.id}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 + (index * 0.15) }}
                className="flex flex-col items-center w-1/4 relative"
              >
                {/* Step Number Indicator */}
                <span className={`text-xs font-bold tracking-widest mb-6 ${index % 2 === 0 ? 'text-secondary' : 'text-primary'}`}>
                  STEP 0{step.id}
                </span>
                
                {/* Glowing Dot Node */}
                <div className={`w-4 h-4 rounded-full ${index % 2 === 0 ? 'bg-secondary' : 'bg-primary'} shadow-[0_0_20px_currentColor] ${step.glowColor} z-10 mb-6 relative`}>
                  <div className="absolute inset-1 bg-white rounded-full" />
                </div>
                
                {/* Bottom Label */}
                <span className="text-gray-500 dark:text-white/40 text-[10px] md:text-xs uppercase tracking-wider text-center font-bold px-2 transition-colors duration-300">
                  {step.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* --- Bottom Feature Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {bottomFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + (index * 0.1) }}
              className="bg-white dark:bg-[#13141C] border border-gray-200 dark:border-white/5 rounded-2xl p-6 flex items-start gap-5 hover:bg-gray-50 dark:hover:bg-[#1A1B26] hover:border-gray-300 dark:hover:border-white/10 transition-all duration-300 shadow-sm dark:shadow-none"
            >
              <div className="bg-gray-100 dark:bg-white/5 p-3.5 rounded-xl shrink-0 transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-gray-700 dark:text-white/70 transition-colors duration-300" />
              </div>
              <div>
                <h4 className="text-gray-900 dark:text-white font-bold text-base mb-2 transition-colors duration-300">{feature.title}</h4>
                <p className="text-gray-600 dark:text-white/50 text-sm leading-relaxed transition-colors duration-300">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}