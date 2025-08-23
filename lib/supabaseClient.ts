import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !/^https?:\/\//.test(url)) {
  throw new Error(
    "Supabase URL missing/invalid. Set NEXT_PUBLIC_SUPABASE_URL in .env.local (e.g., https://abc.supabase.co)"
  );
}
if (!anon) {
  throw new Error(
    "Supabase anon key missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});

