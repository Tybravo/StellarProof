const METHODS = new Set([
  'getHealth', 'getNetwork', 'getLatestLedger', 'getLedgerEntries',
  'getTransaction', 'sendTransaction', 'simulateTransaction', 'getEvents',
  'getFeeStats', 'getVersionInfo', 'getLedgers',
]);
const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

async function readJson(body: ReadableStream<Uint8Array> | null, limit: number): Promise<unknown> {
  if (!body) throw new Error('Missing body');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Body too large');
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  let endpoint: URL;
  try {
    if (!process.env.SOROBAN_RPC_URL) throw new Error('Missing endpoint');
    endpoint = new URL(process.env.SOROBAN_RPC_URL);
    if (!['https:', 'http:'].includes(endpoint.protocol)) throw new Error('Invalid endpoint');
  } catch {
    return errorResponse(503, 'Soroban RPC is not configured');
  }

  let body: unknown;
  try {
    body = await readJson(request.body, MAX_REQUEST_BYTES);
  } catch {
    return errorResponse(400, 'Invalid or oversized JSON-RPC request');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse(400, 'Expected one JSON-RPC request');
  const envelope = body as Record<string, unknown>;
  if (envelope.jsonrpc !== '2.0' || typeof envelope.method !== 'string' || !METHODS.has(envelope.method) ||
      !(envelope.id === null || typeof envelope.id === 'string' || (typeof envelope.id === 'number' && Number.isFinite(envelope.id))) ||
      (envelope.params !== undefined && (envelope.params === null || typeof envelope.params !== 'object'))) {
    return errorResponse(400, 'Invalid or unsupported JSON-RPC request');
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: envelope.id, method: envelope.method, params: envelope.params }),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) return errorResponse(502, 'Soroban RPC is unavailable');
    const result = await readJson(response.body, MAX_RESPONSE_BYTES);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid response');
    const rpc = result as Record<string, unknown>;
    if (rpc.jsonrpc !== '2.0' || rpc.id !== envelope.id || (('result' in rpc) === ('error' in rpc))) throw new Error('Invalid response');
    if ('error' in rpc) {
      const code = rpc.error && typeof rpc.error === 'object' && 'code' in rpc.error ? rpc.error.code : undefined;
      if (typeof code !== 'number' || !Number.isInteger(code)) throw new Error('Invalid error');
      return Response.json({ jsonrpc: '2.0', id: envelope.id, error: { code, message: 'Soroban RPC request failed' } },
        { headers: { 'Cache-Control': 'no-store' } });
    }
    // Providers can include endpoint URLs in diagnostic result strings.
    const sanitized = JSON.stringify(rpc.result)
      .replaceAll(endpoint.href, '[redacted]').replaceAll(endpoint.host, '[redacted]');
    return Response.json({ jsonrpc: '2.0', id: envelope.id, result: JSON.parse(sanitized) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return errorResponse(502, 'Soroban RPC request failed');
  }
}
