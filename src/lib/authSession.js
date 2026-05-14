export const HELPER_COOKIE_NAMES = new Set(['dashboard_url', 'erp_usn', 'erp_name']);

export function hasErpSession(cookieStore) {
  return cookieStore.getAll().some((cookie) => !HELPER_COOKIE_NAMES.has(cookie.name));
}

export function getSessionUsn(cookieStore) {
  return cookieStore.get('erp_usn')?.value?.trim().toUpperCase() || '';
}

export function setSessionIdentity(response, { usn, name } = {}) {
  const common = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24,
  };

  if (usn) {
    response.cookies.set('erp_usn', String(usn).trim().toUpperCase(), common);
  }

  if (name) {
    response.cookies.set('erp_name', String(name).trim().slice(0, 120), common);
  }
}

export function clearSessionCookies(response, cookiesToClear = []) {
  const names = new Set(['dashboard_url', 'erp_usn', 'erp_name', ...cookiesToClear.map((cookie) => cookie.name)]);
  names.forEach((name) => {
    response.cookies.set(name, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
  });
}
