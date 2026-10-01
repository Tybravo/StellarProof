import { Address, Keypair, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import {
  parseSorobanEvents,
  SorobanEventParseError,
  type SorobanEventEnvelope,
} from "../utils/sorobanEvents";

function baseEvent(
  name: string,
  value: xdr.ScVal,
  extraTopics: xdr.ScVal[] = []
): SorobanEventEnvelope {
  return {
    id: `evt-${name}`,
    ledger: 123,
    txHash: "ab".repeat(32),
    contractId: "C".repeat(56),
    topic: [xdr.ScVal.scvSymbol(name), ...extraTopics],
    value,
  };
}

describe("parseSorobanEvents", () => {
  it("decodes and validates VerificationRequest", () => {
    const contentHash = Buffer.alloc(32, 7);
    const value = nativeToScVal({
      id: 42n,
      content_hash: contentHash,
      state: "Pending",
    });

    const [event] = parseSorobanEvents([baseEvent("VerificationRequest", value)]);

    expect(event).toEqual(
      expect.objectContaining({
        type: "VerificationRequest",
        requestId: "42",
        contentHash: contentHash.toString("hex"),
        state: "Pending",
      })
    );
  });

  it("decodes and validates Attestation", () => {
    const provider = Buffer.alloc(32, 1);
    const teeHash = Buffer.alloc(32, 2);
    const value = nativeToScVal({
      provider,
      tee_hash: teeHash,
      request_id: 9n,
    });

    const [event] = parseSorobanEvents([baseEvent("Attestation", value)]);

    expect(event).toEqual(
      expect.objectContaining({
        type: "Attestation",
        requestId: "9",
        provider: provider.toString("hex"),
        teeHash: teeHash.toString("hex"),
      })
    );
  });

  it("decodes CertificateMinted fields carried in topics", () => {
    const owner = Keypair.random().publicKey();
    const manifestHash = "f".repeat(64);

    const event = baseEvent("CertificateMinted", xdr.ScVal.scvVoid(), [
      Address.fromString(owner).toScVal(),
      nativeToScVal(17n, { type: "u64" }),
      xdr.ScVal.scvString(manifestHash),
    ]);

    const [parsed] = parseSorobanEvents([event]);

    expect(parsed).toEqual(
      expect.objectContaining({
        type: "CertificateMinted",
        owner,
        certificateId: "17",
        manifestHash,
      })
    );
  });

  it("skips unknown event types without mis-decoding them", () => {
    expect(
      parseSorobanEvents([baseEvent("ProviderAdded", nativeToScVal({ provider: Buffer.alloc(32) }))])
    ).toEqual([]);
  });

  it("rejects malformed supported events", () => {
    const malformed = baseEvent(
      "Attestation",
      nativeToScVal({ provider: Buffer.alloc(31), tee_hash: Buffer.alloc(32), request_id: 1n })
    );

    expect(() => parseSorobanEvents([malformed])).toThrow(SorobanEventParseError);
  });
});
