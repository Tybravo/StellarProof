export interface SpvOutput {
  verified: boolean;
  contentHashHex: string;
  manifestHashHex: string;
  signatureHex: string;
  spvId: string;
  providerPublicKeyHex?: string;
}

export interface AttestationEvent {
  eventId: string;
  requestId: string;
  transactionHash: string;
  ledger: number;
  providerHex?: string;
  teeHashHex?: string;
  signatureHex?: string;
  raw: Record<string, unknown>;
}
