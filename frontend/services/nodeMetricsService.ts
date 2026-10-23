export interface NodeMetricPoint {
  /** ISO timestamp for this sample. */
  timestamp: string;
  /** Uptime percentage (0-100) over the sampling window. */
  uptimePct: number;
  /** Response latency in milliseconds. */
  latencyMs: number;
}

function simulateDelay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates deterministic-looking historical uptime/latency samples for a
 * given Oracle node. Backed by mock data until a metrics/indexer backend is
 * available, matching the pattern used by `registryService`.
 */
export async function getNodeMetrics(
  nodeId: string,
  points = 12
): Promise<NodeMetricPoint[]> {
  await simulateDelay();

  // Simple deterministic pseudo-random generator seeded by nodeId so the
  // same node always renders the same chart during a session.
  let seed = Array.from(nodeId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  return Array.from({ length: points }, (_, i) => {
    const timestamp = new Date(now - (points - 1 - i) * hourMs).toISOString();
    const uptimePct = Math.min(100, 95 + next() * 5);
    const latencyMs = Math.round(80 + next() * 120);
    return { timestamp, uptimePct, latencyMs };
  });
}
