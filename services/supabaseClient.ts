
import { createClient } from '@supabase/supabase-js';

// robust check for environment variables
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`REACT_APP_${key}`] || process.env[`VITE_${key}`];
  }
  return null;
};

const envUrl = getEnv('SUPABASE_URL');
const envKey = getEnv('SUPABASE_ANON_KEY');

// YOUR SUPABASE CREDENTIALS
// We use these as defaults if environment variables are not set.
const supabaseUrl = envUrl || 'https://iucobdvedpcdtpvudzmd.supabase.co';
const supabaseKey = envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1Y29iZHZlZHBjZHRwdnVkem1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjAwOTUsImV4cCI6MjA3OTk5NjA5NX0.uZs8eSvrCO0YOTvLV-BkUyWWehZHJ6qaeQ7_ZaSmd3I';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Always return true now that we have valid credentials hardcoded
export const isSupabaseConfigured = () => true;
