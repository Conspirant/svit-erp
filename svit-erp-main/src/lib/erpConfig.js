import https from 'https';

export const ERP_ROOT_ORIGIN = 'https://svit-students.accredia.in:8084';
export const ERP_PARENTS_ORIGIN = 'https://svit-students.accredia.in:8084/parents';
export const ERP_BASE_URL = 'https://svit-students.accredia.in:8084/parents/index.php';
export const ERP_CAPTCHA_URL = 'https://svit-students.accredia.in:8084/parents/templates/contineoReg/captcha/get_captcha.php';

export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export function createHttpsAgent(options = {}) {
  return new https.Agent({
    rejectUnauthorized: false,
    keepAlive: false,
    maxSockets: 10,
    ...options,
  });
}

export function resolveErpUrl(path) {
  if (!path) return ERP_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;

  const clean = path.replace(/^\.?\//, '');
  if (clean.startsWith('parents/')) {
    return `${ERP_ROOT_ORIGIN}/${clean}`;
  }
  return `${ERP_PARENTS_ORIGIN}/${clean}`;
}
