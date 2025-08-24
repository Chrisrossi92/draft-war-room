import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { fetchSleeperPlayers, fetchSleeperADP } from '@/lib/data/sleeper';

export async function POST(_req: NextRequest) {
  try {
    const [players, adp] = await Promise.all([
      fetchSleeperPlayers(),
      fetchSleeperADP()
    ]);

    // merge ADP in a light structure on the fly for quick usage client-side
    const merged = players.map(p => ({
      ...p,
      adp: adp[p.id],
    }));

    // snapshot players
    const { error: psErr } = await supabase
      .from('player_snapshot')
      .insert({ payload_json: merged });

    if (psErr) return NextResponse.json({ error: psErr.message }, { status: 500 });

    // also store raw adp in a separate table for debugging/metrics (optional)
    if (Object.keys(adp).length) {
      const { error: adpErr } = await supabase
        .from('adp_snapshot')
        .insert({ payload_json: adp });
      if (adpErr) {
        // don't fail the whole request—just include a warning
        return NextResponse.json({ ok: true, players: merged.length, adpStored: false, adpErr: adpErr.message });
      }
    }

    return NextResponse.json({ ok: true, players: merged.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'snapshot failed' }, { status: 500 });
  }
}
