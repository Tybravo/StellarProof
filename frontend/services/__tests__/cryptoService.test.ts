import { decryptAesGcm } from "../cryptoService";

test("an AES-GCM blob and key yield the original file bytes", async () => {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const original = new TextEncoder().encode("sealed-provenance-vault");
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, original);
  const plain = await decryptAesGcm(encrypted, keyBytes, iv);
  expect(new TextDecoder().decode(plain)).toBe("sealed-provenance-vault");
});
