import { NextResponse } from 'next/server';
import { LETTERS_ENDPOINTS } from '@/lib/lettersConfig';

export async function GET() {
  try {
    const res = await fetch(LETTERS_ENDPOINTS.DEPARTMENTS, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
      },
      next: { revalidate: 86400 }, // 24h cache
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch departments.' },
      { status: 500 }
    );
  }
}

