
export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';

// Simulating a Soroban RPC call
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const fetchOracleStatus = async (_requestId: string): Promise<VerificationStatus> => {  await new Promise((resolve) => setTimeout(resolve, 800));

  const random = Math.random();
  if (random > 0.8) return 'Verified';
  if (random > 0.6) return 'Rejected';
  
  if (random < 0.1) throw new Error("Mock RPC Connection Error");

  return 'Pending';
};