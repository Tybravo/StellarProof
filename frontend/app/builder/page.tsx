'use client';

import React, { useState } from "react";
import Header from "../../components/Header";
import { ManifestPreview } from "../../components/manifest/ManifestPreview";

/**
 * MOCK DATA: Requirement - Use mock data in service layer during development.
 * This represents the "Key-Value builder state" mentioned in the issue.
 */
const MOCK_MANIFEST_DATA = {
  manifest_info: {
    version: "1.0.0",
    network: "testnet",
    timestamp: "2026-02-25T22:24:00.000Z",
  },
  proof_details: {
    issuer: "GD...EXAMPLE_ADDRESS",
    asset_code: "USDC",
    amount: "5000.00",
    verification_hash: "a1b2c3d4e5f6...",
  },
  metadata: {
    domain: "stellarproof.io",
    memo: "Quarterly Audit Proof"
  }
};

export default function BuilderPage() {
  // Maintaining data consistency - this state is what gets converted to JSON/XML
  const [manifestData] = useState(MOCK_MANIFEST_DATA);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans selection:bg-primary/30">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* LEFT SIDE: Inputs (Future implementation for form state) */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Manifest Builder
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure your Stellar proof manifest details here. Updates are reflected instantly in the preview.
            </p>
            {/* Form components would go here to update the 'manifestData' state */}
          </div>

          {/* RIGHT SIDE: The Live Preview with JSON/XML Toggle */}
          <div className="sticky top-24 h-fit">
            <ManifestPreview manifestData={manifestData} />
          </div>

        </div>
      </main>
    </div>
  );
}