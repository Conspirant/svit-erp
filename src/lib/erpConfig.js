import https from 'https';

const RAW_ROOT_ORIGIN = (process.env.ERP_GATEWAY_URL || 'https://svit-students.accredia.in:8084').replace(/\/+$/, '');

export const ERP_ROOT_ORIGIN = RAW_ROOT_ORIGIN;
export const ERP_PARENTS_ORIGIN = `${RAW_ROOT_ORIGIN}/parents`;
export const ERP_BASE_URL = `${RAW_ROOT_ORIGIN}/parents/index.php`;
export const ERP_CAPTCHA_URL = `${RAW_ROOT_ORIGIN}/parents/templates/contineoReg/captcha/get_captcha.php`;

export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export function createHttpsAgent(options = {}) {
  return new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 3,        // Limit concurrent open sockets to 3
    maxFreeSockets: 2,
    timeout: 25000,
    ...options,
  });
}

export function resolveErpUrl(path) {
  if (!path) return ERP_BASE_URL;
  if (/^https?:\/\//i.test(path)) {
    // If the path already has Accredia origin, rewrite it to use ERP_ROOT_ORIGIN
    return path.replace(/^https?:\/\/svit-students\.accredia\.in:8084/i, ERP_ROOT_ORIGIN);
  }

  const clean = path.replace(/^\.?\//, '');
  if (clean.startsWith('parents/')) {
    return `${ERP_ROOT_ORIGIN}/${clean}`;
  }
  return `${ERP_PARENTS_ORIGIN}/${clean}`;
}
