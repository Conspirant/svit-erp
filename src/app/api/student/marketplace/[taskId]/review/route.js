import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { getSessionUsn, hasErpSession } from '@/lib/authSession';

export async function POST(request, { params }) {
  const cookieStore = await cookies();
  if (!hasErpSession(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerUsn = getSessionUsn(cookieStore);
  if (!callerUsn) return NextResponse.json({ error: 'USN required' }, { status: 400 });

  const { taskId } = await params;
  const { rating, comment, reviewed_usn } = await request.json();

  const { data: task } = await supabase.from('marketplace_tasks').select('*').eq('id', taskId).single();
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (task.status !== 'completed') return NextResponse.json({ error: 'Reviews can only be left after task completion.' }, { status: 400 });

  const poster = task.poster_usn?.toUpperCase();
  const doer = task.accepted_by_usn?.toUpperCase();
  if (callerUsn !== poster && callerUsn !== doer) return NextResponse.json({ error: 'Only task participants can leave reviews.' }, { status: 403 });

  const target = reviewed_usn?.toUpperCase();
  if (target !== poster && target !== doer) return NextResponse.json({ error: 'Invalid reviewed user.' }, { status: 400 });
  if (target === callerUsn) return NextResponse.json({ error: 'You cannot review yourself.' }, { status: 400 });

  const ratingNum = parseInt(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) return NextResponse.json({ error: 'Rating must be 1-5.' }, { status: 400 });

  const { data, error } = await supabase.from('marketplace_reviews').insert({
    task_id: taskId, reviewer_usn: callerUsn, reviewed_usn: target, rating: ratingNum, comment: comment?.trim() || ''
  }).select().single();
  if (error?.code === '23505') return NextResponse.json({ error: 'You have already reviewed this task.' }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data }, { status: 201 });
}
