/**
 * Egress IP & Gateway Rotation Manager
 *
 * Distributes outbound requests across multiple egress gateways / worker nodes
 * to completely eliminate IP-based rate limiting (429) and 503 drops from Accredia.
 *
 * Supported env vars:
 * - ERP_EGRESS_NODES: comma-separated list of worker gateways (e.g. "https://gw1.dev,https://gw2.dev")
 * - ERP_GATEWAY_URL: single or comma-separated fallback gateway URL
 */

const DIRECT_ORIGIN = 'https://svit-students.accredia.in:8084';

class EgressManager {
  constructor() {
    this.nodes = [];
    this.currentIndex = 0;
    this.initNodes();
  }

  initNodes() {
    const rawEnv = process.env.ERP_EGRESS_NODES || process.env.ERP_GATEWAY_URL || '';
    const parsed = rawEnv
      .split(',')
      .map((u) => u.trim().replace(/\/+$/, ''))
      .filter((u) => u && /^https?:\/\//i.test(u));

    // Always ensure direct origin is available as an egress candidate
    if (!parsed.includes(DIRECT_ORIGIN)) {
      parsed.push(DIRECT_ORIGIN);
    }

    // In non-production or when specified, include the Vercel cloud proxy as a resilient egress node
    const VERCEL_GATEWAY = 'https://svit-erp.vercel.app/api/erp-proxy';
    if (!parsed.includes(VERCEL_GATEWAY) && process.env.NODE_ENV !== 'production') {
      parsed.push(VERCEL_GATEWAY);
    }

    this.nodes = parsed.map((url) => ({
      url,
      healthy: true,
      consecutiveErrors: 0,
      totalSuccess: 0,
      cooldownUntil: 0,
      lastLatencyMs: 0,
    }));
  }

  /**
   * Refresh configured nodes if environment dynamically changes
   */
  reload() {
    this.initNodes();
  }

  /**
   * Get the list of all registered nodes
   */
  getAllNodes() {
    return this.nodes.map((n) => ({
      url: n.url,
      healthy: n.healthy && Date.now() >= n.cooldownUntil,
      successCount: n.totalSuccess,
      errorCount: n.consecutiveErrors,
      cooldownSeconds: Math.max(0, Math.round((n.cooldownUntil - Date.now()) / 1000)),
    }));
  }

  /**
   * Select the next healthy egress origin using round-robin
   */
  getNextOrigin() {
    if (this.nodes.length === 0) return DIRECT_ORIGIN;

    const now = Date.now();
    const available = this.nodes.filter((n) => n.healthy && now >= n.cooldownUntil);

    if (available.length === 0) {
      // If all are cooling down, pick the one whose cooldown expires earliest
      const sorted = [...this.nodes].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
      return sorted[0].url;
    }

    this.currentIndex = (this.currentIndex + 1) % available.length;
    return available[this.currentIndex].url;
  }

  /**
   * Report request outcome to automatically adjust egress node weighting
   */
  reportOutcome(origin, statusCode, latencyMs = 0) {
    const node = this.nodes.find((n) => n.url === origin);
    if (!node) return;

    node.lastLatencyMs = latencyMs;

    if (statusCode >= 200 && statusCode < 400) {
      node.healthy = true;
      node.consecutiveErrors = 0;
      node.totalSuccess++;
    } else if (statusCode === 429 || statusCode === 502 || statusCode === 503) {
      node.consecutiveErrors++;
      // Penalize with 45-second cooldown on rate-limit or gateway failure
      node.cooldownUntil = Date.now() + 45000;
      if (node.consecutiveErrors >= 3) {
        node.healthy = false;
        node.cooldownUntil = Date.now() + 120000; // 2 min penalty
      }
    }
  }

  /**
   * Resolve an ERP path to a full URL using the chosen or best egress origin
   */
  resolveUrl(path, preferredOrigin = null) {
    const origin = preferredOrigin || this.getNextOrigin();
    if (!path) return `${origin}/parents/index.php`;

    if (/^https?:\/\//i.test(path)) {
      return path.replace(/^https?:\/\/svit-students\.accredia\.in:8084/i, origin);
    }

    const clean = path.replace(/^\.?\//, '');
    if (clean.startsWith('parents/')) {
      return `${origin}/${clean}`;
    }
    return `${origin}/parents/${clean}`;
  }
}

// Singleton Egress Manager instance across the application lifecycle
export const egressManager = new EgressManager();
