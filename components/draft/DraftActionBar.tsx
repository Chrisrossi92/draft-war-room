'use client'
import { exportCsv } from '@/lib/exportCsv'
import { useDraftStore } from '@/store/useDraftStore'

export default function DraftActionBar({
  selectedId, onDraftToMe, onMarkDraftedElsewhere
}:{
  selectedId?: string;
  onDraftToMe: ()=>void;
  onMarkDraftedElsewhere: ()=>void;
}) {
  const undo = useDraftStore(s => s.undoLastPick)
  const state = useDraftStore(s => ({
    drafted: s.drafted, players: s.players, sessionId: s.sessionId
  }))

  return (
    <div className="sticky bottom-2 flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 backdrop-blur">
      <div className="text-sm text-zinc-400">
        Selected: <span className="font-medium text-zinc-200">{selectedId ?? '—'}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={undo} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700">
          Undo
        </button>
        <button
          onClick={()=>exportCsv(state.drafted, state.players, state.sessionId ?? 'session')}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
        >
          Export CSV
        </button>
        <button
          disabled={!selectedId}
          onClick={onMarkDraftedElsewhere}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50"
        >
          Mark Drafted
        </button>
        <button
          disabled={!selectedId}
          onClick={onDraftToMe}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          Draft to Me
        </button>
      </div>
    </div>
  )
}
