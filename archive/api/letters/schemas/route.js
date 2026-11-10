import { NextResponse } from 'next/server';
import { LETTERS_ENDPOINTS } from '@/lib/lettersConfig';

export async function GET(request) {
  try {
    const token =
      request.cookies.get('svit_letters_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sai Vidya portal session missing.' },
        { status: 401 }
      );
    }

    const res = await fetch(LETTERS_ENDPOINTS.SCHEMAS, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
      },
      next: { revalidate: 3600 },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch letter schemas.' },
      { status: 500 }
    );
  }
}

