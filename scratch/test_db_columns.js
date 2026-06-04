const { createClient } = require('@supabase/supabase-js');

// Load keys from process env or use the fallback keys from src/lib/supabase.js
const SUPABASE_URL = 'https://ogzskvecqoekztoarnao.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nenNrdmVjcW9la3p0b2FybmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDY5MTAsImV4cCI6MjA5MzcyMjkxMH0.EM4FrLrLQm4Q-oeADBlRcfWdLdb-V2zmKWzXuOa1D5Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSchema() {
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
      console.error('Error fetching users:', error.message);
    } else {
      console.log('Successfully fetched users data. Rows count:', data.length);
      if (data.length > 0) {
        console.log('Columns in users table:', Object.keys(data[0]));
        console.log('Sample row:', data[0]);
      } else {
        console.log('Users table is empty.');
      }
    }
  } catch (err) {
    console.error('Failed to run test:', err.message);
  }
}

testSchema();
