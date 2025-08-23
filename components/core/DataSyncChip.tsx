// FILE: components/core/DataSyncChip.tsx
'use client'
import { useDraftStore } from '@/store/useDraftStore'
export default function DataSyncChip() {
const meta = useDraftStore(s => s.datasetsMeta)
return (
<span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
Cached • {meta?.adpAsOf ?? 'sample'}
</span>
)
}