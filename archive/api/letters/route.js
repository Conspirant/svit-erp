import { NextResponse } from 'next/server';
import { LETTERS_ENDPOINTS } from '@/lib/lettersConfig';

export async function GET(request) {
  try {
    const token =
      request.cookies.get('svit_letters_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Not connected to Sai Vidya Letter Portal.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const targetUrl = scope
      ? `${LETTERS_ENDPOINTS.LETTERS}?scope=${encodeURIComponent(scope)}`
      : LETTERS_ENDPOINTS.LETTERS;

    const res = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
      },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch letters.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const token =
      request.cookies.get('svit_letters_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Not connected to Sai Vidya Letter Portal.' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    let res;
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      res = await fetch(LETTERS_ENDPOINTS.LETTERS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
        },
        body: formData,
      });
    } else {
      const jsonBody = await request.json();
      res = await fetch(LETTERS_ENDPOINTS.LETTERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
        },
        body: JSON.stringify(jsonBody),
      });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit letter application.' },
      { status: 500 }
    );
  }
}

