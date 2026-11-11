import axios from 'axios';
import { egressManager } from './egressManager';

function reportOutcomeFromConfig(config, status) {
  if (!config?.url) return;
  try {
    const origin = new URL(config.url).origin;
    egressManager.reportOutcome(origin, status);
  } catch (_) {}
}

/**
 * Enhanced retry wrapper for requests to Accredia / Cloudflare Gateway.
 * Handles transient network resets, rate limits (429), server 503,
 * and Cloudflare gateway errors (520-524).
 *
 * @param {Function} fn - async function that returns an axios response
 * @param {Object} options - { retries, baseDelayMs, maxDelayMs }
 * @returns {Promise} - resolves with the axios response
 */
export async function fetchWithRetry(fn, options = {}) {
  const {
    retries = 3,
    baseDelayMs = 400,
    maxDelayMs = 4000,
  } = options;

  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fn();
      reportOutcomeFromConfig(res.config, res.status);

      // Retry on Cloudflare gateway errors (520/521/522/523/524)
      if (res.status >= 520 && res.status <= 524 && attempt < retries) {
        lastErr = new Error(`Gateway returned ${res.status}`);
        const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt) + Math.random() * 200);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Retry on Accredia server 503 (Service Unavailable)
      if (res.status === 503 && attempt < retries) {
        lastErr = new Error(`Accredia returned 503 Service Unavailable`);
        const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt) + Math.random() * 200);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Retry on 429 (Too Many Requests / Rate Limited)
      if (res.status === 429 && attempt < retries) {
        lastErr = new Error(`Accredia returned 429 Rate Limited`);
        const delay = Math.min(maxDelayMs, 1000 * Math.pow(2, attempt) + Math.random() * 300);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return res;
    } catch (err) {
      lastErr = err;

      const status = err.response?.status;
      reportOutcomeFromConfig(err.config, status || 502);

      // Specifically retry on 429 (Rate Limit) even if axios throws
      if (status === 429 && attempt < retries) {
        const delay = Math.min(maxDelayMs, 1000 * Math.pow(2, attempt) + Math.random() * 300);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Specifically retry on 503 (Service Unavailable)
      if (status === 503 && attempt < retries) {
        const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt) + Math.random() * 200);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Don't retry on typical non-retryable 4xx client errors (400, 401, 403, 404)
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err;
      }

      // Network level transient errors: ECONNRESET, ETIMEDOUT, socket hang up, ECONNABORTED
      const isNetworkTransient =
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNABORTED' ||
        err.code === 'EAI_AGAIN' ||
        err.message?.includes('socket hang up') ||
        err.message?.includes('timeout');

      if ((isNetworkTransient || (status && status >= 500)) && attempt < retries) {
        // If request failed through an external gateway, failover directly to canonical Accredia upstream
        if (err.config?.url && !err.config.url.includes('svit-students.accredia.in:8084')) {
          try {
            const directUrl = err.config.url.replace(/^https?:\/\/[^\/]+/, 'https://svit-students.accredia.in:8084');
            console.warn(`[fetchRetry] Gateway failed (${status || err.message}). Failing over directly to Accredia: ${directUrl}`);
            const fallbackRes = await axios({
              ...err.config,
              url: directUrl,
              headers: {
                ...err.config.headers,
                Host: 'svit-students.accredia.in:8084',
              },
            });
            reportOutcomeFromConfig(fallbackRes.config, fallbackRes.status);
            return fallbackRes;
          } catch (failoverErr) {
            console.warn(`[fetchRetry] Direct failover attempt failed: ${failoverErr.message}`);
          }
        }

        const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt) + Math.random() * 200);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Final attempt failover if still targeting gateway
      if (err.config?.url && !err.config.url.includes('svit-students.accredia.in:8084')) {
        try {
          const directUrl = err.config.url.replace(/^https?:\/\/[^\/]+/, 'https://svit-students.accredia.in:8084');
          console.warn(`[fetchRetry] Final attempt gateway failover to Accredia: ${directUrl}`);
          const fallbackRes = await axios({
            ...err.config,
            url: directUrl,
            headers: {
              ...err.config.headers,
              Host: 'svit-students.accredia.in:8084',
            },
          });
          reportOutcomeFromConfig(fallbackRes.config, fallbackRes.status);
          return fallbackRes;
        } catch (_) {}
      }

      throw err;
    }
  }

  throw lastErr;
}

/**
 * Controlled Concurrency Worker Pool.
 * Executes async tasks over `items` with at most `concurrency` active in parallel.
 * Much faster than sequential (10x faster) while avoiding slamming Accredia's port 8084.
 *
 * @param {Array} items - items to process
 * @param {number} concurrency - maximum active tasks (e.g. 2 or 3)
 * @param {Function} workerFn - async function(item, index)
 * @returns {Promise<Array>} settled results [{ status: 'fulfilled', value }, { status: 'rejected', reason }]
 */
export async function pLimitPool(items, concurrency = 3, workerFn) {
  if (!items || items.length === 0) return [];

  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      try {
        const val = await workerFn(item, index);
        results[index] = { status: 'fulfilled', value: val };
      } catch (err) {
        results[index] = { status: 'rejected', reason: err };
      }
    }
  }

  const workers = [];
  const poolSize = Math.min(concurrency, items.length);
  for (let i = 0; i < poolSize; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

/**
 * Default validateStatus that lets gateway errors and 429 through for retry handling
 * instead of throwing immediately.
 */
export const gatewayValidateStatus = (status) =>
  (status >= 200 && status < 400) || status === 429 || (status >= 520 && status <= 524);
