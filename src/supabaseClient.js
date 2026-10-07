import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured =
  typeof url === 'string' && url.startsWith('http') && typeof key === 'string' && key.length > 10;

export const supabase = createClient(
  isConfigured ? url : 'https://placeholder.supabase.co',
  isConfigured ? key : 'placeholder-key',
  { auth: { persistSession: true, autoRefreshToken: true } }
);
