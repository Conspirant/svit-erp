// ─── Marketplace Constants & Helpers ───

export const ADMIN_USNS = ['1VA25CD092'];

export const CATEGORIES = [
  { id: 'assignment', label: 'Assignment', color: '#3b82f6' },
  { id: 'notes', label: 'Notes', color: '#8b5cf6' },
  { id: 'tutoring', label: 'Tutoring', color: '#10b981' },
  { id: 'design', label: 'Design', color: '#ec4899' },
  { id: 'coding', label: 'Coding', color: '#f59e0b' },
  { id: 'other', label: 'Other', color: '#6b7280' },
];

export const TASK_STATUSES = {
  open: { label: 'Open', color: 'var(--success)', bg: 'var(--success-soft)' },
  accepted: { label: 'Accepted', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  submitted: { label: 'Submitted', color: '#3b82f6', bg: '#eff6ff' },
  completed: { label: 'Completed', color: 'var(--primary)', bg: '#e8f4ef' },
  disputed: { label: 'Disputed', color: 'var(--danger)', bg: 'var(--danger-soft)' },
  cancelled: { label: 'Cancelled', color: 'var(--muted)', bg: 'var(--surface-soft)' },
  expired: { label: 'Expired', color: 'var(--muted)', bg: 'var(--surface-soft)' },
};

export const REWARD_MIN = 50;
export const REWARD_MAX = 5000;
export const MAX_ACTIVE_POSTS = 3;
export const MAX_ACTIVE_ACCEPTS = 5;

export function formatReward(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function getCategoryInfo(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export function getReputation(reviews) {
  if (!reviews || reviews.length === 0) return { avg: 0, count: 0, stars: '☆☆☆☆☆' };
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const rounded = Math.round(avg * 10) / 10;
  const full = Math.floor(rounded);
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
  return { avg: rounded, count: reviews.length, stars };
}

export function formatDeadline(deadline) {
  if (!deadline) return 'No deadline';
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `${diffDays} days left`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function isExpired(task) {
  if (!task.deadline) return false;
  return new Date(task.deadline) < new Date();
}

export function canAct(task, userUsn, action) {
  const usn = userUsn?.toUpperCase();
  const poster = task.poster_usn?.toUpperCase();
  const doer = task.accepted_by_usn?.toUpperCase();

  switch (action) {
    case 'apply':
      return task.status === 'open' && usn !== poster;
    case 'accept':
      return task.status === 'open' && usn === poster;
    case 'cancel':
      return task.status === 'open' && usn === poster;
    case 'submit':
      return task.status === 'accepted' && usn === doer;
    case 'complete':
      return task.status === 'submitted' && usn === poster;
    case 'dispute':
      return ['accepted', 'submitted'].includes(task.status) && (usn === poster || usn === doer);
    case 'review':
      return task.status === 'completed' && (usn === poster || usn === doer);
    case 'resolve':
      return task.status === 'disputed' && ADMIN_USNS.includes(usn);
    default:
      return false;
  }
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
