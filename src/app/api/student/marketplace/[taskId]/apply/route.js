import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { MAX_ACTIVE_ACCEPTS } from '@/lib/marketplaceUtils';

const supabase = createClient(
  'https://ogzskvecqoekztoarnao.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nenNrdmVjcW9la3p0b2FybmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDY5MTAsImV4cCI6MjA5MzcyMjkxMH0.EM4FrLrLQm4Q-oeADBlRcfWdLdb-V2zmKWzXuOa1D5Q'
);

function cleanProfileField(value) {
  return String(value || '').trim().slice(0, 80);
}

function appendProfileToName(name, branch, semester) {
  const meta = [branch, semester ? `Sem ${semester}` : ''].filter(Boolean).join(' · ');
  return meta ? `${name} (${meta})` : name;
}

async function insertApplicationWithProfile(insertData, profileData) {
  const { data, error } = await supabase
    .from('marketplace_applications')
    .insert({ ...insertData, ...profileData })
    .select()
    .single();

  if (!error) return { data, error };

  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  const missingProfileColumns = message.includes('applicant_branch') || message.includes('applicant_semester');
  if (!missingProfileColumns) return { data, error };

  return supabase
    .from('marketplace_applications')
    .insert({
      ...insertData,
      applicant_name: appendProfileToName(insertData.applicant_name, profileData.applicant_branch, profileData.applicant_semester),
    })
    .select()
    .single();
}

export async function POST(request, { params }) {
  const cookieStore = await cookies();
  const hasSession = cookieStore.getAll().some(c => !['dashboard_url'].includes(c.name));
  if (!hasSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerUsn = request.headers.get('x-caller-usn')?.toUpperCase();
  if (!callerUsn) return NextResponse.json({ error: 'USN required' }, { status: 400 });

  const { taskId } = await params;
  const { message, applicant_name, applicant_branch, applicant_semester } = await request.json();

  const { data: task } = await supabase.from('marketplace_tasks').select('poster_usn,status').eq('id', taskId).single();
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (task.status !== 'open') return NextResponse.json({ error: 'Task is no longer accepting applications.' }, { status: 400 });
  if (task.poster_usn?.toUpperCase() === callerUsn) return NextResponse.json({ error: 'You cannot apply to your own task.' }, { status: 400 });

  const { data: existing } = await supabase.from('marketplace_applications').select('id').eq('task_id', taskId).eq('applicant_usn', callerUsn).maybeSingle();
  if (existing) return NextResponse.json({ error: 'You have already applied to this task.' }, { status: 400 });

  const { count } = await supabase.from('marketplace_tasks').select('id', { count: 'exact', head: true }).eq('accepted_by_usn', callerUsn).in('status', ['accepted', 'submitted']);
  if ((count || 0) >= MAX_ACTIVE_ACCEPTS) return NextResponse.json({ error: `You can only handle ${MAX_ACTIVE_ACCEPTS} active tasks at a time.` }, { status: 429 });

  const { data, error } = await insertApplicationWithProfile({
    task_id: taskId,
    applicant_usn: callerUsn,
    applicant_name: cleanProfileField(applicant_name) || 'Student',
    message: message?.trim() || '',
  }, {
    applicant_branch: cleanProfileField(applicant_branch),
    applicant_semester: cleanProfileField(applicant_semester),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data }, { status: 201 });
}
