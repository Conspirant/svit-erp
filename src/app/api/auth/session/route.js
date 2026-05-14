import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUsn, hasErpSession } from '@/lib/authSession';

export async function GET() {
  const cookieStore = await cookies();
  const authenticated = hasErpSession(cookieStore);

  return NextResponse.json({
    success: true,
    data: {
      authenticated,
      usn: authenticated ? getSessionUsn(cookieStore) : '',
    },
  });
}
