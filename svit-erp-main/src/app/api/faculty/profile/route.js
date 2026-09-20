import { NextResponse } from 'next/server';
import { scrapeFacultyProfile } from '@/lib/facultyScraper';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expertId') || '';

    if (!expertId) {
      return NextResponse.json({ success: false, error: 'Expert ID is required' }, { status: 400 });
    }

    const profile = await scrapeFacultyProfile(expertId);
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Faculty Profile API Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
