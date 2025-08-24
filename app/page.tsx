'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import BrandBadge from '@/components/core/BrandBadge';
import DataSyncChip from '@/components/core/DataSyncChip';
import { createQuickSession } from '@/lib/createQuickSession';
import { refreshPlayersFromServer, loadPlayersIntoStore } from '@/lib/data/loadPlayers';

export default function Page() {
  const router = useRouter();

  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState('');

  const handleQuickDraft = async () => {
    const sessionId = await createQuickSession();
    router.push(`/draft/${sessionId}`);
  };

  const handleCreateLobby = async () => {
    try {
      setCreating(true);
      const res = await fetch('/api/lobby/create', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create lobby');
      router.push(`/draft/${json.sessionId}`);
    } catch (e: any) {
      alert(e.message || 'Create lobby failed');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    try {
      setJoining(true);
      const res = await fetch('/api/lobby/join', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Lobby not found');
      router.push(`/draft/${json.sessionId}`);
    } catch (e: any) {
      alert(e.message || 'Join failed');
    } finally {
      setJoining(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setRefreshing(true);
      await refreshPlayersFromServer();            // fetch + snapshot in Supabase
      const n = await loadPlayersIntoStore();      // load latest snapshot into store
      alert(`Loaded ${n} players.`);
    } catch (e: any) {
      alert(e?.message ?? 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="space-y-8">
      <header className="flex items-center justify-between">
        <BrandBadge />
        <DataSyncChip />
      </header>

      <section className="rounded-2xl border border-zinc-800 p-6">
        <h1 className="text-2xl font-semibold">Draft War Room</h1>
        <p className="mt-2 text-zinc-400">
          Quick offline mocks or an online lobby with realtime picks. Refresh the player pool whenever you like.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleQuickDraft}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
          >
            Quick Draft (offline)
          </button>

          <button
            onClick={handleCreateLobby}
            disabled={creating}
            className="rounded-xl bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create Lobby'}
          </button>

          <div className="flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Join code"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
            <button
              onClick={handleJoin}
              disabled={joining}
              className="rounded-xl bg-zinc-800 px-4 py-2 hover:bg-zinc-700 disabled:opacity-50"
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
          </div>

          <button
            onClick={handleRefreshData}
            disabled={refreshing}
            className="rounded-xl bg-zinc-800 px-4 py-2 hover:bg-zinc-700 disabled:opacity-50"
            title="Fetch latest players/ADP from Sleeper and load into the app"
          >
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>
      </section>
    </main>
  );
}

