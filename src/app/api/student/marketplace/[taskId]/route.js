import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_USNS } from '@/lib/marketplaceUtils';

const supabase = createClient(
  'https://ogzskvecqoekztoarnao.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nenNrdmVjcW9la3p0b2FybmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDY5MTAsImV4cCI6MjA5MzcyMjkxMH0.EM4FrLrLQm4Q-oeADBlRcfWdLdb-V2zmKWzXuOa1D5Q'
);

function hasErpSession(cookieStore) {
  return cookieStore.getAll().some(c => !['dashboard_url'].includes(c.name));
}

function getMarketplaceTaskChannel(taskId) {
  return `marketplace-task-${taskId}`;
}

export async function GET(request, { params }) {
  const cookieStore = await cookies();
  if (!hasErpSession(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerUsn = request.headers.get('x-caller-usn')?.toUpperCase();
  const { taskId } = await params;

  const { data: task, error } = await supabase.from('marketplace_tasks').select('*').eq('id', taskId).single();
  if (error || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  let applications = [];
  const isPoster = callerUsn && task.poster_usn?.toUpperCase() === callerUsn;
  const isAdmin = callerUsn && ADMIN_USNS.includes(callerUsn);

  if (isPoster || isAdmin) {
    const { data } = await supabase.from('marketplace_applications').select('*').eq('task_id', taskId).order('created_at');
    applications = data || [];
  }

  const { data: reviews } = await supabase.from('marketplace_reviews').select('*').eq('task_id', taskId);
  return NextResponse.json({ success: true, data: task, applications, reviews: reviews || [], isAdmin, isPoster });
}

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  if (!hasErpSession(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerUsn = request.headers.get('x-caller-usn')?.toUpperCase();
  if (!callerUsn) return NextResponse.json({ error: 'USN required' }, { status: 400 });

  const { taskId } = await params;
  const body = await request.json();
  const { action, applicant_usn, applicant_name, reason } = body;

  const { data: task } = await supabase.from('marketplace_tasks').select('*').eq('id', taskId).single();
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const poster = task.poster_usn?.toUpperCase();
  const doer = task.accepted_by_usn?.toUpperCase();
  const isAdmin = ADMIN_USNS.includes(callerUsn);
  let update = {};

  if (action === 'accept') {
    if (callerUsn !== poster) return NextResponse.json({ error: 'Only the poster can accept applicants.' }, { status: 403 });
    if (task.status !== 'open') return NextResponse.json({ error: 'Task is no longer open.' }, { status: 400 });
    update = { status: 'accepted', accepted_by_usn: applicant_usn?.toUpperCase(), accepted_by_name: applicant_name, accepted_at: new Date().toISOString() };
    await supabase.from('marketplace_applications').update({ status: 'rejected' }).eq('task_id', taskId).neq('applicant_usn', applicant_usn);
    await supabase.from('marketplace_applications').update({ status: 'accepted' }).eq('task_id', taskId).eq('applicant_usn', applicant_usn);
  } else if (action === 'cancel') {
    if (callerUsn !== poster && !isAdmin) return NextResponse.json({ error: 'Only the poster can cancel.' }, { status: 403 });
    if (task.status !== 'open') return NextResponse.json({ error: 'Only open tasks can be cancelled.' }, { status: 400 });
    update = { status: 'cancelled' };
  } else if (action === 'submit') {
    if (callerUsn !== doer) return NextResponse.json({ error: 'Only the accepted doer can submit.' }, { status: 403 });
    if (task.status !== 'accepted') return NextResponse.json({ error: 'Task must be in accepted state.' }, { status: 400 });
    update = { status: 'submitted', submitted_at: new Date().toISOString() };
  } else if (action === 'complete') {
    if (callerUsn !== poster) return NextResponse.json({ error: 'Only the poster can mark complete.' }, { status: 403 });
    if (task.status !== 'submitted') return NextResponse.json({ error: 'Task must be submitted first.' }, { status: 400 });
    update = { status: 'completed', completed_at: new Date().toISOString() };
  } else if (action === 'dispute') {
    if (callerUsn !== poster && callerUsn !== doer) return NextResponse.json({ error: 'Only task participants can dispute.' }, { status: 403 });
    if (!['accepted', 'submitted'].includes(task.status)) return NextResponse.json({ error: 'Cannot dispute at this stage.' }, { status: 400 });
    update = { status: 'disputed' };
    if (reason) await supabase.from('marketplace_reports').insert({ task_id: taskId, reporter_usn: callerUsn, reason: `DISPUTE: ${reason}` });
  } else if (action === 'resolve') {
    if (!isAdmin) return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    update = { status: 'cancelled' };
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const { data, error } = await supabase.from('marketplace_tasks').update({ ...update, updated_at: new Date().toISOString() }).eq('id', taskId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === 'complete') {
    const { error: chatDeleteError } = await supabase
      .from('messages')
      .delete()
      .eq('channel', getMarketplaceTaskChannel(taskId));

    return NextResponse.json({
      success: true,
      data,
      privateChatDeleted: !chatDeleteError,
      chatDeleteError: chatDeleteError?.message || null,
    });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  if (!hasErpSession(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerUsn = request.headers.get('x-caller-usn')?.toUpperCase();
  const { taskId } = await params;
  const { data: task } = await supabase.from('marketplace_tasks').select('poster_usn,status').eq('id', taskId).single();
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (task.poster_usn?.toUpperCase() !== callerUsn && !ADMIN_USNS.includes(callerUsn))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (task.status !== 'open')
    return NextResponse.json({ error: 'Only open tasks can be deleted.' }, { status: 400 });
  await supabase.from('marketplace_tasks').delete().eq('id', taskId);
  return NextResponse.json({ success: true });
}
