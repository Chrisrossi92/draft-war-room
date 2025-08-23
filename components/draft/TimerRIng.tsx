// components/draft/TimerRing.tsx
'use client';

type Props = {
  /** seconds remaining (0..total) */
  remaining: number;
  /** total seconds for the clock (e.g., 60) */
  total: number;
  /** optional size in px */
  size?: number;
};

export default function TimerRing({ remaining, total, size = 40 }: Props) {
  const radius = (size - 6) / 2; // 3px stroke each side
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(total, remaining));
  const pct = total > 0 ? clamped / total : 0;
  const dash = circumference * pct;

  // color hint: under 10s -> red, under 25% -> amber, else emerald
  const color =
    clamped <= 10 ? 'stroke-red-500' :
    pct <= 0.25 ? 'stroke-amber-500' :
    'stroke-emerald-500';

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`Time left ${clamped}s`}
      title={`Time left ${clamped}s`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-zinc-800"
          strokeWidth={6}
          fill="none"
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${color} transition-all duration-300`}
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="pointer-events-none absolute text-[10px] tabular-nums text-zinc-200">
        {String(Math.floor(clamped / 60)).padStart(2, '0')}:{String(clamped % 60).padStart(2, '0')}
      </span>
    </div>
  );
}
