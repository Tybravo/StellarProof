/**
 * Registry Transparency Service
 * Provides mock data for trusted TEE hashes and authorized oracle providers.
 * Replace fetch calls with real API endpoints when backend is ready.
 *
 * @module services/registry
 * @see Issue #87 – Registry Transparency Page
 */

export interface TeeHash {
  id: string;
  hash: string;
  label: string;
  version: string;
  addedAt: string;
}

export interface OracleProvider {
  id: string;
  address: string;
  name: string;
  network: "Mainnet" | "Testnet";
  addedAt: string;
}

export interface RegistryData {
  teeHashes: TeeHash[];
  oracleProviders: OracleProvider[];
  lastUpdated: string;
}

const MOCK_TEE_HASHES: TeeHash[] = [
  {
    id: "tee-1",
    hash: "a3f8b2c14d9e6f0a1b5c7d3e8f2a4b6c9d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8",
    label: "StellarProof TEE v1.0.0",
    version: "1.0.0",
    addedAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "tee-2",
    hash: "b4e9c3d25e0f7a1b2c6d8e4f9a3b5c7d0e2f4a6b8c1d3e5f7a9b0c2d4e6f8a0",
    label: "StellarProof TEE v1.1.0",
    version: "1.1.0",
    addedAt: "2024-02-20T14:15:00Z",
  },
  {
    id: "tee-3",
    hash: "c5f0d4e36f1a2b3c7e9f5a0b4c6d8e0f1a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0",
    label: "StellarProof TEE v1.2.0",
    version: "1.2.0",
    addedAt: "2024-03-10T09:00:00Z",
  },
  {
    id: "tee-4",
    hash: "d6a1e5f47a2b3c4d8f0a6b1c5d7e9f1a2b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1",
    label: "StellarProof TEE v1.3.0",
    version: "1.3.0",
    addedAt: "2024-04-05T11:45:00Z",
  },
  {
    id: "tee-5",
    hash: "e7b2f6a58b3c4d5e9a1b7c2d6e8f0a2b3c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2",
    label: "StellarProof TEE v2.0.0",
    version: "2.0.0",
    addedAt: "2024-05-18T16:20:00Z",
  },
  {
    id: "tee-6",
    hash: "f8c3a7b69c4d5e6f0b2c8d3e7f9a1b3c4d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3",
    label: "StellarProof TEE v2.1.0",
    version: "2.1.0",
    addedAt: "2024-06-22T08:30:00Z",
  },
  {
    id: "tee-7",
    hash: "09d4b8c7ad5e6f7a1c3d9e4f8a0b2c4d5e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4",
    label: "StellarProof TEE v2.2.0",
    version: "2.2.0",
    addedAt: "2024-07-30T13:10:00Z",
  },
  {
    id: "tee-8",
    hash: "10e5c9d8be6f7a8b2d4e0f5a9b1c3d5e6f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5",
    label: "StellarProof TEE v2.3.0",
    version: "2.3.0",
    addedAt: "2024-09-12T15:50:00Z",
  },
];

const MOCK_ORACLE_PROVIDERS: OracleProvider[] = [
  {
    id: "oracle-1",
    address: "GCAABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRSSTTUU0123456789ABCD",
    name: "StellarOracle Prime",
    network: "Mainnet",
    addedAt: "2024-01-20T09:00:00Z",
  },
  {
    id: "oracle-2",
    address: "GBBBCCDDEEFFFGGHHIIJJKKLLMMNNOOPPQQRRSSTTUU1122334455BCDE",
    name: "Proof Oracle Alpha",
    network: "Mainnet",
    addedAt: "2024-02-14T11:30:00Z",
  },
  {
    id: "oracle-3",
    address: "GCCCDDEEEFFGGHHHIIJJKKLLMMNNOOPPQQRRSSTTUU2233445566CDEF",
    name: "Testnet Oracle Beta",
    network: "Testnet",
    addedAt: "2024-03-05T14:20:00Z",
  },
  {
    id: "oracle-4",
    address: "GDDDEEFFFGGHHHIIIJJKKLLMMNNOOPPQQRRSSTTUU3344556677DEFG",
    name: "Veritas Oracle Node",
    network: "Mainnet",
    addedAt: "2024-04-18T10:00:00Z",
  },
  {
    id: "oracle-5",
    address: "GEEEFFFGGHHIIIIJJKKLLMMNNOOPPQQRRSSTTUU4455667788EFGH",
    name: "Quorum Oracle",
    network: "Testnet",
    addedAt: "2024-05-28T16:45:00Z",
  },
  {
    id: "oracle-6",
    address: "GFFF0001GGHHHIIIJJKKLLMMNNOOPPQQRRSSTTUU5566778899FGHI",
    name: "Anchor Oracle Network",
    network: "Mainnet",
    addedAt: "2024-07-11T07:30:00Z",
  },
];

function simulateDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const registryService = {
  async getRegistry(): Promise<RegistryData> {
    await simulateDelay();
    return {
      teeHashes: MOCK_TEE_HASHES,
      oracleProviders: MOCK_ORACLE_PROVIDERS,
      lastUpdated: new Date().toISOString(),
    };
  },
};
