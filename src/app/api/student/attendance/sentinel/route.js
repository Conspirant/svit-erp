import { NextResponse } from 'next/server';
import { sectionSentinel } from '@/lib/sentinelManager';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || '';
    const semester = searchParams.get('semester') || '';
    const branch = searchParams.get('branch') || '';
    const clientVersion = parseInt(searchParams.get('clientVersion') || '0', 10);

    const status = sectionSentinel.getSectionStatus(section, semester, branch, clientVersion);

    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Sentinel status error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { section, semester, branch, totalClasses } = body;

    const result = sectionSentinel.reportAttendanceState(section, semester, branch, totalClasses);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Sentinel report error' }, { status: 500 });
  }
}

