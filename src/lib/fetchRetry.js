import axios from 'axios';

/**
 * Retry wrapper for axios requests going through the Cloudflare Worker gateway.
 * Handles transient 520-524 errors (CF gateway errors) and network failures.
 *
 * @param {Function} fn - async function that returns an axios response
 * @param {number} retries - number of retry attempts (default 2, so 3 total)
 * @param {number} delayMs - base delay between retries in ms (default 800)
 * @returns {Promise} - resolves with the axios response
 */
export async function fetchWithRetry(fn, retries = 2, delayMs = 800) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fn();
      // Retry on Cloudflare gateway-level failures (520/521/522/523/524)
      if (res.status >= 520 && res.status <= 524 && attempt < retries) {
        lastErr = new Error(`Gateway returned ${res.status}`);
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      // Don't retry on 4xx client errors
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Default validateStatus that lets gateway errors through for retry handling
 * instead of throwing immediately.
 */
export const gatewayValidateStatus = (status) =>
  (status >= 200 && status < 400) || (status >= 520 && status <= 524);
