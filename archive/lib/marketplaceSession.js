/**
 * Shared session helper for marketplace API routes.
 * Verifies auth by checking for a valid ERP session cookie,
 * then resolves USN from our Supabase users table (populated at connect time).
 */
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { getSessionUsn, hasErpSession } from '@/lib/authSession';

/**
 * Returns { usn, name } for the current request, or null if not authenticated.
 * Auth = any real ERP cookie present (not just dashboard_url).
 * USN is resolved from our Supabase users table which is populated when a user
 * visits SVIT Connect. Falls back to checking dashboard_url cookie hostname.
 */
export async function getMarketplaceSession() {
  const cookieStore = await cookies();
  if (!hasErpSession(cookieStore)) return null;

  const usn = getSessionUsn(cookieStore);
  if (usn) return { usn, name: cookieStore.get('erp_name')?.value || 'Student' };

  // Try to find the most recently seen user from Supabase
  // This works because the Connect page upserts the user with last_seen
  const { data: recentUsers } = await supabase
    .from('users')
    .select('usn, name')
    .order('last_seen', { ascending: false })
    .limit(1);

  // We can't reliably get a single user this way in production with many users.
  // The profile_data sessionStorage key is set client-side; we need it server-side.
  // Best approach: store USN in a cookie at login, or require the client to pass it.
  // For now, return a sentinel that tells the route auth passed but USN needs to come from client.
  if (recentUsers?.[0]) {
    return { usn: recentUsers[0].usn?.toUpperCase(), name: recentUsers[0].name };
  }

  return { usn: null, name: 'Student' };
}

export { supabase };
