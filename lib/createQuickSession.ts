'use client';

import { nanoid } from '@/utils/id';
import { DEFAULT_CONFIG } from '@/store/defaultConfig';

// Bundled fallback (tiny sample)
import PLAYERS_FALLBACK from '@/data/players.sample.json';
import ADP_FALLBACK from '@/data/adp.sample.json';

type SnapshotResp = {
  players: Array<{
    id: string;
    name: string;
    pos: 'QB'|'RB'|'WR'|'TE';
    team: string;
    bye: number | null;
    adp?: number;
  }>;
  as_of: string | null;
};

async function getLatestSnapshot(): Promise<SnapshotResp | null> {
  try {
    // Try the latest snapshot created via /api/data/snapshot
    const res = await fetch('/api/data/players', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as SnapshotResp;
    if (!json || !Array.isArray(json.players) || json.players.length === 0) return null;

    // Keep only current, rostered, skill-positions if needed (defensive guard rail)
    const POS = new Set(['QB', 'RB', 'WR', 'TE']);
    const filtered = json.players.filter(p =>
      POS.has(p.pos) &&
      p.team && p.team !== 'FA' && p.team !== 'RET'
    );

    return { players: filtered, as_of: json.as_of };
  } catch {
    return null;
  }
}

export async function createQuickSession(): Promise<string> {
  const sessionId = nanoid();
  const key = `draft-session:${sessionId}`;

  // 1) Try to use live snapshot
  const snap = await getLatestSnapshot();

  let playersRecord: Record<string, any> = {};
  let adpMap: Record<string, number> = {};
  let meta = { adpAsOf: 'sample' as string | undefined };

  if (snap && snap.players.length >= 100) {
    playersRecord = Object.fromEntries(snap.players.map(p => [p.id, p]));
    for (const p of snap.players) {
      if (typeof p.adp === 'number' && isFinite(p.adp)) {
        adpMap[p.id] = p.adp;
      }
    }
    meta.adpAsOf = snap.as_of || 'snapshot';
  } else {
    // 2) Fallback to bundled sample
    playersRecord = Object.fromEntries((PLAYERS_FALLBACK as any[]).map((p: any) => [p.id, p]));
    adpMap = ADP_FALLBACK as any;
    meta.adpAsOf = 'sample';
  }

  // 3) Seed the offline session state
  const state = {
    sessionId,
    config: DEFAULT_CONFIG,
    players: playersRecord,
    adp: adpMap,
    drafted: [] as any[],
    queue: [] as string[],
    targets: [] as string[],
    roster: { QB: [], RB: [], WR: [], TE: [], FLEX: [], Bench: [] } as Record<string, string[]>,
    selectedId: undefined as string | undefined,
    currentPickOverall: 1,
    datasetsMeta: meta,
    stateReady: true,
    // keep parity with store shape
    isOnline: false,
    myTeamId: undefined as string | undefined,
    localPickStartedAt: Date.now(),
  };

  localStorage.setItem(key, JSON.stringify(state));
  return sessionId;
}
