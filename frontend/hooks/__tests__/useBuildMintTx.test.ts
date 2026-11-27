/** @jest-environment node */
import { xdr } from "@stellar/stellar-sdk";
import { mapVerifierOutputToMintArgs, type VerifierOutput } from "../useBuildMintTx";

// A distinct fill byte per field, so swapped arguments cannot go unnoticed.
const OUTPUT: VerifierOutput = {
  contentHashHex: "a1".repeat(32),
  manifestHashHex: "b2".repeat(32),
  signatureHex: "c3".repeat(64),
  spvId: "spv-oracle-01",
};

const HEX_FIELDS = [
  ["contentHashHex", 0, 32],
  ["manifestHashHex", 1, 32],
  ["signatureHex", 2, 64],
] as const;

/** Encodes each argument to XDR and parses it back, as the network would. */
function roundTrip(args: xdr.ScVal[]): xdr.ScVal[] {
  return args.map((arg) => xdr.ScVal.fromXDR(arg.toXDR("base64"), "base64"));
}

describe("mapVerifierOutputToMintArgs XDR output", () => {
  it("returns four arguments as bytes, bytes, bytes and string", () => {
    const args = roundTrip(mapVerifierOutputToMintArgs(OUTPUT));

    expect(args.map((arg) => arg.switch().name)).toEqual([
      "scvBytes",
      "scvBytes",
      "scvBytes",
      "scvString",
    ]);
  });

  it("places each value in the mint_certificate argument order", () => {
    const [contentHash, manifestHash, signature, spvId] = roundTrip(
      mapVerifierOutputToMintArgs(OUTPUT)
    );

    expect(contentHash.bytes()).toEqual(Buffer.alloc(32, 0xa1));
    expect(manifestHash.bytes()).toEqual(Buffer.alloc(32, 0xb2));
    expect(signature.bytes()).toEqual(Buffer.alloc(64, 0xc3));
    expect(spvId.str().toString()).toBe("spv-oracle-01");
  });

  it("preserves byte order, including leading and trailing zero bytes", () => {
    const bytes = Buffer.from(Array.from({ length: 32 }, (_, index) => index));
    bytes[31] = 0;

    const [contentHash] = roundTrip(
      mapVerifierOutputToMintArgs({ ...OUTPUT, contentHashHex: bytes.toString("hex") })
    );

    expect(contentHash.bytes()).toEqual(bytes);
  });

  it("encodes a 32-byte argument to the expected XDR", () => {
    const [contentHash] = mapVerifierOutputToMintArgs(OUTPUT);

    // ScVal discriminant 13 (SCV_BYTES), length 32, then the raw bytes.
    expect(contentHash.toXDR("hex")).toBe("0000000d" + "00000020" + "a1".repeat(32));
  });

  it("produces identical XDR for identical input", () => {
    const encode = () => mapVerifierOutputToMintArgs(OUTPUT).map((arg) => arg.toXDR("base64"));

    expect(encode()).toEqual(encode());
  });

  it.each(["0x", "0X"])("strips a %s prefix from every hexadecimal field", (prefix) => {
    const prefixed = mapVerifierOutputToMintArgs({
      ...OUTPUT,
      contentHashHex: prefix + OUTPUT.contentHashHex,
      manifestHashHex: prefix + OUTPUT.manifestHashHex,
      signatureHex: prefix + OUTPUT.signatureHex,
    });

    expect(prefixed.map((arg) => arg.toXDR("base64"))).toEqual(
      mapVerifierOutputToMintArgs(OUTPUT).map((arg) => arg.toXDR("base64"))
    );
  });

  it("accepts uppercase and mixed-case hexadecimal", () => {
    const [contentHash, manifestHash] = mapVerifierOutputToMintArgs({
      ...OUTPUT,
      contentHashHex: "A1".repeat(32),
      manifestHashHex: "Bb".repeat(32),
    });

    expect(contentHash.bytes()).toEqual(Buffer.alloc(32, 0xa1));
    expect(manifestHash.bytes()).toEqual(Buffer.alloc(32, 0xbb));
  });

  it("trims surrounding whitespace from spvId", () => {
    const args = mapVerifierOutputToMintArgs({ ...OUTPUT, spvId: "  spv-oracle-01\n" });

    expect(args[3].str().toString()).toBe("spv-oracle-01");
  });
});

describe("mapVerifierOutputToMintArgs validation", () => {
  describe.each(HEX_FIELDS)("%s", (field, index, length) => {
    const message = `${field} must be ${length} bytes of hexadecimal data.`;

    it(`accepts exactly ${length} bytes`, () => {
      const args = mapVerifierOutputToMintArgs({ ...OUTPUT, [field]: "0f".repeat(length) });

      expect(args[index].bytes()).toHaveLength(length);
    });

    it.each([
      ["empty", ""],
      ["only a prefix", "0x"],
      ["one byte short", "aa".repeat(length - 1)],
      ["one byte long", "aa".repeat(length + 1)],
      ["one character short", "a".repeat(length * 2 - 1)],
      ["non-hexadecimal", "zz".repeat(length)],
      ["padded with whitespace", ` ${"aa".repeat(length)} `],
      ["prefixed twice", `0x0x${"aa".repeat(length)}`],
    ])("rejects a value that is %s", (_case, value) => {
      expect(() => mapVerifierOutputToMintArgs({ ...OUTPUT, [field]: value })).toThrow(message);
    });
  });

  it.each([
    ["empty", ""],
    ["whitespace only", " \t\n "],
  ])("rejects an spvId that is %s", (_case, spvId) => {
    expect(() => mapVerifierOutputToMintArgs({ ...OUTPUT, spvId })).toThrow("spvId is required.");
  });
});
