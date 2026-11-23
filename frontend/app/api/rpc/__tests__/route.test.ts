/** @jest-environment node */
import { POST } from '../route';

const endpoint = 'https://private-rpc.example/api?key=server-secret';
const originalFetch = global.fetch;
const originalUrl = process.env.SOROBAN_RPC_URL;
const fetchMock = jest.fn();

beforeEach(() => {
  process.env.SOROBAN_RPC_URL = endpoint;
  global.fetch = fetchMock;
  fetchMock.mockReset();
});
afterAll(() => {
  global.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SOROBAN_RPC_URL;
  else process.env.SOROBAN_RPC_URL = originalUrl;
});

function request(body: unknown = { jsonrpc: '2.0', id: 1, method: 'getLatestLedger' }) {
  return new Request('http://localhost/api/rpc', {
    method: 'POST', body: JSON.stringify(body),
    headers: { Cookie: 'private-session', Authorization: 'Bearer client-token' },
  });
}

test('proxies only to server configuration and returns the RPC result', async () => {
  fetchMock.mockResolvedValue(Response.json({ jsonrpc: '2.0', id: 1, result: { sequence: 10 } }));
  const response = await POST(request());
  expect(await response.json()).toEqual({ jsonrpc: '2.0', id: 1, result: { sequence: 10 } });
  const [url, options] = fetchMock.mock.calls[0];
  expect(url.href).toBe(endpoint);
  expect(options.headers).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' });
  expect(options.redirect).toBe('error');
  expect(JSON.parse(options.body)).toEqual({ jsonrpc: '2.0', id: 1, method: 'getLatestLedger' });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});

test('redacts provider errors and diagnostic endpoint URLs', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: endpoint, data: 'server-secret' } }));
  const error = await POST(request());
  expect(await error.text()).not.toMatch(/server-secret|private-rpc/);
  fetchMock.mockResolvedValueOnce(Response.json({ jsonrpc: '2.0', id: 1, result: { diagnostic: endpoint } }));
  const success = await POST(request());
  expect(await success.text()).not.toMatch(/server-secret|private-rpc/);
});

test.each([
  { jsonrpc: '2.0', id: 1, method: 'arbitraryAdminMethod' },
  { jsonrpc: '1.0', id: 1, method: 'getHealth' },
  [{ jsonrpc: '2.0', id: 1, method: 'getHealth' }],
])('rejects unsupported request bodies before contacting the provider', async body => {
  expect((await POST(request(body))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('bounds request size and hides missing configuration and network exceptions', async () => {
  expect((await POST(request('x'.repeat(1024 * 1024 + 1)))).status).toBe(400);
  delete process.env.SOROBAN_RPC_URL;
  expect((await POST(request())).status).toBe(503);
  process.env.SOROBAN_RPC_URL = endpoint;
  fetchMock.mockRejectedValue(new Error(endpoint));
  const response = await POST(request());
  expect(response.status).toBe(502);
  expect(await response.text()).not.toMatch(/server-secret|private-rpc/);
});

test('rejects failed HTTP responses and malformed RPC responses', async () => {
  fetchMock.mockResolvedValueOnce(new Response(endpoint, { status: 500 }));
  expect((await POST(request())).status).toBe(502);
  fetchMock.mockResolvedValueOnce(Response.json({ jsonrpc: '2.0', id: 'different', result: {} }));
  expect((await POST(request())).status).toBe(502);
});
