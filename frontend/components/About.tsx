"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Layers, Cpu, Database } from "lucide-react";

export default function About() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut",
            },
        },
    };

    return (
        <section id="about" className="relative w-full overflow-hidden bg-darkblue py-24 sm:py-32">
            {/* Background glow effects */}
            <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <motion.p
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={itemVariants}
                        className="text-secondary font-semibold tracking-wider text-sm uppercase mb-4"
                    >
                        Core Technology
                    </motion.p>
                    <motion.h2
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={itemVariants}
                        className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6"
                    >
                        The Future of <span className="text-secondary">Digital</span> <br className="hidden sm:block" />
                        <span className="text-secondary">Authenticity</span>
                    </motion.h2>
                    <motion.p
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={itemVariants}
                        className="max-w-3xl mx-auto text-lg text-white/70"
                    >
                        Stellar Proof combines cutting-edge hardware security with decentralized ledgers to
                        provide an unshakeable foundation for the world's most sensitive data.
                    </motion.p>
                </div>

                {/* Grid of glass cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20"
                >
                    {/* Card 1 */}
                    <motion.div
                        variants={itemVariants}
                        className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-glow"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-secondary border border-secondary/20 group-hover:bg-primary/20 transition-colors">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Digital Authenticity</h3>
                        <p className="text-white/70 leading-relaxed">
                            In an age of deepfakes and AI-generated misinformation, the ability to prove data origin
                            is critical. Our protocol creates a permanent, verifiable link between hardware-secured
                            computation and the on-chain record.
                        </p>
                    </motion.div>

                    {/* Card 2 */}
                    <motion.div
                        variants={itemVariants}
                        className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-button-glow"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <Layers className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Stellar & Soroban</h3>
                        <p className="text-white/70 leading-relaxed">
                            Built on the high-performance Stellar network. We utilize Soroban smart contracts to
                            handle complex cryptographic proofs with sub-second finality and near-zero transaction
                            costs.
                        </p>
                    </motion.div>

                    {/* Card 3 */}
                    <motion.div
                        variants={itemVariants}
                        className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-button-glow-secondary"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-6 text-secondary border border-secondary/20 group-hover:bg-secondary/20 transition-colors">
                            <Cpu className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">TEE Verification</h3>
                        <p className="text-white/70 leading-relaxed">
                            Trusted Execution Environments (TEEs) provide a secure enclave for sensitive
                            computations. Our architecture ensures that off-chain data processing is tamper-proof
                            and cryptographically signed.
                        </p>
                    </motion.div>

                    {/* Card 4 */}
                    <motion.div
                        variants={itemVariants}
                        className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-header"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Decentralized Storage</h3>
                        <p className="text-white/70 leading-relaxed">
                            A hybrid storage layer leveraging IPFS for content-addressed immutability and a
                            high-speed metadata layer. This ensures your data is always accessible, permanent, and
                            cryptographically linked.
                        </p>
                    </motion.div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20 text-center"
                >
                    <motion.div variants={itemVariants}>
                        <p className="text-4xl sm:text-5xl font-extrabold text-white mb-2">10M+</p>
                        <p className="text-secondary text-xs sm:text-sm font-semibold tracking-widest uppercase">
                            Proofs Generated
                        </p>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <p className="text-4xl sm:text-5xl font-extrabold text-white mb-2">&lt;1.2s</p>
                        <p className="text-secondary text-xs sm:text-sm font-semibold tracking-widest uppercase">
                            Avg. Verification
                        </p>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <p className="text-4xl sm:text-5xl font-extrabold text-white mb-2">500+</p>
                        <p className="text-secondary text-xs sm:text-sm font-semibold tracking-widest uppercase">
                            Active Nodes
                        </p>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <p className="text-4xl sm:text-5xl font-extrabold text-white mb-2">99.9%</p>
                        <p className="text-secondary text-xs sm:text-sm font-semibold tracking-widest uppercase">
                            Network Uptime
                        </p>
                    </motion.div>
                </motion.div>

                {/* CTA */}
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="max-w-4xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
                >
                    <p className="text-lg text-white font-medium text-center sm:text-left">
                        Ready to secure your digital footprint?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button className="px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:bg-secondary-light transition-colors hover:shadow-button-glow-secondary w-full sm:w-auto cursor-pointer">
                            Get Started
                        </button>
                        <button className="px-6 py-3 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/10 w-full sm:w-auto cursor-pointer">
                            Read Documentation
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
