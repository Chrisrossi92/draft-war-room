import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  // Latest snapshot (by as_of DESC)
  const { data, error } = await supabase
    .from('player_snapshot')
    .select('payload_json, as_of')
    .order('as_of', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ players: [], as_of: null });

  return NextResponse.json({ players: data.payload_json ?? [], as_of: data.as_of });
}
