import https from 'https';
import http from 'http';

const RAW_ROOT_ORIGIN = (process.env.ERP_GATEWAY_URL || 'https://svit-students.accredia.in:8084').replace(/\/+$/, '');

export const ERP_ROOT_ORIGIN = RAW_ROOT_ORIGIN;
export const ERP_PARENTS_ORIGIN = `${RAW_ROOT_ORIGIN}/parents`;
export const ERP_BASE_URL = `${RAW_ROOT_ORIGIN}/parents/index.php`;
export const ERP_CAPTCHA_URL = `${RAW_ROOT_ORIGIN}/parents/templates/contineoReg/captcha/get_captcha.php`;

export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export const COMMON_BROWSER_HEADERS = {
  'User-Agent': DEFAULT_USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Upgrade-Insecure-Requests': '1',
};

// Singleton HTTPS Agent with persistent connection pool
let sharedHttpsAgent = null;

export function createHttpsAgent(options = {}) {
  if (!sharedHttpsAgent || Object.keys(options).length > 0) {
    const agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
      keepAliveMsecs: 60000,
      maxSockets: 8,
      maxFreeSockets: 4,
      timeout: 25000,
      ...options,
    });
    if (Object.keys(options).length === 0) {
      sharedHttpsAgent = agent;
    }
    return agent;
  }
  return sharedHttpsAgent;
}

export function resolveErpUrl(path) {
  if (!path) return ERP_BASE_URL;
  if (/^https?:\/\//i.test(path)) {
    return path.replace(/^https?:\/\/svit-students\.accredia\.in:8084/i, ERP_ROOT_ORIGIN);
  }

  const clean = path.replace(/^\.?\//, '');
  if (clean.startsWith('parents/')) {
    return `${ERP_ROOT_ORIGIN}/${clean}`;
  }
  return `${ERP_PARENTS_ORIGIN}/${clean}`;
}
