export type ProposalStatus = "active" | "passed" | "rejected";

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  endsAt: string;
}

function simulateDelay(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_PROPOSALS: GovernanceProposal[] = [
  {
    id: "GOV-001",
    title: "Increase minimum Oracle collateral to 5,000 XLM",
    description:
      "Raises the minimum XLM collateral required for Oracle node operators to reduce the risk of undercollateralized nodes.",
    status: "active",
    votesFor: 184200,
    votesAgainst: 42100,
    votesAbstain: 3800,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "GOV-002",
    title: "Add futurenet support to the registry",
    description:
      "Enables Oracle providers to register and be discovered on the futurenet, in addition to mainnet and testnet.",
    status: "active",
    votesFor: 96500,
    votesAgainst: 15200,
    votesAbstain: 2100,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
];

/**
 * Fetches governance proposals open for voting. Backed by mock data until a
 * backend / indexer endpoint for the governance contract is available.
 */
export const governanceProposalsService = {
  async getProposals(): Promise<GovernanceProposal[]> {
    await simulateDelay();
    return MOCK_PROPOSALS;
  },

  async getProposal(id: string): Promise<GovernanceProposal | null> {
    await simulateDelay();
    return MOCK_PROPOSALS.find((proposal) => proposal.id === id) ?? null;
  },
};
