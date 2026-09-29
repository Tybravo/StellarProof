/**
 * Integration test: attestation + mint flow with mocked RPC.
 *
 * Covers issue #725.
 *
 * Real MongoDB:  mongodb-memory-server (no external cluster required)
 * RPC boundary:  soroban deps are injected mocks (no live Stellar RPC)
 * SPV boundary:  spvVerifier.verify is a jest.fn() (no IPFS gateway)
 * Pattern:       Controller -> Service -> Model
 *                (VerificationWorker -> verificationService /
 *                verificationRequestEventService -> Mongoose)
 */

// ─── Env mock ───────────────────────────────────────────────────────────────
jest.mock('../../config/env', () => ({
  __esModule: true,
  env: {
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    STELLAR_RPC_URL: 'https://rpc.invalid',
    STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    STELLAR_TX_POLL_INTERVAL_MS: 500,
    STELLAR_TX_CONFIRMATION_TIMEOUT_MS: 120_000,
    STELLAR_TX_MAX_CONSECUTIVE_RPC_ERRORS: 3,
    PINATA_GATEWAY_URL: 'https://gateway.invalid/ipfs',
    SPV_FETCH_TIMEOUT_MS: 30_000,
    SPV_MAX_MEDIA_BYTES: 10_000_000,
    SPV_MAX_MANIFEST_BYTES: 1_000_000,
    STELLAR_RPC_TIMEOUT_MS: 30_000,
    VERIFICATION_WORKER_POLL_INTERVAL_MS: 5_000,
    VERIFICATION_WORKER_BATCH_SIZE: 10,
    VERIFICATION_WORKER_MAX_ATTEMPTS: 3,
    VERIFICATION_WORKER_RETRY_BASE_MS: 1_000,
    VERIFICATION_WORKER_LEASE_MS: 360_000,
    STELLAR_ORACLE_SECRET_KEY: '',
    STELLAR_PROVENANCE_CONTRACT_ID: '',
    ORACLE_CODE_MEASUREMENT_HASH: '',
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ─── Imports ────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Keypair, StrKey, xdr } from '@stellar/stellar-sdk';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { VerificationWorker } from '../../jobs/verificationWorker';
import type { VerificationWorkerDeps } from '../../jobs/verificationWorker';
import { verificationService } from '../verification.service';
import { verificationRequestEventService } from '../verificationRequestEvent.service';
import { attestationService } from '../attestation.service';
import { VerificationJobModel } from '../../models/verificationJob.model';
import { VerificationRequestEventModel } from '../../models/verificationRequestEvent.model';
import { VerificationStatus } from '../../types/verification.types';
import { VerificationRequestEventStatus } from '../../types/verificationRequestEvent.types';
import {
  TransactionFailedError,
  TransactionSimulationError,
} from '../../errors/SorobanTransactionError';

// ─── Helpers ────────────────────────────────────────────────────────────────
const hex32 = (): string => crypto.randomBytes(32).toString('hex');

const MEDIA_CID   = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
const MANIFEST_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

function confirmedResult(txHash: string, certId = 42) {
  return {
    status: 'SUCCESS' as const,
    txHash,
    ledger: 100,
    createdAt: Math.floor(Date.now() / 1000),
    returnValue: xdr.ScVal.scvU64(new xdr.Uint64(BigInt(certId))),
  };
}

/** Resolves once the given mock has been called at least once. */
function waitForCall(mock: jest.Mock, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(
      () => reject(new Error('waitForCall timed out')),
      timeoutMs
    );
    const orig = mock.getMockImplementation();
    mock.mockImplementation(function (...args: unknown[]) {
      clearTimeout(deadline);
      mock.mockImplementation(orig ?? undefined);
      return (orig ? orig(...args) : Promise.resolve(undefined)) as ReturnType<jest.Mock>;
    });
  });
}

// ─── MongoDB lifecycle ───────────────────────────────────────────────────────
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([
    VerificationJobModel.syncIndexes(),
    VerificationRequestEventModel.syncIndexes(),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await Promise.all([
    VerificationJobModel.deleteMany({}),
    VerificationRequestEventModel.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

// ─── Worker factory ──────────────────────────────────────────────────────────
function buildWorker(overrides: {
  buildMintTransaction?: jest.Mock;
  submitTransaction?: jest.Mock;
  getTransactionWithConfirmation?: jest.Mock;
  verify?: jest.Mock;
} = {}) {
  const oracle = {
    keypair: Keypair.random(),
    provenanceContractId: StrKey.encodeContract(crypto.randomBytes(32)),
    codeMeasurementHash: hex32(),
  };

  const contentHash = hex32();
  const manifestHash = hex32();
  const mintTxHash = hex32();

  const soroban = {
    buildMintTransaction: overrides.buildMintTransaction ??
      jest.fn().mockResolvedValue({ hash: mintTxHash, xdr: 'AAAA', transaction: {} as never }),
    submitTransaction: overrides.submitTransaction ??
      jest.fn().mockResolvedValue(undefined),
    getTransactionWithConfirmation: overrides.getTransactionWithConfirmation ??
      jest.fn().mockImplementation((hash: string) => Promise.resolve(confirmedResult(hash))),
  };

  const verifier = {
    verify: overrides.verify ??
      jest.fn().mockResolvedValue({ verified: true, contentHash, manifestHash }),
  };

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const deps: VerificationWorkerDeps = {
    events: verificationRequestEventService,
    jobs: verificationService,
    attestations: attestationService,
    soroban,
    verifier,
    oracle,
    config: {
      pollIntervalMs: 5_000,
      batchSize: 10,
      maxAttempts: 3,
      retryBaseMs: 1_000,
      leaseMs: 360_000,
    },
    logger,
    workerId: `test-worker-${crypto.randomBytes(4).toString('hex')}`,
    now: () => new Date(),
  };

  return {
    worker: new VerificationWorker(deps),
    soroban,
    verifier,
    logger,
    oracle,
    mintTxHash,
    contentHash,
    manifestHash,
  };
}

async function seedEvent(overrides: Partial<{
  eventId: string;
  mediaCid: string;
  manifestCid: string;
  requester: string;
  nextAttemptAt: Date;
}> = {}) {
  return VerificationRequestEventModel.create({
    eventId: overrides.eventId ?? `evt-${crypto.randomBytes(6).toString('hex')}`,
    mediaCid: overrides.mediaCid ?? MEDIA_CID,
    manifestCid: overrides.manifestCid ?? MANIFEST_CID,
    requester: overrides.requester ?? Keypair.random().publicKey(),
    status: VerificationRequestEventStatus.PENDING,
    attempts: 0,
    nextAttemptAt: overrides.nextAttemptAt ?? new Date(Date.now() - 1_000),
  });
}

jest.setTimeout(60_000);

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('attestation + mint flow — happy path', () => {
  /**
   * The finality gate test verifies that:
   * 1. The tx hash is persisted to the event BEFORE submitTransaction is called.
   * 2. The job transitions to MINTING only AFTER submission is recorded.
   * 3. The job/event only reach COMPLETED after getTransactionWithConfirmation resolves.
   *
   * We use submitTransaction as a synchronisation point (we can wait for it to
   * be called, then poll the DB), which avoids fragile setImmediate timing.
   */
  it('completes the job and event only after on-chain finality is confirmed', async () => {
    const event = await seedEvent();
    const { worker, soroban, mintTxHash } = buildWorker();

    // Gate finality behind a manually released promise.
    let releaseFinality!: () => void;
    const finalityGate = new Promise<void>((resolve) => { releaseFinality = resolve; });

    soroban.getTransactionWithConfirmation.mockImplementation(
      async (hash: string) => {
        await finalityGate;
        return confirmedResult(hash);
      }
    );

    // Track when submitTransaction is called so we can check mid-flight DB state.
    let submitCalled!: () => void;
    const submitSignal = new Promise<void>((resolve) => { submitCalled = resolve; });

    const origSubmit = soroban.submitTransaction.getMockImplementation();
    soroban.submitTransaction.mockImplementation(async (...args: unknown[]) => {
      const result = origSubmit ? await (origSubmit as (...a: unknown[]) => Promise<void>)(...args) : undefined;
      submitCalled();
      return result;
    });

    // Start the cycle; it will block inside getTransactionWithConfirmation.
    const cyclePromise = worker.runCycle();

    // Wait for submitTransaction to be called — at this point the tx hash has
    // been recorded to the DB and the job is transitioning to MINTING.
    await submitSignal;

    // Poll until the job reaches MINTING (the state write is async post-submit).
    let jobMidway = null;
    for (let i = 0; i < 20 && (!jobMidway || jobMidway.status !== VerificationStatus.MINTING); i++) {
      await new Promise((r) => setTimeout(r, 50));
      jobMidway = await VerificationJobModel.findOne({}).lean();
    }

    expect(jobMidway).not.toBeNull();
    expect(jobMidway!.status).toBe(VerificationStatus.MINTING);
    expect(jobMidway!.stellarTransactionHash).toBe(mintTxHash);

    const eventMidway = await VerificationRequestEventModel.findById(event._id).lean();
    expect(eventMidway!.transactionHash).toBe(mintTxHash);
    expect(eventMidway!.status).not.toBe(VerificationRequestEventStatus.COMPLETED);

    // Release finality and wait for the cycle to finish.
    releaseFinality();
    await cyclePromise;

    const jobFinal = await VerificationJobModel.findOne({}).lean();
    expect(jobFinal!.status).toBe(VerificationStatus.COMPLETED);

    const eventFinal = await VerificationRequestEventModel.findById(event._id).lean();
    expect(eventFinal!.status).toBe(VerificationRequestEventStatus.COMPLETED);
    expect(eventFinal!.transactionHash).toBe(mintTxHash);
    expect(eventFinal!.certificateId).toBe('42');
    expect(eventFinal!.completedAt).toBeInstanceOf(Date);
  });

  it('persists the full job state machine transitions in order', async () => {
    await seedEvent();
    const { worker } = buildWorker();

    await worker.runCycle();

    const job = await VerificationJobModel.findOne({}).lean();
    expect(job).not.toBeNull();

    // All TEE attestation fields must be populated
    expect(job!.teeAttestationHash).toMatch(/^[0-9a-f]{64}$/);
    expect(job!.teeSignature).toMatch(/^[0-9a-f]+$/);
    expect(job!.codeMeasurementHash).toMatch(/^[0-9a-f]{64}$/);

    // Transaction hash must be persisted on the job
    expect(job!.stellarTransactionHash).toMatch(/^[0-9a-f]{64}$/);

    // Terminal state
    expect(job!.status).toBe(VerificationStatus.COMPLETED);
  });

  it('records the verified content and manifest hashes on the event', async () => {
    const event = await seedEvent();
    const { worker, contentHash, manifestHash } = buildWorker();

    await worker.runCycle();

    const eventDoc = await VerificationRequestEventModel.findById(event._id).lean();
    expect(eventDoc!.contentHash).toBe(contentHash);
    expect(eventDoc!.manifestHash).toBe(manifestHash);
  });

  it('processes multiple events in a single cycle, completing each independently', async () => {
    const [e1, e2] = await Promise.all([seedEvent(), seedEvent()]);
    const { worker } = buildWorker();

    const processed = await worker.runCycle();

    expect(processed).toBe(2);

    const jobs = await VerificationJobModel.find({}).lean();
    expect(jobs).toHaveLength(2);
    expect(jobs.every((j) => j.status === VerificationStatus.COMPLETED)).toBe(true);

    const events = await VerificationRequestEventModel.find({
      _id: { $in: [e1._id, e2._id] },
    }).lean();
    expect(events.every((e) => e.status === VerificationRequestEventStatus.COMPLETED)).toBe(true);
  });
});

describe('attestation + mint flow — failure path', () => {
  it('marks the job and event FAILED when the on-chain mint transaction fails', async () => {
    const event = await seedEvent();
    const mintTxHash = hex32();

    const { worker, soroban } = buildWorker({
      buildMintTransaction: jest.fn().mockResolvedValue({
        hash: mintTxHash,
        xdr: 'AAAA',
        transaction: {} as never,
      }),
      getTransactionWithConfirmation: jest.fn().mockRejectedValue(
        new TransactionFailedError({
          txHash: mintTxHash,
          resultCode: 'invoke_host_function_trapped',
          operationResultCodes: ['invoke_host_function_trapped'],
          diagnosticEventsXdr: [],
          ledger: 50,
        })
      ),
    });

    await worker.runCycle();

    const job = await VerificationJobModel.findOne({}).lean();
    expect(job).not.toBeNull();
    expect(job!.status).toBe(VerificationStatus.FAILED);
    expect(job!.errorMessage).toContain('invoke_host_function_trapped');

    const eventDoc = await VerificationRequestEventModel.findById(event._id).lean();
    expect(eventDoc!.status).toBe(VerificationRequestEventStatus.FAILED);
    expect(eventDoc!.lastError).toContain('invoke_host_function_trapped');

    // No certificate produced
    expect(eventDoc!.certificateId).toBeUndefined();
    expect(eventDoc!.completedAt).toBeUndefined();
  });

  it('marks the job FAILED and does not mint when SPV verification rejects', async () => {
    const event = await seedEvent();
    const { worker, soroban } = buildWorker({
      verify: jest.fn().mockResolvedValue({
        verified: false,
        contentHash: hex32(),
        manifestHash: hex32(),
        reason: 'Media SHA-256 does not match the manifest contentHash',
      }),
    });

    await worker.runCycle();

    const job = await VerificationJobModel.findOne({}).lean();
    expect(job!.status).toBe(VerificationStatus.FAILED);
    expect(job!.errorMessage).toContain('SPV verification failed');

    expect(soroban.buildMintTransaction).not.toHaveBeenCalled();
    expect(soroban.submitTransaction).not.toHaveBeenCalled();

    const eventDoc = await VerificationRequestEventModel.findById(event._id).lean();
    expect(eventDoc!.status).toBe(VerificationRequestEventStatus.FAILED);
  });

  it('marks the job FAILED without retry when simulation rejects the mint', async () => {
    const event = await seedEvent();
    const { worker } = buildWorker({
      buildMintTransaction: jest.fn().mockRejectedValue(
        new TransactionSimulationError('Soroban simulation failed: certificate already exists')
      ),
    });

    await worker.runCycle();

    const job = await VerificationJobModel.findOne({}).lean();
    expect(job!.status).toBe(VerificationStatus.FAILED);

    const eventDoc = await VerificationRequestEventModel.findById(event._id).lean();
    expect(eventDoc!.status).toBe(VerificationRequestEventStatus.FAILED);
  });

  it('clears the recorded tx hash when the RPC rejects the submission pre-ledger', async () => {
    const event = await seedEvent();
    const mintTxHash = hex32();

    const { worker } = buildWorker({
      buildMintTransaction: jest.fn().mockResolvedValue({
        hash: mintTxHash,
        xdr: 'AAAA',
        transaction: {} as never,
      }),
      submitTransaction: jest.fn().mockRejectedValue(
        new TransactionFailedError({
          txHash: mintTxHash,
          resultCode: 'tx_bad_seq',
          operationResultCodes: [],
          diagnosticEventsXdr: [],
        })
      ),
    });

    await worker.runCycle();

    // tx_bad_seq is retryable — event should be rescheduled, not failed
    const eventDoc = await VerificationRequestEventModel.findById(event._id).lean();
    expect(eventDoc!.status).toBe(VerificationRequestEventStatus.PENDING);
    expect(eventDoc!.transactionHash).toBeUndefined();

    // Job stays in TEE_VERIFYING so the next attempt can rebuild the mint
    const job = await VerificationJobModel.findOne({}).lean();
    expect(job!.status).toBe(VerificationStatus.TEE_VERIFYING);
  });
});

describe('attestation + mint flow — idempotency and recovery', () => {
  it('does not re-mint when the event is reclaimed after a crash mid-minting', async () => {
    const txHash = hex32();
    const requester = Keypair.random().publicKey();

    const job = await VerificationJobModel.create({
      ownerPublicKey: requester,
      contentHash: hex32(),
      status: VerificationStatus.MINTING,
      teeAttestationHash: hex32(),
      teeSignature: hex32(),
      codeMeasurementHash: hex32(),
      stellarTransactionHash: txHash,
    });

    const eventDoc = await VerificationRequestEventModel.create({
      eventId: `evt-recovery-${crypto.randomBytes(6).toString('hex')}`,
      mediaCid: MEDIA_CID,
      manifestCid: MANIFEST_CID,
      requester,
      status: VerificationRequestEventStatus.PENDING,
      attempts: 1,
      nextAttemptAt: new Date(Date.now() - 1_000),
      verificationJobId: job._id,
      transactionHash: txHash,
      contentHash: hex32(),
      manifestHash: hex32(),
    });

    const { worker, soroban, verifier } = buildWorker();

    await worker.runCycle();

    // SPV and RPC build must NOT be called — we resume from MINTING
    expect(verifier.verify).not.toHaveBeenCalled();
    expect(soroban.buildMintTransaction).not.toHaveBeenCalled();

    // Confirmation must have been called with the existing tx hash
    expect(soroban.getTransactionWithConfirmation).toHaveBeenCalledWith(txHash);

    const finalJob = await VerificationJobModel.findById(job._id).lean();
    expect(finalJob!.status).toBe(VerificationStatus.COMPLETED);

    const finalEvent = await VerificationRequestEventModel.findById(eventDoc._id).lean();
    expect(finalEvent!.status).toBe(VerificationRequestEventStatus.COMPLETED);
  });

  it('does not process an already-completed job again', async () => {
    const txHash = hex32();
    const requester = Keypair.random().publicKey();

    const job = await VerificationJobModel.create({
      ownerPublicKey: requester,
      contentHash: hex32(),
      status: VerificationStatus.COMPLETED,
      teeAttestationHash: hex32(),
      teeSignature: hex32(),
      codeMeasurementHash: hex32(),
      stellarTransactionHash: txHash,
    });

    await VerificationRequestEventModel.create({
      eventId: `evt-dup-${crypto.randomBytes(6).toString('hex')}`,
      mediaCid: MEDIA_CID,
      manifestCid: MANIFEST_CID,
      requester,
      status: VerificationRequestEventStatus.PENDING,
      attempts: 1,
      nextAttemptAt: new Date(Date.now() - 1_000),
      verificationJobId: job._id,
      transactionHash: txHash,
    });

    const { worker, soroban, verifier } = buildWorker();

    await worker.runCycle();

    expect(verifier.verify).not.toHaveBeenCalled();
    expect(soroban.buildMintTransaction).not.toHaveBeenCalled();
    expect(soroban.submitTransaction).not.toHaveBeenCalled();
    expect(soroban.getTransactionWithConfirmation).not.toHaveBeenCalled();
  });
});
