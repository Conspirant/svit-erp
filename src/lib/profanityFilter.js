// A curated list of common profane/offensive words
// This is intentionally kept moderate — add more as needed
const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'dick', 'cunt',
  'bastard', 'slut', 'whore', 'piss', 'cock', 'tits',
  'asshole', 'dumbass', 'jackass', 'motherfucker', 'bullshit',
  'nigger', 'nigga', 'retard', 'faggot', 'fag',
  'madarchod', 'bhenchod', 'chutiya', 'gaand', 'lund',
  'randi', 'harami', 'bhosdike', 'lavde', 'gandu',
];

// Build a regex that matches whole words (case insensitive)
// Also catches leetspeak variants like f*ck, sh1t, etc.
const buildPattern = (word) => {
  // Escape special regex characters
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped;
};

const PROFANITY_REGEX = new RegExp(
  '\\b(' + BLOCKED_WORDS.map(buildPattern).join('|') + ')\\b',
  'gi'
);

/**
 * Check if text contains profanity
 * @param {string} text
 * @returns {boolean}
 */
export function containsProfanity(text) {
  return PROFANITY_REGEX.test(text);
}

/**
 * Replace profane words with asterisks
 * @param {string} text
 * @returns {string}
 */
export function filterProfanity(text) {
  return text.replace(PROFANITY_REGEX, (match) => {
    return match[0] + '*'.repeat(Math.max(1, match.length - 2)) + match[match.length - 1];
  });
}

// ─── Contact Info Detection (for Marketplace) ───

const PHONE_REGEX = /(?:\+91[\s-]?)?[6-9]\d{9}\b/;
const UPI_REGEX = /[a-zA-Z0-9.\-_]+@[a-zA-Z]{2,}/;
const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/i;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/**
 * Check if text contains contact information (phone, UPI, URL, email)
 * Used to prevent off-platform negotiation in marketplace posts
 * @param {string} text
 * @returns {{ found: boolean, type: string }}
 */
export function containsContactInfo(text) {
  if (PHONE_REGEX.test(text)) return { found: true, type: 'phone number' };
  if (URL_REGEX.test(text)) return { found: true, type: 'URL/link' };
  // Check email before UPI since UPI pattern can match emails
  if (EMAIL_REGEX.test(text)) return { found: true, type: 'email address' };
  if (UPI_REGEX.test(text)) return { found: true, type: 'UPI ID' };
  return { found: false, type: '' };
}
