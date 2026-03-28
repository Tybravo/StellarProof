"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const navItems = [
  { label: "Home", id: "home" },
  { label: "About", id: "about" },
  { label: "Ecosystem", id: "ecosystem" },
  { label: "Instances", id: "instances" },
  { label: "Pricing", id: "pricing" },
];

export default function Navigation() {
  return (
    <section className="hidden xl:block fixed left-0 top-20 h-screen w-64 bg-gradient-to-b from-darkblue-dark/80 to-darkblue/60 backdrop-blur-sm border-r border-blue-500/10 z-40 pt-12">
      <nav className="p-8">
        <ul className="space-y-2">
          {navItems.map((item, index) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <a
                href={`#${item.id}`}
                className="group flex items-center justify-between px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-blue-500/15 transition-all duration-300"
              >
                <span className="font-medium">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-300 group-hover:translate-x-1 transition-all" />
              </a>
            </motion.li>
          ))}
        </ul>

        {/* Accent line */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "2px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 bg-gradient-to-r from-blue-500 to-pink-500"
        />
      </nav>
    </section>
  );
}
