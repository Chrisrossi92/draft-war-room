'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/draft/TopBar';
import BestAvailablePanel from '@/components/draft/BestAvailablePanel';
import QueueTargetsPanel from '@/components/draft/RightRail/QueueTargetsPanel';
import RosterPanel from '@/components/draft/RightRail/RosterPanel';
import DraftActionBar from '@/components/draft/DraftActionBar';
import TeamClaimList from '@/components/draft/TeamClaimList';
import AutoTimer from '@/components/draft/AutoTimer';
import PickBoardModal from '@/components/draft/modals/PickBoardModal';
import { useDraftStore } from '@/store/useDraftStore';
import { fetchSession } from '@/lib/fetchSession';
import { subscribeToSession } from '@/lib/realtime';
import { getOrCreateClaimToken } from '@/lib/claimToken';
import PLAYERS_JSON from '@/data/players.sample.json';
import ADP_JSON from '@/data/adp.sample.json';
import SurvivabilityPanel from '@/components/draft/RightRail/SurvivabilityPanel';


function OnlineControls({
  sessionId,
  selectedId,
  bestCandidates,
  autoClaimed,
  setAutoClaimed,
  onOpenBoard,
}: {
  sessionId: string;
  selectedId?: string;
  bestCandidates: string[];
  autoClaimed: boolean;
  setAutoClaimed: (v: boolean) => void;
  onOpenBoard: () => void;
}) {
  const [slotInput, setSlotInput] = useState<string>('');
  const myTeamId = useDraftStore((s) => s.myTeamId);
  const setMyTeam = useDraftStore((s) => s.setMyTeam);

  const ensureClaim = async (): Promise<string | null> => {
    if (myTeamId) return myTeamId;
    const slot = Number(slotInput || '0');
    if (!slot) {
      alert('Enter your team slot # or claim from the Teams panel first.');
      return null;
    }
    const res = await fetch(`/api/teams/by-slot?sessionId=${sessionId}&slot=${slot}`);
    const { data, error } = await res.json();
    if (error || !data) {
      alert('Team not found for that slot.');
      return null;
    }
    const token = getOrCreateClaimToken(sessionId);
    const claim = await fetch('/api/teams/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, teamId: data.id, token }),
    });
    const j = await claim.json();
    if (!claim.ok) {
      alert(j?.error ?? 'Claim failed');
      return null;
    }
    setMyTeam(data.id);
    return data.id as string;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 p-3">
      <div className="text-sm text-zinc-400">Online Lobby</div>

      <input
        value={slotInput}
        onChange={(e) => setSlotInput(e.target.value)}
        placeholder="Your team slot #"
        className="w-40 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm"
      />

      <button
        onClick={async () => {
          const teamId = await ensureClaim();
          if (teamId) alert('Team claimed.');
        }}
        className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
      >
        Claim by Slot
      </button>

      <button
        onClick={onOpenBoard}
        className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
        title="Open draft board"
      >
        Board
      </button>

      <button
        onClick={async () => {
          if (!selectedId) return alert('Select a player first');
          const teamId = myTeamId || (await ensureClaim());
          if (!teamId) return;

          const token = getOrCreateClaimToken(sessionId);
          const res = await fetch('/api/draft/pick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, teamId, playerId: selectedId, token }),
          });
          const json = await res.json();
          if (!res.ok) {
            alert(json?.error ?? 'Pick failed');
            return;
          }

          // optimistic bump
          const st = useDraftStore.getState();
          const n = (st.config?.order?.length ?? 10);
          const overall = st.currentPickOverall;
          const round = Math.ceil(overall / n);
          useDraftStore.setState({
            drafted: [...st.drafted, { round, overall, teamId, playerId: selectedId, madeBy: 'user' as const }],
            currentPickOverall: overall + 1,
            selectedId: undefined,
          });
        }}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
        disabled={!selectedId}
        title={myTeamId ? 'Claimed' : 'Will auto-claim then draft'}
      >
        Draft (online){myTeamId ? ' — claimed' : ''}
      </button>

      <button
        onClick={async () => {
          if (!bestCandidates.length) return alert('No candidates to choose from');
          const res = await fetch('/api/draft/auto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, candidates: bestCandidates }),
          });
          const json = await res.json();
          if (!res.ok) alert(json?.error ?? 'Auto pick failed');

          // local nudge
          const st = useDraftStore.getState();
          useDraftStore.setState({ currentPickOverall: st.currentPickOverall + 1 });
        }}
        className="rounded-lg bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600"
      >
        Auto (bot)
      </button>

      <button
        onClick={async () => {
          const res = await fetch('/api/draft/undo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          const json = await res.json();
          if (!res.ok) alert(json?.error ?? 'Undo failed');

          // local nudge
          const st = useDraftStore.getState();
          useDraftStore.setState({
            drafted: st.drafted.slice(0, -1),
            currentPickOverall: Math.max(1, st.currentPickOverall - 1),
          });
        }}
        className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
      >
        Undo (commish)
      </button>

      <button
        onClick={() => setAutoClaimed(!autoClaimed)}
        className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
        title="Auto-pick for claimed teams when timer expires"
      >
        Auto for claimed: {autoClaimed ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

export default function DraftRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const stateReady = useDraftStore((s) => s.stateReady);
  const initFromLocal = useDraftStore((s) => s.initFromLocal);
  const setOnline = useDraftStore((s) => s.setOnline);
  const config = useDraftStore((s) => s.config);
  const players = useDraftStore((s) => s.players);
  const adp = useDraftStore((s) => s.adp);
  const drafted = useDraftStore((s) => s.drafted);
  const select = useDraftStore((s) => s.select);
  const selectedId = useDraftStore((s) => s.selectedId);
  const [autoClaimed, setAutoClaimed] = useState(true);
  const [boardOpen, setBoardOpen] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      if (!sessionId) return;

      try {
        const { session, picks } = await fetchSession(sessionId as string);
        if (session) {
          useDraftStore.setState({
            sessionId: session.id,
            config: session.config,
            drafted: (picks ?? []).map((p: any) => ({
              round: p.round,
              overall: p.overall,
              teamId: p.team_id,
              playerId: p.player_id,
              madeBy: p.made_by,
            })),
            currentPickOverall: session.current_pick,
            stateReady: true,
            isOnline: true,
          });

          if (Object.keys(useDraftStore.getState().players).length === 0) {
            const rec = Object.fromEntries((PLAYERS_JSON as any[]).map((p: any) => [p.id, p]));
            useDraftStore.setState({ players: rec, adp: ADP_JSON as any });
          }

          unsubscribe = subscribeToSession(session.id, {
            onPick: (row) => {
              const d = useDraftStore.getState().drafted;
              useDraftStore.setState({
                drafted: [
                  ...d,
                  { round: row.round, overall: row.overall, teamId: row.team_id, playerId: row.player_id, madeBy: row.made_by },
                ],
                currentPickOverall: row.overall + 1,
              });
            },
            onSession: (row) => {
              useDraftStore.setState({ currentPickOverall: row.current_pick });
            },
          });

          return;
        }
      } catch {
        // ignore → fall back to local
      }

      setOnline(false);
      initFromLocal(sessionId as string);
    })();

    return () => { if (unsubscribe) unsubscribe(); };
  }, [sessionId, initFromLocal, setOnline]);

  const bestList = useMemo(() => {
    const taken = new Set(drafted.map((p) => p.playerId));
    return Object.values(players)
      .filter((p) => !taken.has(p.id))
      .sort((a, b) => (adp[a.id] ?? 9999) - (adp[b.id] ?? 9999))
      .slice(0, 60);
  }, [players, adp, drafted]);

  const bestIds = useMemo(() => bestList.map((p) => p.id), [bestList]);

  if (!stateReady && !config) return <div className="p-6">Loading draft session…</div>;

  // Commish force pick from the board
  const handleForcePick = async (teamId: string, playerId: string) => {
    const token = getOrCreateClaimToken(sessionId as string); // any token works for commish in dev
    const res = await fetch('/api/draft/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, teamId, playerId, token }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json?.error ?? 'Force pick failed');

    // optimistic
    const st = useDraftStore.getState();
    const n = (st.config?.order?.length ?? 10);
    const overall = st.currentPickOverall;
    const round = Math.ceil(overall / n);
    useDraftStore.setState({
      drafted: [...st.drafted, { round, overall, teamId, playerId, madeBy: 'commish' as const }],
      currentPickOverall: overall + 1,
    });
  };

  return (
    <main className="space-y-4">
      <TopBar />

      {/* Auto-timer */}
      <AutoTimer
        sessionId={sessionId as string}
        bestCandidates={bestIds}
        autoClaimed={autoClaimed}
        claimedGraceSec={0}
      />

      <OnlineControls
        sessionId={sessionId as string}
        selectedId={selectedId}
        bestCandidates={bestIds}
        autoClaimed={autoClaimed}
        setAutoClaimed={setAutoClaimed}
        onOpenBoard={() => setBoardOpen(true)}
      />

      <PickBoardModal
        sessionId={sessionId as string}
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        onForcePick={handleForcePick}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <section className="md:col-span-8">
          <BestAvailablePanel list={bestList} selectedId={selectedId} onSelect={select} />
        </section>
        <aside className="md:col-span-4 space-y-4">
          <TeamClaimList sessionId={sessionId as string} />
          <QueueTargetsPanel />
          <RosterPanel />
          <aside className="md:col-span-4 space-y-4">
  <TeamClaimList sessionId={sessionId as string} />
  <QueueTargetsPanel />
  <RosterPanel />
  <SurvivabilityPanel sessionId={sessionId as string} selectedId={selectedId} />
</aside>
        </aside>
      </div>

      <DraftActionBar
        selectedId={selectedId}
        onDraftToMe={() => {
          const st = useDraftStore.getState();
          if (st?.isOnline) return alert('Use “Draft (online)” above in lobbies.');
          selectedId && st.draftToMe(selectedId);
        }}
        onMarkDraftedElsewhere={() =>
          selectedId && useDraftStore.getState().markDraftedElsewhere(selectedId)
        }
      />
    </main>
  );
}








