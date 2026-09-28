import { useState } from 'react'
import { analyticsEnabled, setConsent, storedConsent } from '../lib/analytics'

/** 底部小橫條：詢問是否同意 Google Analytics 使用 cookie 統計瀏覽人數 */
export default function ConsentBar() {
  const [open, setOpen] = useState(() => analyticsEnabled() && storedConsent() === null)
  if (!open) return null
  const choose = (v: 'granted' | 'denied') => {
    setConsent(v)
    setOpen(false)
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <p className="flex-1 text-stone-600">本站用 Google Analytics 統計瀏覽人數，是否同意使用 cookie？不同意也能正常瀏覽。</p>
        <button onClick={() => choose('denied')} className="rounded-full px-3 py-1.5 text-stone-600 hover:bg-stone-100">
          不要
        </button>
        <button onClick={() => choose('granted')} className="rounded-full bg-stone-900 px-4 py-1.5 text-white">
          同意
        </button>
      </div>
    </div>
  )
}
