// app/api/picks/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  const { data: picks, error } = await supabase
    .from('picks')
    .select('round, overall, team_id, player_id, made_by, created_at')
    .eq('session_id', sessionId)
    .order('overall', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: picks ?? [] });
}
