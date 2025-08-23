// FILE: components/draft/RightRail/QueueTargetsPanel.tsx
'use client'
import { useDraftStore } from '@/store/useDraftStore'


export default function QueueTargetsPanel() {
const queue = useDraftStore(s => s.queue)
const remove = useDraftStore(s => s.queueRemove)


return (
<div className="rounded-xl border border-zinc-800">
<div className="border-b border-zinc-800 p-3"><h3 className="font-semibold">My Queue</h3></div>
<ul className="max-h-64 overflow-auto">
{queue.length===0 && <li className="p-3 text-sm text-zinc-400">No players queued.</li>}
{queue.map(id => (
<li key={id} className="flex items-center justify-between p-3 text-sm">
<span>{id}</span>
<button className="text-emerald-400" onClick={()=>remove(id)}>remove</button>
</li>
))}
</ul>
</div>
)
}