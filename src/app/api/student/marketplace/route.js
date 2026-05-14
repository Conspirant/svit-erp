import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { filterProfanity, containsProfanity, containsContactInfo } from '@/lib/profanityFilter';
import { REWARD_MIN, REWARD_MAX, MAX_ACTIVE_POSTS, ADMIN_USNS } from '@/lib/marketplaceUtils';
import { supabase } from '@/lib/supabase';
import { getSessionUsn, hasErpSession } from '@/lib/authSession';

function getCallerUsn(cookieStore) {
  return getSessionUsn(cookieStore);
}

function cleanProfileField(value) {
  return String(value || '').trim().slice(0, 80);
}

function appendProfileToName(name, branch, semester) {
  const meta = [branch, semester ? `Sem ${semester}` : ''].filter(Boolean).join(' · ');
  return meta ? `${name} (${meta})` : name;
}

function getMarketplaceTaskChannel(taskId) {
  return `marketplace-task-${taskId}`;
}

async function cleanupOldCompletedTasks() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 5);

  const { data: oldTasks } = await supabase
    .from('marketplace_tasks')
    .select('id')
    .eq('status', 'completed')
    .lt('completed_at', cutoff.toISOString());

  if (!oldTasks?.length) return 0;

  const ids = oldTasks.map(task => task.id);
  const channels = ids.map(getMarketplaceTaskChannel);

  await supabase.from('messages').delete().in('channel', channels);
  await supabase.from('marketplace_applications').delete().in('task_id', ids);
  await supabase.from('marketplace_reviews').delete().in('task_id', ids);
  await supabase.from('marketplace_reports').delete().in('task_id', ids);
  await supabase.from('marketplace_tasks').delete().in('id', ids);

  return ids.length;
}

async function insertTaskWithProfile(insertData, profileData) {
  const { data, error } = await supabase
    .from('marketplace_tasks')
    .insert({ ...insertData, ...profileData })
    .select()
    .single();

  if (!error) return { data, error };

  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  const missingProfileColumns = message.includes('poster_branch') || message.includes('poster_semester');
  if (!missingProfileColumns) return { data, error };

  const fallbackData = {
    ...insertData,
    poster_name: appendProfileToName(insertData.poster_name, profileData.poster_branch, profileData.poster_semester),
  };

  return supabase
    .from('marketplace_tasks')
    .insert(fallbackData)
    .select()
    .single();
}

export async function GET(request) {
  const cookieStore = await cookies();
  if (!hasErpSession(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerUsn = getCallerUsn(cookieStore);
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const sort = searchParams.get('sort') || 'newest';
  const search = searchParams.get('search') || '';
  const mine = searchParams.get('mine');
  const accepted = searchParams.get('accepted');
  const deletedCompletedCount = await cleanupOldCompletedTasks();

  let query = supabase.from('marketplace_tasks').select('*');

  if (mine === '1' && callerUsn) query = query.eq('poster_usn', callerUsn);
  else if (accepted === '1' && callerUsn) query = query.eq('accepted_by_usn', callerUsn);
  else query = query.not('status', 'in', '(cancelled,expired)');

  if (category && category !== 'all') query = query.eq('category', category);
  if (search) query = query.ilike('title', `%${search}%`);

  if (sort === 'reward_high') query = query.order('reward_amount', { ascending: false });
  else if (sort === 'ending_soon') query = query.order('deadline', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query.limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: data || [],
    isAdmin: callerUsn ? ADMIN_USNS.includes(callerUsn) : false,
    deletedCompletedCount,
  });
}

export async function POST(request) {
  const cookieStore = await cookies();
  if (!hasErpSession(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerUsn = getCallerUsn(cookieStore);
  if (!callerUsn) return NextResponse.json({ error: 'USN not found. Please visit your profile first.' }, { status: 400 });

  const body = await request.json();
  const { title, description, category, reward_amount, deadline, poster_name } = body;
  const posterBranch = cleanProfileField(body.poster_branch);
  const posterSemester = cleanProfileField(body.poster_semester);

  if (!title?.trim() || title.trim().length < 5)
    return NextResponse.json({ error: 'Title must be at least 5 characters.' }, { status: 400 });
  if (!description?.trim() || description.trim().length < 20)
    return NextResponse.json({ error: 'Description must be at least 20 characters.' }, { status: 400 });
  if (!category) return NextResponse.json({ error: 'Category is required.' }, { status: 400 });

  const reward = parseInt(reward_amount);
  if (isNaN(reward) || reward < REWARD_MIN || reward > REWARD_MAX)
    return NextResponse.json({ error: `Reward must be between ₹${REWARD_MIN} and ₹${REWARD_MAX}.` }, { status: 400 });
  if (!deadline || new Date(deadline) <= new Date())
    return NextResponse.json({ error: 'Deadline must be a future date.' }, { status: 400 });

  const contactCheck = containsContactInfo(description);
  if (contactCheck.found)
    return NextResponse.json({ error: `Remove the ${contactCheck.type} from your description. Share contact details only after a doer is accepted.` }, { status: 400 });
  if (containsProfanity(title) || containsProfanity(description))
    return NextResponse.json({ error: 'Please keep your task description respectful.' }, { status: 400 });

  const { count } = await supabase.from('marketplace_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('poster_usn', callerUsn)
    .in('status', ['open', 'accepted', 'submitted']);
  if ((count || 0) >= MAX_ACTIVE_POSTS)
    return NextResponse.json({ error: `You can only have ${MAX_ACTIVE_POSTS} active tasks at a time.` }, { status: 429 });

  const { data, error } = await insertTaskWithProfile({
    poster_usn: callerUsn,
    poster_name: cleanProfileField(poster_name) || 'Student',
    title: filterProfanity(title.trim()),
    description: filterProfanity(description.trim()),
    category,
    reward_amount: reward,
    deadline: new Date(deadline).toISOString(),
    status: 'open',
  }, {
    poster_branch: posterBranch,
    poster_semester: posterSemester,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data }, { status: 201 });
}
