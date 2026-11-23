import { Address, Keypair, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import {
  parseSorobanEvents,
  SorobanEventParseError,
  type SorobanEventEnvelope,
} from "@/utils/parseSorobanEvents";

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

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

describe("parseSorobanEvents", () => {
  it("decodes and validates VerificationRequest", () => {
    const contentHash = new Uint8Array(32).fill(7);
    const value = nativeToScVal({
      id: BigInt(42),
      content_hash: contentHash,
      state: "Pending",
    });

    const [event] = parseSorobanEvents([baseEvent("VerificationRequest", value)]);

    expect(event).toEqual(
      expect.objectContaining({
        type: "VerificationRequest",
        requestId: "42",
        contentHash: hex(contentHash),
        state: "Pending",
      })
    );
  });

  it("decodes and validates Attestation", () => {
    const provider = new Uint8Array(32).fill(1);
    const teeHash = new Uint8Array(32).fill(2);
    const value = nativeToScVal({
      provider,
      tee_hash: teeHash,
      request_id: BigInt(9),
    });

    const [event] = parseSorobanEvents([baseEvent("Attestation", value)]);

    expect(event).toEqual(
      expect.objectContaining({
        type: "Attestation",
        requestId: "9",
        provider: hex(provider),
        teeHash: hex(teeHash),
      })
    );
  });

  it("decodes CertificateMinted fields carried in topics", () => {
    const owner = Keypair.random().publicKey();
    const manifestHash = "f".repeat(64);

    const event = baseEvent("CertificateMinted", xdr.ScVal.scvVoid(), [
      Address.fromString(owner).toScVal(),
      nativeToScVal(BigInt(17), { type: "u64" }),
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
      parseSorobanEvents([
        baseEvent("ProviderAdded", nativeToScVal({ provider: new Uint8Array(32) })),
      ])
    ).toEqual([]);
  });

  it("rejects malformed supported events", () => {
    const malformed = baseEvent(
      "Attestation",
      nativeToScVal({
        provider: new Uint8Array(31),
        tee_hash: new Uint8Array(32),
        request_id: BigInt(1),
      })
    );

    expect(() => parseSorobanEvents([malformed])).toThrow(SorobanEventParseError);
  });

  it("rejects an invalid event envelope", () => {
    const event = {
      ...baseEvent("Attestation", xdr.ScVal.scvVoid()),
      id: "",
    };

    expect(() => parseSorobanEvents([event])).toThrow(SorobanEventParseError);
  });

  it("returns JSON-serializable objects", () => {
    const contentHash = new Uint8Array(32).fill(3);
    const [event] = parseSorobanEvents([
      baseEvent(
        "VerificationRequest",
        nativeToScVal({ id: BigInt(1), content_hash: contentHash })
      ),
    ]);

    expect(() => JSON.stringify(event)).not.toThrow();
    expect(JSON.parse(JSON.stringify(event))).toEqual(event);
  });
});
