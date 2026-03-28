"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

interface SectionProps {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
}

export function Section({ id, title, subtitle, description }: SectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-16 relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-darkblue via-darkblue-dark to-darkblue border-t border-blue-500/10"
      aria-label={title}
    >
      <div className="mx-auto max-w-4xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center"
        >
          <motion.div variants={itemVariants}>
            <h2 className="text-4xl sm:text-5xl font-bold mb-2 text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xl text-blue-400 font-semibold mb-4">
                {subtitle}
              </p>
            )}
          </motion.div>
          <motion.p
            variants={itemVariants}
            className="mt-4 text-lg text-gray-300 leading-relaxed"
          >
            {description}
          </motion.p>
        </motion.div>

        {/* Decorative line */}
        <motion.div
          variants={itemVariants}
          className="mt-10 mx-auto w-16 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
        />
      </div>
    </section>
  );
}

export default function Sections() {
  const sections: SectionProps[] = [
    {
      id: "about",
      title: "About StellarProof",
      subtitle: "Revolutionizing Digital Authenticity",
      description:
        "StellarProof is a decentralized platform that leverages Stellar's high-speed settlement layer and Soroban smart contracts to provide cryptographic proof of digital content authenticity. Built for creators, developers, and enterprises who demand verifiable truth in a digital-first world.",
    },
    {
      id: "ecosystem",
      title: "The Ecosystem",
      subtitle: "Multiple Entry Points",
      description:
        "Our ecosystem is designed to serve three distinct communities: content creators seeking to prove ownership, developers integrating verification into their applications, and enterprises managing digital assets at scale. Each path is optimized for its unique needs while maintaining interoperability across the network.",
    },
    {
      id: "instances",
      title: "Instances & Assets",
      subtitle: "Flexible Deployment Options",
      description:
        "Deploy StellarProof instances tailored to your specific use case. From media verification to supply chain authentication, our modular architecture allows you to create and manage multiple instances, each with customized rules and verification protocols.",
    },
    {
      id: "pricing",
      title: "Transparent Pricing",
      subtitle: "Scale at Your Pace",
      description:
        "Whether you're starting small or operating at enterprise scale, our flexible pricing models accommodate your growth. Pay only for what you use, with no hidden fees. Access to the full StellarProof ecosystem is available at every tier.",
    },
  ];

  return (
    <>
      {sections.map((section) => (
        <Section key={section.id} {...section} />
      ))}
    </>
  );
}
