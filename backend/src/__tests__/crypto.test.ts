import { computeSha256, normalizeSha256Hex, sha256HexEquals } from "../utils/crypto";

// FIPS 180-2 test vector for SHA-256("abc")
const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("computeSha256", () => {
  it("matches the FIPS 180-2 test vector", () => {
    expect(computeSha256(Buffer.from("abc", "utf8"))).toBe(ABC_SHA256);
  });

  it("matches the known digest of empty input", () => {
    expect(computeSha256(Buffer.alloc(0))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes raw bytes, not a string encoding of them", () => {
    const bytes = Buffer.from([0x00, 0xff, 0x10, 0x80]);
    expect(computeSha256(bytes)).toMatch(/^[a-f0-9]{64}$/);
    expect(computeSha256(bytes)).not.toBe(computeSha256(Buffer.from(bytes.toString("hex"))));
  });
});

describe("normalizeSha256Hex", () => {
  it.each([
    [ABC_SHA256, ABC_SHA256],
    [ABC_SHA256.toUpperCase(), ABC_SHA256],
    [`sha256:${ABC_SHA256}`, ABC_SHA256],
    [`0x${ABC_SHA256}`, ABC_SHA256],
    [`  ${ABC_SHA256}  `, ABC_SHA256],
  ])("normalises %s", (input, expected) => {
    expect(normalizeSha256Hex(input)).toBe(expected);
  });

  it.each([
    ["too short", ABC_SHA256.slice(0, 63)],
    ["too long", `${ABC_SHA256}0`],
    ["non-hex", `${ABC_SHA256.slice(0, 63)}g`],
    ["unknown prefix", `md5:${ABC_SHA256}`],
    ["empty", ""],
  ])("rejects %s", (_label, input) => {
    expect(normalizeSha256Hex(input)).toBeNull();
  });
});

describe("sha256HexEquals", () => {
  it("returns true for identical digests", () => {
    expect(sha256HexEquals(ABC_SHA256, ABC_SHA256)).toBe(true);
  });

  it("returns false for different digests", () => {
    expect(sha256HexEquals(ABC_SHA256, computeSha256(Buffer.from("abd")))).toBe(false);
  });

  it("returns false instead of throwing on malformed lengths", () => {
    expect(sha256HexEquals(ABC_SHA256, "abc")).toBe(false);
  });
});
