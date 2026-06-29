/**
 * Unit tests for WalletModal connect logic.
 * Tests the wallet connection behaviour and Freighter detection
 * without requiring DOM rendering.
 */

import { FREIGHTER_INSTALL_URL, createWalletService } from '../../../services/wallet';

// ── FREIGHTER_INSTALL_URL ─────────────────────────────────────────────────

describe('FREIGHTER_INSTALL_URL', () => {
  it('is a non-empty string', () => {
    expect(typeof FREIGHTER_INSTALL_URL).toBe('string');
    expect(FREIGHTER_INSTALL_URL.length).toBeGreaterThan(0);
  });

  it('points to the freighter.app domain', () => {
    expect(FREIGHTER_INSTALL_URL).toContain('freighter.app');
  });

  it('is a valid https URL', () => {
    expect(FREIGHTER_INSTALL_URL).toMatch(/^https:\/\//);
  });
});

// ── mock wallet service ───────────────────────────────────────────────────

describe('createWalletService mock mode', () => {
  it('mock service reports as installed', async () => {
    const service = createWalletService(true);
    expect(await service.isInstalled()).toBe(true);
  });

  it('mock service returns a public key on requestAccess', async () => {
    const service = createWalletService(true);
    const result = await service.requestAccess();
    expect(result.address).toBeTruthy();
    expect(typeof result.address).toBe('string');
  });

  it('mock requestAccess returns no error', async () => {
    const service = createWalletService(true);
    const result = await service.requestAccess();
    expect(result.error).toBeUndefined();
  });

  it('mock service returns same key from getAddress', async () => {
    const service = createWalletService(true);
    const address = await service.getAddress();
    expect(typeof address).toBe('string');
    expect(address).toBeTruthy();
  });

  it('mock service returns testnet network details', async () => {
    const service = createWalletService(true);
    const details = await service.getNetworkDetails();
    expect(details?.network).toBe('testnet');
  });

  it('mock requestAccess and getAddress return the same address', async () => {
    const service = createWalletService(true);
    const fromRequest = (await service.requestAccess()).address;
    const fromGet = await service.getAddress();
    expect(fromRequest).toBe(fromGet);
  });
});

// ── WalletService interface contract ─────────────────────────────────────

describe('walletService interface', () => {
  it('mock service exposes all required methods', () => {
    const service = createWalletService(true);
    expect(typeof service.isInstalled).toBe('function');
    expect(typeof service.requestAccess).toBe('function');
    expect(typeof service.getAddress).toBe('function');
    expect(typeof service.getNetworkDetails).toBe('function');
  });

  it('connect flow: isInstalled then requestAccess', async () => {
    const service = createWalletService(true);
    const installed = await service.isInstalled();
    expect(installed).toBe(true);
    const result = await service.requestAccess();
    expect(result.address).toBeTruthy();
  });

  it('requestAccess result has address xor error', async () => {
    const service = createWalletService(true);
    const result = await service.requestAccess();
    const hasAddress = Boolean(result.address);
    const hasError = Boolean(result.error);
    // Must have exactly one of address or error
    expect(hasAddress !== hasError).toBe(true);
  });

  it('getNetworkDetails returns network and networkPassphrase', async () => {
    const service = createWalletService(true);
    const details = await service.getNetworkDetails();
    expect(details).not.toBeNull();
    expect(typeof details?.network).toBe('string');
    expect(typeof details?.networkPassphrase).toBe('string');
  });
});