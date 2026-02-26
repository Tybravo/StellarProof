"use client";

import { motion } from "framer-motion";
import { 
  FileText, 
  Newspaper, 
  Cpu, 
  Image as ImageIcon, 
  ShieldCheck, 
  ArrowRight 
} from "lucide-react";
import React from "react";

export interface Template {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  defaultData: Record<string, string>;
}

export const TEMPLATES: Template[] = [
  {
    id: "journalism",
    title: "Journalism Authenticity",
    description: "Verify the origin and integrity of press releases, news footage, and source documentation.",
    icon: Newspaper,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    defaultData: {
      source: "Authenticated Source",
      location: "Global",
      rights: "Open Access",
      integrity: "Verified"
    }
  },
  {
    id: "ai-verification",
    title: "AI Media Verification",
    description: "Certify that media is human-generated or clearly label AI-assisted content with model metadata.",
    icon: Cpu,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    defaultData: {
      model: "Human Generated",
      version: "1.0",
      attestation: "Hardware-Signed",
      processing: "None"
    }
  },
  {
    id: "nft-provenance",
    title: "NFT & Digital Assets",
    description: "Link digital collectibles to verifiable off-chain assets with immutable provenance chains.",
    icon: ImageIcon,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    defaultData: {
      asset_id: "ST-001",
      creator_id: "Creator-A",
      chain: "Stellar",
      metadata_hash: "Pending"
    }
  },
  {
    id: "legal-audit",
    title: "Legal Audit Trails",
    description: "Create tamper-proof records for legal documents, compliance reports, and digital signatures.",
    icon: FileText,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    defaultData: {
      case_id: "LC-X",
      department: "Legal",
      jurisdiction: "International",
      timestamp: new Date().toISOString()
    }
  }
];

interface UseCasesProps {
  onSelect: (template: Template) => void;
}

export default function UseCases({ onSelect }: UseCasesProps) {
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

  return (
    <section id="use-cases" className="py-24 bg-gray-50 dark:bg-[#020617] relative overflow-hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6"
          >
            Universal <span className="text-secondary">Use Cases</span>
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400"
          >
            Empowering trust across every industry with verifiable digital truth.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {TEMPLATES.map((template) => (
            <motion.div
              key={template.id}
              variants={itemVariants}
              className="group relative flex flex-col items-center p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 dark:hover:shadow-primary/10"
            >
              <div 
                className={`w-16 h-16 rounded-xl ${template.bgColor} border ${template.borderColor} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110`}
              >
                <template.icon className={`w-8 h-8 ${template.color}`} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                {template.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm text-center mb-8 flex-grow">
                {template.description}
              </p>

              <button
                onClick={() => onSelect(template)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary font-semibold text-sm hover:bg-primary hover:text-white transition-all duration-200"
              >
                Generate Manifest
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Enterprise Note */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={itemVariants}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-secondary/5 dark:bg-secondary/10 border border-secondary/20">
            <ShieldCheck className="w-4 h-4 text-secondary mr-2" />
            <span className="text-sm font-medium text-secondary">
              Custom enterprise templates available on request
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
