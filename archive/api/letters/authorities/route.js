import { NextResponse } from 'next/server';
import { LETTERS_ENDPOINTS } from '@/lib/lettersConfig';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dept = searchParams.get('dept') || 'CSE';

    const res = await fetch(LETTERS_ENDPOINTS.AUTHORITIES(dept), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
      },
      next: { revalidate: 3600 },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch authorities.' },
      { status: 500 }
    );
  }
}

