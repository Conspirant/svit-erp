import { NextResponse } from 'next/server';
import { LETTERS_ENDPOINTS } from '@/lib/lettersConfig';

const DEPT_NAME_TO_CODE = {
  'computer science and engineering': 'CSE',
  'computer science and engineering (ai & ml)': 'CSE (AI & ML)',
  'computer science and engineering (data science)': 'CSE (Data Science)',
  'cse (ai & ml)': 'CSE (AI & ML)',
  'cse (data science)': 'CSE (Data Science)',
  'cse (ai/ml)': 'CSE (AI & ML)',
  'cse (ds)': 'CSE (Data Science)',
  'information science and engineering': 'ISE',
  'electronics and communication engineering': 'ECE',
  'electronics and communication eng': 'ECE',
  'mechanical engineering': 'ME',
  'civil engineering': 'CE',
  'physics cycle': 'Physics Cycle',
  'chemistry cycle': 'Chemistry Cycle',
  'master of business administration': 'MBA',
  'mba': 'MBA',
  'cse': 'CSE',
  'ise': 'ISE',
  'ece': 'ECE',
  'me': 'ME',
  'ce': 'CE',
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawDept = searchParams.get('dept') || 'CSE';
    const normalizedKey = rawDept.trim().toLowerCase();
    const deptCode = DEPT_NAME_TO_CODE[normalizedKey] || rawDept.trim();

    const res = await fetch(LETTERS_ENDPOINTS.AUTHORITIES(deptCode), {
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

