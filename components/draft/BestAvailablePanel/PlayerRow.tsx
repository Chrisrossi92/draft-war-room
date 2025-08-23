'use client'
import { Player } from '@/store/types'
import clsx from 'clsx'

export default function PlayerRow({
  player, adpValue, selected, onClick, onQueue
}:{
  player: Player;
  adpValue?: number;
  selected?: boolean;
  onClick: ()=>void;
  onQueue: ()=>void;
}) {
  return (
    <li
      onClick={onClick}
      className={clsx(
        'flex cursor-pointer items-center justify-between p-3 hover:bg-zinc-900',
        selected && 'bg-zinc-900'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <div>
          <div className="font-medium">{player.name}</div>
          <div className="text-xs text-zinc-400">
            {player.team} • {player.pos} • Bye {player.bye}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={(e)=>{ e.stopPropagation(); onQueue(); }}
          className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
          aria-label="Add to queue"
          title="Add to queue"
        >
          ☆ Queue
        </button>
        <div className="text-right text-sm text-zinc-300">
          ADP {adpValue ?? '—'}
        </div>
      </div>
    </li>
  )
}
