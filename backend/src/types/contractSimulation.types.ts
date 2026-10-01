export interface SimulateContractCallRequest {
  transactionXdr: string;
}

export interface SimulatedContractCall {
  contractId: string;
  functionName: string;
}

export interface ContractSimulationResult {
  id: string;
  transactionHash: string;
  networkPassphrase: string;
  contractCalls: SimulatedContractCall[];
  transactionFee: string;
  minResourceFee: string;
  minimumRequiredFee: string;
  authorizationRequired: boolean;
  authEntriesXdr: string[];
  cost: {
    cpuInstructions: string;
    readBytes: string;
    writeBytes: string;
  };
  returnValueXdr: string;
  simulationLedger: number;
  eventCount: number;
  createdAt: string;
}