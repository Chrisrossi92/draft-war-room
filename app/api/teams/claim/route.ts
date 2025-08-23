import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, teamId, token } = await req.json();

    if (!sessionId || !teamId || !token) {
      return NextResponse.json({ error: 'Missing sessionId, teamId, or token' }, { status: 400 });
    }

    // Verify team is in this session
    const { data: team, error: tErr } = await supabase
      .from('teams')
      .select('id, session_id, claimed_token')
      .eq('id', teamId)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    // If already claimed by someone else, block
    if (team.claimed_token && team.claimed_token !== token) {
      return NextResponse.json({ error: 'Team already claimed' }, { status: 403 });
    }

    // If not claimed yet (or re-claiming with same token), set/ensure token
    const { data: updated, error: uErr } = await supabase
      .from('teams')
      .update({ claimed_token: token })
      .eq('id', teamId)
      .eq('session_id', sessionId)
      .select('id, claimed_token')
      .single();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, teamId: updated.id, claimed_token: updated.claimed_token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

