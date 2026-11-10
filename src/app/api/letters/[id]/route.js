import { NextResponse } from 'next/server';
import { LETTERS_ENDPOINTS } from '@/lib/lettersConfig';

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const token =
      request.cookies.get('svit_letters_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Not connected to Sai Vidya Letter Portal.' },
        { status: 401 }
      );
    }

    const res = await fetch(LETTERS_ENDPOINTS.LETTER_DETAIL(id), {
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
      { success: false, error: err.message || 'Failed to fetch letter details.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const token =
      request.cookies.get('svit_letters_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Not connected to Sai Vidya Letter Portal.' },
        { status: 401 }
      );
    }

    const res = await fetch(LETTERS_ENDPOINTS.LETTER_DETAIL(id), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
      },
    });

    const responseBody = await res.text();
    let data;
    try {
      data = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      data = { message: responseBody || res.statusText };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to cancel letter application.' },
      { status: 500 }
    );
  }
}

