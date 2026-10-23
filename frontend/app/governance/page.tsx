"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { VoteCard } from "@/components/governance/VoteCard";
import { governanceProposalsService, type GovernanceProposal } from "@/services/governanceProposals";

export default function GovernancePage() {
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    governanceProposalsService
      .getProposals()
      .then((result) => {
        if (!cancelled) setProposals(result);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load governance proposals.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans">
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Governance
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            Cast an XLM-weighted vote on active proposals, signed with your Freighter wallet.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-4">
          {loading
            ? Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl" />
              ))
            : proposals.map((proposal) => <VoteCard key={proposal.id} proposal={proposal} />)}

          {!loading && proposals.length === 0 && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No active governance proposals right now.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
