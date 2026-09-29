import mongoose from "mongoose";
import { VerificationStatus } from "../../types/verification.types";
import { verificationService } from "../../services/verification.service";
import { VerificationJobModel } from "../../models/verificationJob.model";

jest.mock("../../models/verificationJob.model");

jest.mock("../../services/statusStream.service", () => ({
  statusStreamService: {
    subscribe: jest.fn(),
    sendStatus: jest.fn(),
    broadcast: jest.fn(),
    getSubscriberCount: jest.fn().mockReturnValue(0),
    hasSubscribers: jest.fn().mockReturnValue(false),
    disconnectAll: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const StatusStreamService = require("../../services/statusStream.service").statusStreamService;
const Model = VerificationJobModel as unknown as {
  findById: jest.Mock;
  create: jest.Mock;
};

const JOB_ID = new mongoose.Types.ObjectId().toHexString();

function makeJob(overrides: Partial<Record<keyof import("../../types/verification.types").IVerificationJob, unknown>> = {}): import("../../types/verification.types").IVerificationJob {
  return {
    _id: JOB_ID,
    ownerPublicKey: "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJ",
    contentHash: "a".repeat(64),
    status: VerificationStatus.PENDING,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
    toObject: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(undefined),
  } as import("../../types/verification.types").IVerificationJob;
}

describe("statusStreamService — unit", () => {
  let mockRes: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      setHeader: jest.fn().mockReturnThis(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      on: jest.fn(),
      end: jest.fn(),
    } as unknown as Response;
    StatusStreamService.getSubscriberCount.mockReturnValue(0);
    StatusStreamService.hasSubscribers.mockReturnValue(false);
  });

  afterEach(async () => {
    await StatusStreamService.disconnectAll();
  });

  describe("subscribe", () => {
    it("registers a subscriber for a job", () => {
      StatusStreamService.subscribe(JOB_ID, mockRes);
      StatusStreamService.getSubscriberCount.mockReturnValue(1);
      expect(StatusStreamService.getSubscriberCount(JOB_ID)).toBe(1);
    });

    it("registers close and error handlers on the response", () => {
      StatusStreamService.subscribe(JOB_ID, mockRes);
      expect(StatusStreamService.subscribe).toHaveBeenCalledWith(JOB_ID, expect.anything());
    });
  });

  describe("sendStatus", () => {
    it("writes a status event to the response", () => {
      const job = makeJob();
      StatusStreamService.sendStatus(mockRes, job);

      expect(StatusStreamService.sendStatus).toHaveBeenCalledTimes(1);
      const callArgs = StatusStreamService.sendStatus.mock.calls[0];
      expect(callArgs[1].status).toBe(VerificationStatus.PENDING);
      expect(callArgs[1].ownerPublicKey).toBe(job.ownerPublicKey);
    });
  });

  describe("broadcast", () => {
    it("calls broadcast with the correct arguments", async () => {
      StatusStreamService.broadcast(JOB_ID, VerificationStatus.TEE_VERIFYING, { teeAttestationHash: "abc123" });

      expect(StatusStreamService.broadcast).toHaveBeenCalledWith(
        JOB_ID,
        VerificationStatus.TEE_VERIFYING,
        expect.objectContaining({ teeAttestationHash: "abc123" })
      );
    });
  });

  describe("hasSubscribers", () => {
    it("returns true when there are subscribers", () => {
      StatusStreamService.hasSubscribers.mockReturnValue(true);
      expect(StatusStreamService.hasSubscribers(JOB_ID)).toBe(true);
    });
  });
});

// ── Integration: verification service broadcasts ──────

describe("verificationService broadcasts status transitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    StatusStreamService.broadcast.mockResolvedValue(undefined);
    StatusStreamService.getSubscriberCount.mockReturnValue(0);
  });

  it("broadcasts PENDING when createJob creates a job", async () => {
    const job = makeJob({ status: VerificationStatus.PENDING });
    Model.create.mockResolvedValue(job);

    await verificationService.createJob({
      ownerPublicKey: job.ownerPublicKey,
      contentHash: job.contentHash,
    } as any);

    expect(StatusStreamService.broadcast).toHaveBeenCalledWith(
      expect.any(String),
      VerificationStatus.PENDING
    );
  });

  it("broadcasts TEE_VERIFYING when updateJobStatus transitions", async () => {
    const job = makeJob({ status: VerificationStatus.PROCESSING });
    Model.findById.mockResolvedValue(job);

    await verificationService.updateJobStatus(JOB_ID, {
      status: VerificationStatus.TEE_VERIFYING,
      teeAttestationHash: "att-123",
      teeSignature: "sig-456",
      codeMeasurementHash: "code-789",
    } as any);

    expect(StatusStreamService.broadcast).toHaveBeenCalledWith(
      JOB_ID,
      VerificationStatus.TEE_VERIFYING,
      expect.objectContaining({ teeAttestationHash: "att-123" })
    );
  });

  it("broadcasts MINTING when receiveOracleAttestation is called", async () => {
    const job = makeJob({ status: VerificationStatus.TEE_VERIFYING });
    Model.findById.mockResolvedValue(job);

    await verificationService.receiveOracleAttestation({
      jobId: JOB_ID,
      teeAttestationHash: "att-123",
      teeSignature: "sig-456",
    } as any);

    expect(StatusStreamService.broadcast).toHaveBeenCalledWith(
      JOB_ID,
      VerificationStatus.MINTING,
      expect.objectContaining({ teeAttestationHash: "att-123" })
    );
  });
});