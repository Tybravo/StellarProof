"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import { useWizard } from "@/context/WizardContext"; // 1. Import the Wizard Context
import ExportActions from "@/components/certificate/ExportActions";

interface StatusStepProps {
  requestId: string;
  onReset: () => void;
}

export default function StatusStep({ requestId, onReset }: StatusStepProps) {
  // 2. Access the wizard state
  const { state } = useWizard();
  
  const { status, isLoading, lastChecked } = useVerificationStatus({ 
    requestId, 
    intervalMs: 5000 
  });

  // Determine which hash to show in the certificate (SPV vs Standard)
  const finalHash = state.spvResult?.encryptedHash || state.contentHash || "N/A";

  // Particles animation logic...
  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      // eslint-disable-next-line react-hooks/purity
      x: Math.random() * 100,
      // eslint-disable-next-line react-hooks/purity
      angle: Math.random() * 360,
      // eslint-disable-next-line react-hooks/purity
      size: Math.random() * 8 + 4,
      // eslint-disable-next-line react-hooks/purity
      color: Math.random() > 0.5 ? "#256af4" : "#10b981",
    }));
  }, []);

  if (isLoading && status === 'Pending') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Verifying on Stellar...</h2>
        <p className="text-gray-500 dark:text-gray-400">
          The Soroban Oracle is currently processing your request.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden py-8 text-center">
      {/* Particles Animation */}
      {status === 'Verified' && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ y: -20, x: `${p.x}vw`, opacity: 1 }}
              animate={{
                y: "100vh",
                // eslint-disable-next-line react-hooks/purity
                x: `${p.x + (Math.random() - 0.5) * 30}vw`,
                opacity: [1, 1, 0],
                rotate: p.angle,
              }}
              transition={{ duration: 2.5, ease: "circOut" }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size,
                // eslint-disable-next-line react-hooks/purity
                borderRadius: Math.random() > 0.5 ? "50%" : 2,
                backgroundColor: p.color,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10">
        {status === 'Verified' ? (
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        ) : (
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
        )}

        <h2 className="text-3xl font-bold mb-4">
          Verification {status === 'Verified' ? 'Successful' : 'Failed'}
        </h2>
        
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
          {status === 'Verified' 
            ? "Your content has been cryptographically signed and anchored to the Stellar network."
            : "The oracle could not verify the authenticity of this content."}
        </p>

        {/* 3. Export Certificate Section */}
        {status === 'Verified' && (
          <div className="mb-8 max-w-md mx-auto transform transition-all hover:scale-[1.01]">
            <ExportActions 
              certificateData={{
                id: requestId,
                contentHash: finalHash,
                txHash: requestId,
                timestamp: new Date().toISOString()
              }} 
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={onReset}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
          >
            New Request <ArrowRight className="ml-2 w-4 h-4" />
          </button>
          <a 
            href={`https://stellar.expert/explorer/testnet/tx/${requestId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            View Explorer <ExternalLink className="ml-2 w-4 h-4" />
          </a>
        </div>

        {lastChecked && (
          <p className="mt-8 text-xs text-gray-400">
            Last synced with network: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}