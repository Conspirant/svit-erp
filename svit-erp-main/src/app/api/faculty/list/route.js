import { NextResponse } from 'next/server';
import { getSlugFromDept, scrapeFacultyList } from '@/lib/facultyScraper';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dept = searchParams.get('dept') || '';
    const slugParam = searchParams.get('slug') || '';

    let slug = slugParam;
    if (!slug) {
      slug = getSlugFromDept(dept);
    }

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Department or slug is required' }, { status: 400 });
    }

    const faculty = await scrapeFacultyList(slug);
    return NextResponse.json({ success: true, data: faculty });
  } catch (error) {
    console.error('Faculty List API Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
