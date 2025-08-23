'use client';

import { useEffect, useState } from 'react';
import { useDraftStore } from '@/store/useDraftStore';
import { getOrCreateClaimToken } from '@/lib/claimToken';

type TeamRow = {
  id: string;
  name: string;
  slot: number;
  is_bot: boolean;
  claimed_token: string | null;
};

export default function TeamClaimList({ sessionId }: { sessionId: string }) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const myTeamId = useDraftStore((s) => s.myTeamId);
  const setMyTeam = useDraftStore((s) => s.setMyTeam);

  const refresh = async () => {
    const res = await fetch(`/api/teams/list?sessionId=${sessionId}`);
    const json = await res.json();
    setTeams(json?.data ?? []);
  };

  useEffect(() => {
    refresh();
  }, [sessionId]);

  const token = typeof window !== 'undefined' ? getOrCreateClaimToken(sessionId) : '';

  return (
    <div className="rounded-xl border border-zinc-800">
      <div className="border-b border-zinc-800 p-3">
        <h3 className="font-semibold">Teams</h3>
      </div>
      <ul className="max-h-64 overflow-auto">
        {teams.map((t) => {
          const mine = myTeamId === t.id;
          const claimed = !!t.claimed_token;
          return (
            <li key={t.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-medium">Slot {t.slot}: {t.name}</div>
                <div className="text-xs text-zinc-500">
                  {claimed ? (mine ? 'claimed by you' : 'claimed') : 'unclaimed'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!claimed && (
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/teams/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId, teamId: t.id, token }),
                      });
                      const json = await res.json();
                      if (!res.ok) return alert(json?.error ?? 'Claim failed');
                      setMyTeam(t.id);
                      refresh();
                    }}
                    className="rounded-lg bg-zinc-800 px-3 py-2 hover:bg-zinc-700"
                  >
                    Claim
                  </button>
                )}
                {mine && <span className="text-emerald-400">You</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

