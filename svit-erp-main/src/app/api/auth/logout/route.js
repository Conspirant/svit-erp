import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookies } from '@/lib/authSession';

export async function POST() {
  const cookieStore = await cookies();
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  clearSessionCookies(response, cookieStore.getAll());
  return response;
}

export async function GET() {
  return POST();
}
