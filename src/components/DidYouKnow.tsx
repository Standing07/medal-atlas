import { useMemo, useState } from 'react'
import type { Fact } from '../lib/facts'

/** 「你知道嗎？」抽卡：每按一次翻一張新卡 */
export default function DidYouKnow({ facts }: { facts: Fact[] }) {
  // 每次開頁隨機排序，但中華台北冬季奧林匹克運動會那張固定放第一張
  const deck = useMemo(() => {
    const first = facts.filter((f) => f.text.includes('冬季奧林匹克運動會，到'))
    const rest = facts.filter((f) => !first.includes(f))
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rest[i], rest[j]] = [rest[j], rest[i]]
    }
    return [...first, ...rest]
  }, [facts])
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  if (!deck.length) return null
  const f = deck[i % deck.length]
  const draw = () => {
    setFlip(true)
    setTimeout(() => {
      setI((x) => x + 1)
      setFlip(false)
    }, 220)
  }
  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-amber-900">💡 你知道嗎？</h2>
        <span className="text-xs text-amber-800/70">
          第 {(i % deck.length) + 1} / {deck.length} 張
        </span>
      </div>
      <div
        className="mt-3 min-h-24 rounded-xl bg-white p-4 shadow-sm ring-1 ring-amber-100 transition-transform duration-200"
        style={{ transform: flip ? 'rotateY(90deg)' : 'rotateY(0deg)' }}
        aria-live="polite"
      >
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">{f.tag}</span>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-800">{f.text}</p>
        <p className="mt-2 text-[11px] text-stone-400">
          來源：{f.url ? <a className="underline" href={f.url} target="_blank" rel="noreferrer">{f.source}</a> : f.source}
        </p>
      </div>
      <button
        type="button"
        onClick={draw}
        className="mt-3 rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-amber-600"
      >
        🔄 再抽一張
      </button>
    </section>
  )
}
