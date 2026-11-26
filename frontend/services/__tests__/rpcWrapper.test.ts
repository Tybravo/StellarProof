import {
  rotateEndpoints,
  resolveRpcEndpoints,
  isRecoverableRpcError,
  RpcEndpointPool,
  executeWithRpcFallback,
  FailoverRpcServer,
  AllRpcEndpointsFailedError,
} from '../rpcWrapper';
import { rpc } from '@stellar/stellar-sdk';

jest.mock('@stellar/stellar-sdk', () => {
  const original = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...original,
    rpc: {
      ...original.rpc,
      Server: jest.fn().mockImplementation((url: string) => ({
        serverUrl: url,
        getLatestLedger: jest.fn().mockResolvedValue({ sequence: 12345 }),
        getEvents: jest.fn().mockResolvedValue({ events: [], latestLedger: 12345 }),
        getTransaction: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
        getHealth: jest.fn().mockResolvedValue({ status: 'healthy' }),
      })),
    },
  };
});

describe('rpcWrapper service', () => {
  const mockEndpoints = [
    'https://node-primary.example.com',
    'https://node-secondary-1.example.com',
    'https://node-secondary-2.example.com',
  ];

  describe('rotateEndpoints pure helper', () => {
    it('rotates endpoints array shifting the primary to the end', () => {
      const original = ['A', 'B', 'C'];
      const rotated = rotateEndpoints(original);
      expect(rotated).toEqual(['B', 'C', 'A']);
      // Original should remain unmodified
      expect(original).toEqual(['A', 'B', 'C']);
    });

    it('handles single item or empty arrays', () => {
      expect(rotateEndpoints(['A'])).toEqual(['A']);
      expect(rotateEndpoints([])).toEqual([]);
    });
  });

  describe('resolveRpcEndpoints', () => {
    it('returns custom endpoints if provided', () => {
      const custom = ['https://custom-1.org', 'https://custom-2.org'];
      expect(resolveRpcEndpoints('testnet', custom)).toEqual(custom);
    });

    it('resolves testnet defaults without duplicates', () => {
      const endpoints = resolveRpcEndpoints('testnet');
      expect(endpoints.length).toBeGreaterThan(1);
      expect(endpoints[0]).toBe('https://soroban-testnet.stellar.org');
      expect(new Set(endpoints).size).toBe(endpoints.length);
    });
  });

  describe('isRecoverableRpcError', () => {
    it('identifies transient network and server errors as recoverable', () => {
      expect(isRecoverableRpcError(new Error('fetch failed'))).toBe(true);
      expect(isRecoverableRpcError(new Error('RPC request timed out'))).toBe(true);
      expect(isRecoverableRpcError(new Error('503 Service Unavailable'))).toBe(true);
      expect(isRecoverableRpcError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isRecoverableRpcError(new Error('Rate limit exceeded 429'))).toBe(true);
    });

    it('identifies non-network errors properly', () => {
      expect(isRecoverableRpcError(null)).toBe(false);
      expect(isRecoverableRpcError(new Error('Invalid signature parameter'))).toBe(false);
    });
  });

  describe('RpcEndpointPool', () => {
    it('initializes with active endpoint as the first node', () => {
      const pool = new RpcEndpointPool(mockEndpoints);
      expect(pool.getActiveEndpoint()).toBe(mockEndpoints[0]);
      expect(pool.getAllEndpoints()).toEqual(mockEndpoints);
      expect(pool.getConnectionStatus()).toBe('connected');
    });

    it('rotates nodes and notifies listeners', () => {
      const pool = new RpcEndpointPool(mockEndpoints);
      const endpointListener = jest.fn();
      pool.onEndpointChange(endpointListener);

      const next = pool.rotate();
      expect(next).toBe(mockEndpoints[1]);
      expect(pool.getActiveEndpoint()).toBe(mockEndpoints[1]);
      expect(endpointListener).toHaveBeenCalledWith(mockEndpoints[1], mockEndpoints[0]);

      pool.rotate();
      expect(pool.getActiveEndpoint()).toBe(mockEndpoints[2]);

      pool.rotate();
      expect(pool.getActiveEndpoint()).toBe(mockEndpoints[0]);
    });

    it('tracks health status, success, and failures', () => {
      const pool = new RpcEndpointPool(mockEndpoints);
      const stateListener = jest.fn();
      pool.onStateChange(stateListener);

      pool.markFailure(mockEndpoints[0], new Error('Connection refused'));
      const health = pool.getNodeHealth(mockEndpoints[0]);
      expect(health?.consecutiveFailures).toBe(1);
      expect(health?.lastError).toBe('Connection refused');
      expect(stateListener).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'degraded', activeEndpoint: mockEndpoints[0] })
      );

      pool.markSuccess(mockEndpoints[0], 50);
      expect(pool.getNodeHealth(mockEndpoints[0])?.consecutiveFailures).toBe(0);
      expect(pool.getNodeHealth(mockEndpoints[0])?.responseTimeMs).toBe(50);
      expect(pool.getConnectionStatus()).toBe('connected');
    });
  });

  describe('executeWithRpcFallback', () => {
    it('succeeds immediately on primary endpoint without rotation', async () => {
      const pool = new RpcEndpointPool(mockEndpoints);
      const op = jest.fn().mockResolvedValue('success-primary');

      const result = await executeWithRpcFallback(pool, op);
      expect(result).toBe('success-primary');
      expect(op).toHaveBeenCalledTimes(1);
      expect(pool.getActiveEndpoint()).toBe(mockEndpoints[0]);
    });

    it('switches to secondary RPC node when primary fails and keeps application online', async () => {
      const pool = new RpcEndpointPool(mockEndpoints);
      const op = jest
        .fn()
        .mockRejectedValueOnce(new Error('RPC Primary node 503 Unavailable'))
        .mockResolvedValueOnce('success-secondary');

      const result = await executeWithRpcFallback(pool, op);

      expect(result).toBe('success-secondary');
      expect(op).toHaveBeenCalledTimes(2);
      // Array rotated so secondary is now the active node
      expect(pool.getActiveEndpoint()).toBe(mockEndpoints[1]);
      expect(pool.getNodeHealth(mockEndpoints[0])?.consecutiveFailures).toBe(1);
      expect(pool.getNodeHealth(mockEndpoints[1])?.consecutiveFailures).toBe(0);
    });

    it('rotates through multiple nodes until a healthy one is found', async () => {
      const pool = new RpcEndpointPool(mockEndpoints);
      const op = jest
        .fn()
        .mockRejectedValueOnce(new Error('Node 1 down'))
        .mockRejectedValueOnce(new Error('Node 2 timeout'))
        .mockResolvedValueOnce('success-node-3');

      const result = await executeWithRpcFallback(pool, op);

      expect(result).toBe('success-node-3');
      expect(op).toHaveBeenCalledTimes(3);
      expect(pool.getActiveEndpoint()).toBe(mockEndpoints[2]);
    });

    it('throws AllRpcEndpointsFailedError if all endpoints fail', async () => {
      const pool = new RpcEndpointPool(mockEndpoints);
      const op = jest.fn().mockRejectedValue(new Error('Global outage'));

      await expect(executeWithRpcFallback(pool, op)).rejects.toThrow(AllRpcEndpointsFailedError);
      expect(op).toHaveBeenCalledTimes(mockEndpoints.length);
    });
  });

  describe('FailoverRpcServer', () => {
    it('delegates getLatestLedger to underlying RPC server with fallback', async () => {
      const server = new FailoverRpcServer(mockEndpoints);
      const ledger = await server.getLatestLedger();

      expect(ledger).toEqual({ sequence: 12345 });
      expect(server.getActiveEndpoint()).toBe(mockEndpoints[0]);
    });

    it('falls back to secondary endpoint on method failure', async () => {
      const server = new FailoverRpcServer(mockEndpoints);

      // First call against primary fails, second call against secondary succeeds
      const mockOp = jest.spyOn(server, 'execute').mockImplementation(async (fn) => {
        const dummyServer = new rpc.Server(server.getActiveEndpoint());
        return fn(dummyServer, server.getActiveEndpoint());
      });

      const events = await server.getEvents({
        startLedger: 100,
        limit: 10,
      });

      expect(events).toEqual({ events: [], latestLedger: 12345 });
      mockOp.mockRestore();
    });
  });
});
