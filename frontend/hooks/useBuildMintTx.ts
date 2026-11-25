import { xdr } from '@stellar/stellar-sdk';

export interface VerifierOutput {
  contentHashHex: string;
  manifestHashHex: string;
  signatureHex: string;
  spvId: string;
}

function bytesScVal(value: string, bytes: number, field: string): xdr.ScVal {
  const normalized = value.replace(/^0x/i, '');
  if (!new RegExp(`^[0-9a-fA-F]{${bytes * 2}}$`).test(normalized)) {
    throw new Error(`${field} must be ${bytes} bytes of hexadecimal data.`);
  }
  const data = Uint8Array.from(normalized.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  return xdr.ScVal.scvBytes(data as Buffer);
}

/** Serialize VerifierOutput in the mint_certificate argument order. */
export function mapVerifierOutputToMintArgs(output: VerifierOutput): xdr.ScVal[] {
  if (!output.spvId.trim()) throw new Error('spvId is required.');
  return [
    bytesScVal(output.contentHashHex, 32, 'contentHashHex'),
    bytesScVal(output.manifestHashHex, 32, 'manifestHashHex'),
    bytesScVal(output.signatureHex, 64, 'signatureHex'),
    xdr.ScVal.scvString(output.spvId.trim()),
  ];
}
