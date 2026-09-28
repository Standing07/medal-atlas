import { fmt } from '../lib/data'

export const MEDAL = {
  gold: { zh: '金', color: '#d4a106' },
  silver: { zh: '銀', color: '#9aa1ab' },
  bronze: { zh: '銅', color: '#b0703c' },
} as const

export function Dot({ kind, className = '' }: { kind: keyof typeof MEDAL; className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ background: MEDAL[kind].color }}
      aria-hidden
    />
  )
}

/** 一行式「● 3 金 ● 7 銀 ● 19 銅」 */
export function MedalLine({ g, s, b, className = '' }: { g: number; s: number; b: number; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {(
        [
          ['gold', g],
          ['silver', s],
          ['bronze', b],
        ] as const
      ).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1">
          <Dot kind={k} />
          <span className="font-semibold tabular-nums">{fmt(v)}</span>
          <span className="text-stone-500">{MEDAL[k].zh}</span>
        </span>
      ))}
    </span>
  )
}

/** 正負變化，正數綠、負數紅，附箭頭（不只靠顏色） */
export function Delta({ v, digits = 0, suffix = '' }: { v: number; digits?: number; suffix?: string }) {
  const r = Number(v.toFixed(digits))
  if (r === 0) return <span className="text-stone-400">±0{suffix}</span>
  return (
    <span className={r > 0 ? 'text-emerald-700' : 'text-rose-700'}>
      {r > 0 ? '▲' : '▼'}
      {fmt(Math.abs(r), digits)}
      {suffix}
    </span>
  )
}
