import { useEffect } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import ConsentBar from './ConsentBar'
import { initAnalytics, trackPage } from '../lib/analytics'

// 三個維度（國家、賽事、運動）共用同一個探索頁，只是預設篩選不同
const NAV = [
  { to: '/', label: '即時獎牌數', dim: 'live' },
  { to: '/explore?c=TPE&g=summer-olympics', label: '國家', dim: 'country' },
  { to: '/explore?g=summer-olympics&y=2024', label: '賽事', dim: 'games' },
  { to: '/explore?g=summer-olympics&sp=baseball', label: '運動', dim: 'sport' },
  { to: '/about', label: '資料來源', dim: 'about' },
]

function currentDim(pathname: string, search: string) {
  if (pathname === '/') return 'live'
  if (pathname === '/about') return 'about'
  const p = new URLSearchParams(search)
  if (p.get('y')) return 'games'
  if (p.get('c')) return 'country'
  if (p.get('sp')) return 'sport'
  return 'games'
}

export default function Layout() {
  const loc = useLocation()
  const dim = currentDim(loc.pathname, loc.search)
  useEffect(() => {
    initAnalytics()
  }, [])
  useEffect(() => {
    trackPage()
  }, [loc.pathname, loc.search])
  return (
    <div className="min-h-screen">
      <ScrollRestoration />
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-stone-900">
            <span className="text-xl" aria-hidden>
              🏅
            </span>
            <span>運動賽事獎牌地圖</span>
            <span className="hidden text-xs font-normal text-stone-500 sm:inline">Medal Atlas</span>
          </NavLink>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 ${
                  dim === n.dim ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs leading-relaxed text-stone-500">
        獎牌數據整理自英文維基百科各屆獎牌表（CC BY-SA 4.0）；奧林匹克運動會另參考 Olympedia；進行中賽事以大會官方成績為準。
        本站為個人整理的開放資料專案，非任何賽會官方網站。
      </footer>
      <ConsentBar />
    </div>
  )
}
