import { Schema, model, type Document } from "mongoose";

export interface IContractSimulation extends Document {
  transactionHash: string;
  networkPassphrase: string;
  contractCalls: Array<{ contractId: string; functionName: string }>;
  transactionFee: string;
  minimumRequiredFee: string;
  minResourceFee: string;
  authorizationRequired: boolean;
  authEntriesXdr: string[];
  cpuInstructions: string;
  readBytes: string;
  writeBytes: string;
  returnValueXdr: string;
  simulationLedger: number;
  eventCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ContractSimulationSchema = new Schema<IContractSimulation>(
  {
    transactionHash: { type: String, required: true, index: true },
    networkPassphrase: { type: String, required: true },
    contractCalls: {
      type: [{
        contractId: { type: String, required: true },
        functionName: { type: String, required: true },
      }],
      required: true,
    },
    transactionFee: { type: String, required: true },
    minimumRequiredFee: { type: String, required: true },
    minResourceFee: { type: String, required: true },
    authorizationRequired: { type: Boolean, required: true },
    authEntriesXdr: { type: [String], required: true },
    cpuInstructions: { type: String, required: true },
    readBytes: { type: String, required: true },
    writeBytes: { type: String, required: true },
    returnValueXdr: { type: String, required: true },
    simulationLedger: { type: Number, required: true },
    eventCount: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);

export default model<IContractSimulation>("ContractSimulation", ContractSimulationSchema);