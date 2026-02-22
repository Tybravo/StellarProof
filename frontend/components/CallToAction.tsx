// "use client";

// import { motion } from "framer-motion";
// import { ArrowRight, BookOpen, Rocket } from "lucide-react";

// export default function CallToAction() {
//   return (
//     <section className="relative py-24 overflow-hidden bg-slate-50 dark:bg-[#08090C] transition-colors duration-300 font-sans">
      
//       {/* --- Animated Background Orbs --- */}
//       {/* Primary Blue Orb */}
//       <motion.div
//         animate={{ 
//           y: [0, -30, 0],
//           x: [0, 20, 0],
//           scale: [1, 1.1, 1]
//         }}
//         transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
//         className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 dark:bg-primary/10 blur-[100px] rounded-full pointer-events-none"
//       />
//       {/* Secondary Pink Orb */}
//       <motion.div
//         animate={{ 
//           y: [0, 30, 0],
//           x: [0, -20, 0],
//           scale: [1, 1.2, 1]
//         }}
//         transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
//         className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 dark:bg-secondary/10 blur-[100px] rounded-full pointer-events-none"
//       />

//       <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
//         {/* --- Main CTA Card --- */}
//         <motion.div 
//           initial={{ opacity: 0, y: 40 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           viewport={{ once: true, margin: "-100px" }}
//           transition={{ duration: 0.6 }}
//           className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden bg-white dark:bg-[#13141C] border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-none text-center px-6 py-16 md:py-24"
//         >
//           {/* Subtle inner gradient for the card */}
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100/50 dark:to-white/5 pointer-events-none" />

//           {/* Badge */}
//           <motion.div 
//             initial={{ opacity: 0, scale: 0.9 }}
//             whileInView={{ opacity: 1, scale: 1 }}
//             viewport={{ once: true }}
//             transition={{ delay: 0.2 }}
//             className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 mb-8"
//           >
//             <Rocket className="w-4 h-4 text-primary" />
//             <span className="text-sm font-bold tracking-wide text-primary uppercase">
//               Ready to deploy?
//             </span>
//           </motion.div>

//           {/* Headline */}
//           <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
//             Build Trust Into <br className="hidden md:block" />
//             Your Applications. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">On-Chain.</span>
//           </h2>

//           {/* Subtext */}
//           <p className="text-lg md:text-xl text-gray-600 dark:text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
//             Join the ecosystem of creators and developers leveraging StellarProof to secure, verify, and immortalize digital assets with zero-trust architecture.
//           </p>

//           {/* Action Buttons */}
//           <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
//             <motion.button 
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-semibold shadow-button-glow hover:shadow-[0_0_25px_rgba(37,106,244,0.6)] transition-all duration-300"
//             >
//               Start Verifying
//               <ArrowRight className="w-5 h-5" />
//             </motion.button>
            
//             <motion.button 
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full border-2 border-secondary text-secondary font-semibold hover:bg-secondary/10 dark:hover:bg-secondary/20 transition-all duration-300"
//             >
//               <BookOpen className="w-5 h-5" />
//               View Documentation
//             </motion.button>
//           </div>
          
//         </motion.div>
//       </div>
//     </section>
//   );
// }