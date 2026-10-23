"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, MinusCircle, Loader2 } from "lucide-react";
import { useSignVoteTx } from "@/hooks/useSignVoteTx";
import { useToast } from "@/app/context/ToastContext";
import type { GovernanceProposal } from "@/services/governanceProposals";
import type { VoteChoice } from "@/services/governanceService";

interface VoteCardProps {
  proposal: GovernanceProposal;
}

const CHOICES: { value: VoteChoice; label: string; icon: typeof CheckCircle2 }[] = [
  { value: "for", label: "Vote For", icon: CheckCircle2 },
  { value: "against", label: "Vote Against", icon: XCircle },
  { value: "abstain", label: "Abstain", icon: MinusCircle },
];

export function VoteCard({ proposal }: VoteCardProps) {
  const { signVote, isSigning, error } = useSignVoteTx();
  const { addToast } = useToast();
  const [pendingChoice, setPendingChoice] = useState<VoteChoice | null>(null);
  const [submittedChoice, setSubmittedChoice] = useState<VoteChoice | null>(null);

  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const forPct = totalVotes ? Math.round((proposal.votesFor / totalVotes) * 100) : 0;

  const handleVote = async (choice: VoteChoice) => {
    setPendingChoice(choice);
    const result = await signVote(proposal.id, choice);
    setPendingChoice(null);

    if (result) {
      setSubmittedChoice(choice);
      addToast(`Vote submitted for "${proposal.title}".`, "success");
    } else {
      addToast(error ?? "Failed to sign and submit your vote.", "error");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{proposal.title}</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{proposal.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {proposal.status}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className="h-full bg-primary" style={{ width: `${forPct}%` }} />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {forPct}% in favor · {totalVotes.toLocaleString()} XLM weighted
      </p>

      {submittedChoice ? (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          Your vote ({submittedChoice}) was signed and submitted.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {CHOICES.map(({ value, label, icon: Icon }) => {
            const isPending = isSigning && pendingChoice === value;
            return (
              <button
                key={value}
                type="button"
                disabled={isSigning}
                onClick={() => handleVote(value)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-white/10 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                )}
                {label}
              </button>
            );
          })}
        </div>
      )}

      {error && !submittedChoice && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
