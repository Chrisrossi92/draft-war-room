'use client';

import { useMemo } from 'react';
import { useDraftStore } from '@/store/useDraftStore';

/**
 * RosterPanel
 * - Offline (Quick Draft): shows local roster from store.roster
 * - Online lobby: if you've claimed a team (myTeamId), it derives your roster
 *   from the global drafted[] and players map, grouped by position.
 */
export default function RosterPanel() {
  const cfg = useDraftStore(s => s.config);
  const players = useDraftStore(s => s.players);
  const drafted = useDraftStore(s => s.drafted);
  const localRoster = useDraftStore(s => s.roster);
  const myTeamId = useDraftStore(s => s.myTeamId);

  const isOnlineLobby = !!cfg && !cfg.name?.includes('Quick Draft');

  // Derive online roster from drafted picks (your claimed team only)
  const onlineRoster = useMemo(() => {
    if (!isOnlineLobby || !myTeamId) return null;

    // Collect playerIds for my team in draft order
    const myPicks = drafted
      .filter(p => p.teamId === myTeamId)
      .map(p => p.playerId);

    // Group by player position
    const byPos: Record<string, string[]> = {
      QB: [], RB: [], WR: [], TE: [], FLEX: [], Bench: [],
    };

    for (const pid of myPicks) {
      const pl = players[pid];
      if (!pl) continue;

      // Try to fill native position first
      const cap = cfg?.roster?.[pl.pos as keyof typeof cfg.roster] ?? 0;
      const filled = byPos[pl.pos]?.length ?? 0;
      if (filled < cap) {
        byPos[pl.pos] = [...(byPos[pl.pos] || []), pid];
        continue;
      }

      // Try FLEX (RB/WR/TE)
      if (pl.pos === 'RB' || pl.pos === 'WR' || pl.pos === 'TE') {
        const flexCap = cfg?.roster?.FLEX ?? 0;
        const flexFilled = byPos.FLEX.length;
        if (flexFilled < flexCap) {
          byPos.FLEX = [...byPos.FLEX, pid];
          continue;
        }
      }

      // Else Bench
      byPos.Bench = [...byPos.Bench, pid];
    }

    return byPos;
  }, [isOnlineLobby, myTeamId, drafted, players, cfg?.roster]);

  const rosterToRender = isOnlineLobby && onlineRoster ? onlineRoster : localRoster;

  const cell = (slot: string, ids: string[] | undefined) => (
    <div key={slot} className="rounded-lg border border-zinc-800 p-2">
      <div className="text-xs uppercase text-zinc-400">{slot}</div>
      <ul className="mt-1 space-y-1">
        {(ids && ids.length > 0)
          ? ids.map(pid => {
              const p = players[pid];
              const label = p ? `${p.name} · ${p.team} · ${p.pos}` : pid;
              return <li key={pid} className="text-sm">{label}</li>;
            })
          : <li className="text-zinc-500">—</li>}
      </ul>
    </div>
  );

  // Render slots in a consistent order
  const order = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'Bench'];

  return (
    <div className="rounded-xl border border-zinc-800">
      <div className="border-b border-zinc-800 p-3 flex items-center justify-between">
        <h3 className="font-semibold">My Roster</h3>
        <span className="text-xs text-zinc-500">
          {isOnlineLobby
            ? (myTeamId ? 'online · claimed' : 'online · unclaimed')
            : 'offline'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 text-sm">
        {order.map(slot => cell(slot, rosterToRender?.[slot]))}
      </div>
    </div>
  );

}