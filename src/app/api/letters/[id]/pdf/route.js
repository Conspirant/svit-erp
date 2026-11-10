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

    const pdfRes = await fetch(LETTERS_ENDPOINTS.LETTER_PDF(id), {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
      },
      cache: 'no-store',
    });

    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      return NextResponse.json(
        { success: false, error: 'PDF not available yet or request failed.', details: errText },
        { status: pdfRes.status }
      );
    }

    const pdfBuffer = await pdfRes.arrayBuffer();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="letter_${id}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to stream PDF.' },
      { status: 500 }
    );
  }
}

