'use client'
import PlayerRow from './PlayerRow'
import { Player } from '@/store/types'
import { useDraftStore } from '@/store/useDraftStore'
import { useMemo, useState } from 'react'

export default function BestAvailablePanel({
  list,
  selectedId,
  onSelect
}:{
  list: Player[];
  selectedId?: string;
  onSelect: (id: string)=>void;
}) {
  const adp = useDraftStore(s => s.adp)
  const queueAdd = useDraftStore(s => s.queueAdd)

  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase()
    if (!lc) return list
    return list.filter(p =>
      p.name.toLowerCase().includes(lc) ||
      p.team.toLowerCase().includes(lc) ||
      p.pos.toLowerCase().includes(lc)
    )
  }, [q, list])

  return (
    <div className="rounded-xl border border-zinc-800">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 p-3">
        <h2 className="text-lg font-semibold">Best Available</h2>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search players…"
          className="w-56 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm outline-none"
        />
      </div>
      <ul className="max-h-[70vh] divide-y divide-zinc-900 overflow-auto">
        {filtered.map(p => (
          <PlayerRow
            key={p.id}
            player={p}
            adpValue={adp[p.id]}
            selected={selectedId===p.id}
            onClick={()=>onSelect(p.id)}
            onQueue={()=>queueAdd(p.id)}
          />
        ))}
      </ul>
    </div>
  )
}

