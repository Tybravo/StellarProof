'use client';

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { 
  UploadCloud, 
  Database, 
  ShieldCheck, 
  Award, 
  Zap, 
  Lock, 
  Cpu 
} from "lucide-react";

const STEPS = [
  {
    id: "01",
    title: "Ingest",
    description: "Upload media files with full original metadata preservation.",
    tag: "METADATA ATTACHMENT",
    img: "/about-imgs/ingest.png",
    accent: "from-blue-500 to-indigo-600",
    dotColor: "bg-pink-500"
  },
  {
    id: "02",
    title: "Storage",
    description: "Encrypted fragmentation across decentralized IPFS nodes.",
    tag: "DECENTRALIZED IPFS",
    img: "/about-imgs/stor.jpg",
    accent: "from-purple-500 to-blue-500",
    dotColor: "bg-blue-400"
  },
  {
    id: "03",
    title: "TEE Verify",
    description: "Hardware-isolated verification in confidential compute environments.",
    tag: "CONFIDENTIAL COMPUTE",
    img: "/about-imgs/the_landscape.jpeg",
    accent: "from-cyan-400 to-blue-500",
    dotColor: "bg-pink-500"
  },
  {
    id: "04",
    title: "Certify",
    description: "Final cryptographic proof minted on the Stellar blockchain.",
    tag: "ON-CHAIN PROVENANCE",
    img: "/about-imgs/certify.png",
    accent: "from-pink-500 to-rose-600",
    dotColor: "bg-white"
  }
];

export default function HowItWorks() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <section id="how-it-works" className="bg-white dark:bg-[#020617] text-gray-900 dark:text-white py-32 px-4 relative transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        
       {/* Figma Header Style */}
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center"
          >
            <div className="px-4 py-1.5 rounded-full border border-pink-500/20 bg-pink-500/5 dark:bg-pink-500/10 backdrop-blur-sm shadow-[0_0_15px_rgba(236,72,153,0.1)]">
              <span className="text-[10px] font-mono text-pink-600 dark:text-pink-400 font-bold tracking-[0.4em] uppercase text-center block leading-none">
                Protocol Workflow
              </span>
            </div>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-8 text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight text-gray-900 dark:text-white"
          >
            Securing Truth in a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-400">
              Digital-First World
            </span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 max-w-2xl mx-auto text-gray-500 dark:text-gray-400 text-lg leading-relaxed"
          >
            Our multi-stage cryptographic pipeline ensures that every piece of media is verified, secured, and immortalized with provable integrity.
          </motion.p>
        </div>

        {/* The Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {STEPS.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group relative flex flex-col h-full"
            >
              {/* Image Container: Resolves black box issue */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 mb-6 transition-all duration-500 group-hover:border-purple-500/50 group-hover:shadow-2xl dark:group-hover:shadow-purple-500/20">
                <Image 
                  src={step.img} 
                  alt={step.title}
                  fill
                  className={`object-cover transition-transform duration-700 group-hover:scale-110 ${step.title === 'Certify' ? 'p-12 object-contain' : 'opacity-90 dark:opacity-70 group-hover:opacity-100'}`}
                />
              </div>

              {/* Text Content */}
              <div className="flex items-start gap-4 mb-4">
                 <div className="mt-1 p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-purple-600 dark:text-purple-400">
                    {idx === 0 && <UploadCloud className="w-5 h-5" />}
                    {idx === 1 && <Database className="w-5 h-5" />}
                    {idx === 2 && <ShieldCheck className="w-5 h-5" />}
                    {idx === 3 && <Award className="w-5 h-5" />}
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                      {step.description}
                    </p>
                 </div>
              </div>
              
              {/* Bottom Accent Bar */}
              <div className={`mt-auto h-[3px] w-full bg-gradient-to-r ${step.accent} rounded-full opacity-20 group-hover:opacity-100 transition-opacity`} />
            </motion.div>
          ))}
        </div>

        {/* Brightened Legend Section */}
        <div className="hidden lg:block">
          <div className="relative h-px w-full bg-gray-200 dark:bg-white/10 mb-12">
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: '100%' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_#a855f7]"
            />
          </div>
          <div className="grid grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.tag} className="flex flex-col items-center">
                <div className="flex flex-col items-center gap-1 mb-6">
                   <span className="text-[9px] font-mono text-pink-500 font-bold tracking-[0.3em]">STEP</span>
                   <span className="text-lg font-bold font-mono text-gray-900 dark:text-white">{step.id}</span>
                </div>
                <div className={`w-3 h-3 rounded-full ${step.dotColor} shadow-[0_0_15px_rgba(168,85,247,0.6)] z-10 mb-6`} />
                <span className="font-mono text-[10px] text-gray-700 dark:text-gray-200 font-medium tracking-[0.2em] uppercase text-center max-w-[130px] leading-relaxed">
                  {step.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-6xl mx-auto">
           <Highlight icon={<Zap />} title="Ultra-Fast Processing" desc="Verification results delivered in seconds via our optimized global node network." />
           <Highlight icon={<Lock />} title="Zero-Trust Security" desc="No single entity holds control over your media or its verification logic." />
           <Highlight icon={<Cpu />} title="API-First Design" desc="Easy integration for platforms, marketplaces, and hardware manufacturers." />
        </div>
      </div>
    </section>
  );
}

function Highlight({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-5 p-8 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all">
      <div className="text-purple-600 dark:text-purple-400 w-6 h-6 shrink-0">{icon}</div>
      <div>
        <h4 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}