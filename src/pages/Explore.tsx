import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FilterBar, { type Filters } from '../components/FilterBar'
import TrendChart from '../components/TrendChart'
import Flag from '../components/Flag'
import { Delta, MedalLine, MEDAL } from '../components/Medals'
import { Toggle } from './Live'
import TaiwanNote from '../components/TaiwanNote'
import ShowMore, { topPlusFocus } from '../components/ShowMore'
import {
  editionLabel,
  editionTotals,
  loadEvents,
  loadMedals,
  loadPopulation,
  loadSports,
  populationOf,
  pct,
  previousEdition,
  SERIES_NAME,
  standings,
  type Edition,
  type MedalsData,
  type PopulationData,
  type SportEvent,
  type RankBy,
  type Row,
  type Series,
  type SportsData,
  type Standing,
} from '../lib/data'
import { canonical, flagOf, nameOf, PREDECESSORS } from '../lib/countries.js'
import { SPORT_ZH } from '../lib/sports.js'
import {
  editionStanding,
  hostEffects,
  medalsOf,
  milestones,
  nameHistory,
  recentSources,
  sportsInSeries,
  topSports,
} from '../lib/insights'

const sum3 = (v: number[]) => v[0] + v[1] + v[2]

/** 依「運動」篩選後的某屆資料（沒選運動就是總表） */
function rowsFor(sports: SportsData | undefined, series: Series, e: Edition, sp?: string): Row[] | null {
  if (!sp) return e.rows
  return sports?.editions[`${series.id}-${e.year}`]?.[sp] ?? null
}

export default function Explore() {
  const [data, setData] = useState<MedalsData>()
  const [sports, setSports] = useState<SportsData>()
  const [pop, setPop] = useState<PopulationData | null>(null)
  const [events, setEvents] = useState<SportEvent[]>([])
  const [params, setParams] = useSearchParams()
  const [rankBy, setRankBy] = useState<RankBy>('gold')

  useEffect(() => {
    loadMedals().then(setData)
    loadSports().then(setSports)
    loadPopulation().then(setPop)
    loadEvents().then(setEvents)
  }, [])

  const filters: Filters = {
    c: params.get('c')?.toUpperCase() || undefined,
    g: params.get('g') || 'summer-olympics',
    y: params.get('y') ? Number(params.get('y')) : undefined,
    sp: params.get('sp') || undefined,
  }
  const setFilters = (f: Filters) => {
    const p = new URLSearchParams()
    if (f.c) p.set('c', f.c)
    p.set('g', f.g)
    if (f.y) p.set('y', String(f.y))
    if (f.sp) p.set('sp', f.sp)
    setParams(p)
  }

  const countries = useMemo(() => {
    if (!data) return []
    const m = new Map<string, number>()
    for (const s of data.series)
      for (const e of s.editions)
        for (const [c] of e.rows) {
          const k = canonical(c, e.year)
          m.set(k, Math.max(m.get(k) ?? 0, e.year))
        }
    return [...m]
      .map(([key, y]) => ({ key, name: nameOf(key, y) }))
      .sort((a, b) => (a.key === 'TPE' ? -1 : b.key === 'TPE' ? 1 : a.name.localeCompare(b.name, 'zh-Hant')))
  }, [data])

  if (!data) return <p className="py-20 text-center text-stone-500">載入中…</p>
  const series = data.series.find((s) => s.id === filters.g) ?? data.series[0]
  const edition = filters.y ? series.editions.find((e) => e.year === filters.y) : undefined
  const sportList = sports ? sportsInSeries(sports, series, edition?.year) : []
  const sportsAvailable = sportList.length > 0

  return (
    <div className="space-y-5">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        countries={countries}
        series={data.series}
        sports={sportList}
        sportsAvailable={sportsAvailable}
      />
      {edition ? (
        <EditionView
          pop={pop}
          events={events}
          series={series}
          edition={edition}
          sports={sports}
          f={filters}
          rankBy={rankBy}
          setRankBy={setRankBy}
          setFilters={setFilters}
        />
      ) : filters.c ? (
        <CountryView all={data.series} series={series} sports={sports} pop={pop} events={events} f={filters} setFilters={setFilters} />
      ) : filters.sp ? (
        <SportView series={series} sports={sports} f={filters} setFilters={setFilters} />
      ) : (
        <SeriesView series={series} setFilters={setFilters} f={filters} />
      )}
    </div>
  )
}

// ---------- 摘要框 ----------

function Summary({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-5 shadow-sm">
      <h1 className="text-xl font-bold text-stone-900">{title}</h1>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

function Tiles({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((t) => (
        <div key={t.label} className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
          <p className="text-xs text-stone-500">{t.label}</p>
          <div className="mt-0.5 text-base font-bold text-stone-900">{t.value}</div>
          {t.sub && <div className="mt-0.5 text-xs text-stone-500">{t.sub}</div>}
        </div>
      ))}
    </div>
  )
}

function Facts({ items, title }: { items: string[]; title?: string }) {
  if (!items.length) return null
  return (
    <div className="rounded-xl bg-white p-3 text-sm ring-1 ring-stone-200">
      {title && <p className="mb-1 text-xs font-medium text-stone-500">{title}</p>}
      <ul className="list-disc space-y-0.5 pl-5 text-stone-700">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

function Country({ code, year }: { code: string; year?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Flag iso2={flagOf(code, year ?? 9999)} code={code} />
      {nameOf(code, year ?? 9999)}
    </span>
  )
}

// ---------- 某一屆 ----------

function EditionView({
  pop,
  events,
  series,
  edition,
  sports,
  f,
  rankBy,
  setRankBy,
  setFilters,
}: {
  pop: PopulationData | null
  events: SportEvent[]
  series: Series
  edition: Edition
  sports?: SportsData
  f: Filters
  rankBy: RankBy
  setRankBy: (r: RankBy) => void
  setFilters: (f: Filters) => void
}) {
  const rows = rowsFor(sports, series, edition, f.sp)
  const prev = previousEdition(series, edition.year)
  const prevRows = prev ? rowsFor(sports, series, prev, f.sp) : null
  const st = rows ? standings({ year: edition.year, rows }, rankBy) : []
  const prevSt = prevRows && prev ? new Map(standings({ year: prev.year, rows: prevRows }, rankBy).map((r) => [r.key, r])) : null
  const t = editionTotals(rows ?? [])
  const top = st[0]
  const hosts = hostEffects(series, edition)
  const sportName = f.sp ? SPORT_ZH[f.sp] : ''
  const cov = sports?.coverage[`${series.id}-${edition.year}`]
  const mine = f.c ? st.find((r) => r.key === f.c) : undefined
  const myPrev = f.c && prevSt ? prevSt.get(f.c) : undefined
  const bySport =
    f.c && !f.sp && sports?.editions[`${series.id}-${edition.year}`]
      ? Object.entries(sports.editions[`${series.id}-${edition.year}`])
          .map(([sp, r]) => ({ sp, m: medalsOf(r, f.c!, edition.year) }))
          .filter((x) => sum3(x.m) > 0)
          .sort((a, b) => b.m[0] - a.m[0] || sum3(b.m) - sum3(a.m))
      : []

  // 每百萬人獎牌數（人口取舉行年份，世界銀行；台灣用官方資料）
  const perM = new Map<string, number>()
  for (const r of st) {
    const p = populationOf(pop, r.flag, edition.held)
    if (p) perM.set(r.code, r.total / (p.value / 1e6))
  }
  const perMTop = [...perM].sort((a, b) => b[1] - a[1]).slice(0, 3)

  const facts: string[] = []
  if (f.c && !f.sp) {
    const s = editionStanding(series, edition, f.c)
    if (s) facts.push(s)
  }
  for (const h of hosts)
    if (!f.sp && h.before.length)
      facts.push(
        `地主效應：${h.name}本屆佔全部獎牌 ${pct(h.now.share)}，主辦前兩屆平均 ${pct(h.avgBeforeShare)}（${h.now.share >= h.avgBeforeShare ? '+' : '−'}${Math.abs((h.now.share - h.avgBeforeShare) * 100).toFixed(1)} 個百分點）。`,
      )

  return (
    <>
      <Summary
        title={
          <>
            {editionLabel(series.id, edition)}
            {f.sp && <span className="text-stone-500">・{sportName}</span>}
            {edition.live && <span className="ml-2 align-middle text-sm font-medium text-rose-600">● 進行中</span>}
          </>
        }
      >
        <Tiles
          items={[
            { label: '得牌國家／地區', value: `${st.length} 個`, sub: `頒出 ${t.gold} 金 ${t.silver} 銀 ${t.bronze} 銅` },
            top
              ? { label: '金牌最多', value: <Country code={top.code} year={edition.year} />, sub: `${top.gold} 金 ${top.silver} 銀 ${top.bronze} 銅` }
              : { label: '金牌最多', value: '—' },
            hosts[0]
              ? {
                  label: '地主',
                  value: <Country code={hosts[0].key} year={edition.year} />,
                  sub: `本屆 ${sum3(f.sp && rows ? medalsOf(rows, hosts[0].key, edition.year) : hosts[0].now.medals)} 面`,
                }
              : { label: '地主', value: '—' },
            f.c
              ? {
                  label: `${nameOf(f.c, edition.year)}${f.sp ? `・${sportName}` : ''}`,
                  value: mine ? <MedalLine g={mine.gold} s={mine.silver} b={mine.bronze} /> : '未得牌',
                  sub: mine ? (
                    <>
                      {rankBy === 'gold' ? '金牌榜' : '總獎牌榜'}第 {mine.rank} 名
                      {prev && <> ・vs 上屆 <Delta v={mine.total - (myPrev?.total ?? 0)} /> 面</>}
                    </>
                  ) : undefined,
                }
              : { label: '上一屆', value: prev ? `${prev.year} ${prev.city}` : '—', sub: prev ? '表格中比較名次與總數變化' : undefined },
          ]}
        />
        {perMTop.length > 0 && (
          <p className="text-xs text-stone-600">
            <b>每百萬人獎牌數最多：</b>
            {perMTop.map(([c, v]) => `${nameOf(c, edition.year)} ${fmtPerM(v)} 面`).join('、')}
            {f.c && perM.has(st.find((r) => r.key === f.c)?.code ?? '') &&
              `；${nameOf(f.c, edition.year)} ${fmtPerM(perM.get(st.find((r) => r.key === f.c)!.code)!)} 面`}
            <span className="text-stone-400">（人口：世界銀行／內政部，{edition.held} 年）</span>
          </p>
        )}
        <Facts items={facts} />
        <EventList list={events.filter((ev) => ev.series.includes(series.id) && ev.from <= edition.year && edition.year <= ev.to)} />
        {edition.live && (
          <p className="text-xs text-stone-500">
            這是網站最近一次更新時的快照。<Link to="/" className="text-blue-700 underline">到「即時獎牌數」看最新數字與上屆同進度比較 →</Link>
          </p>
        )}
      </Summary>

      {bySport.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-stone-900">{nameOf(f.c!, edition.year)}本屆獎牌來自哪些運動</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {bySport.map(({ sp, m }) => (
              <button
                key={sp}
                onClick={() => setFilters({ ...f, sp })}
                className="rounded-xl bg-stone-50 px-3 py-2 text-left text-sm ring-1 ring-stone-200 hover:bg-stone-100"
              >
                <span className="font-medium">{SPORT_ZH[sp] ?? sp}</span>
                <MedalLine g={m[0]} s={m[1]} b={m[2]} className="ml-2 text-xs" />
              </button>
            ))}
          </div>
          <CoverageNote ratio={cov?.ratio} live={edition.live} />
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-stone-900">{f.sp ? `${sportName}獎牌榜` : '獎牌榜'}</h2>
          <Toggle
            value={rankBy}
            onChange={setRankBy}
            options={[
              ['gold', '依金牌排'],
              ['total', '依總數排'],
            ]}
          />
        </div>
        {!rows ? (
          <p className="mt-3 text-sm text-stone-500">這一屆沒有「{sportName}」的分項資料。</p>
        ) : (
          <MedalTable st={st} prevSt={prevSt} totalGold={t.gold} perM={perM} highlight={f.c} onPick={(c) => setFilters({ ...f, c })} />
        )}
        {f.sp && <CoverageNote ratio={cov?.ratio} live={edition.live} />}
        <SourceLine series={series} edition={edition} />
        {edition.corrections?.map((c) => (
          <p key={c.code} className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
            ✎ {nameOf(c.code, edition.year)}：維基百科目前寫 {c.from.join('/')}，本站依官方紀錄更正為 {c.to.join('/')}（金/銀/銅）。{c.note}
            來源：
            <a className="underline" href={c.url} target="_blank" rel="noreferrer">
              {c.source}
            </a>
            （查證日 {c.checked}）
          </p>
        ))}
        {edition.disputed && (
          <p className="mt-2 text-xs text-amber-800">
            * 這一屆維基百科引用的各來源數字不一致（例如「81/88」），本站取第一個值，差異通常在幾面之內。
          </p>
        )}
      </section>
    </>
  )
}

function EventList({ list }: { list: SportEvent[] }) {
  if (!list.length) return null
  return (
    <div className="rounded-xl bg-white p-3 text-sm ring-1 ring-stone-200">
      <p className="mb-1 text-xs font-medium text-stone-500">特殊事件</p>
      <ul className="list-disc space-y-1 pl-5 text-stone-700">
        {list.map((ev) => (
          <li key={ev.id}>
            {ev.zh}{' '}
            <a className="text-xs text-stone-400 underline" href={ev.source} target="_blank" rel="noreferrer">
              來源
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CoverageNote({ ratio, live }: { ratio?: number; live?: boolean }) {
  if (ratio === undefined) return null
  if (ratio >= 0.9995 && !live) return null
  return (
    <p className="mt-2 text-xs text-stone-500">
      分項資料取自維基百科各運動頁面，加總涵蓋本屆 {pct(ratio)} 的獎牌
      {live ? '；進行中賽事的各運動頁更新較慢，會比總表少一些' : '；差額多半是禁藥改判後只更新在總表的獎牌'}。
    </p>
  )
}

function SourceLine({ series, edition }: { series: Series; edition: Edition }) {
  return (
    <p className="mt-2 text-xs text-stone-500">
      來源：
      <a className="underline" href={`https://en.wikipedia.org/w/index.php?oldid=${edition.src.revid}`} target="_blank" rel="noreferrer">
        維基百科〈{edition.src.title}〉
      </a>
      （版本日期 {edition.src.ts.slice(0, 10)}）
      {(series.id === 'summer-olympics' || series.id === 'winter-olympics') && (
        <>
          ；
          <a className="underline" href="https://www.olympedia.org" target="_blank" rel="noreferrer">
            Olympedia
          </a>
        </>
      )}
      。名次變化「▲」代表名次往前。
    </p>
  )
}

function MedalTable({
  st,
  prevSt,
  totalGold,
  perM,
  highlight,
  onPick,
}: {
  st: Standing[]
  prevSt: Map<string, Standing> | null
  totalGold: number
  perM: Map<string, number>
  highlight?: string
  onPick: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const shown = topPlusFocus(st, open, highlight)
  return (
    <>
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="border-b border-stone-200 text-xs text-stone-500">
          <tr>
            <th className="px-2 py-2 text-left font-medium">名次</th>
            <th className="px-2 py-2 text-left font-medium">國家／地區</th>
            {(['gold', 'silver', 'bronze'] as const).map((k) => (
              <th key={k} className="px-2 py-2 text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: MEDAL[k].color }} />
                  {MEDAL[k].zh}
                </span>
              </th>
            ))}
            <th className="px-2 py-2 text-right font-medium">總數</th>
            <th className="px-2 py-2 text-right font-medium">金牌佔比</th>
            {perM.size > 0 && <th className="px-2 py-2 text-right font-medium">每百萬人</th>}
            {prevSt && <th className="px-2 py-2 text-right font-medium">名次變化</th>}
            {prevSt && <th className="px-2 py-2 text-right font-medium">總數 vs 上屆</th>}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const p = prevSt?.get(r.key)
            return (
              <tr key={r.code} className={`border-b border-stone-100 ${r.key === highlight ? 'bg-blue-50/70' : ''}`}>
                <td className="px-2 py-1.5 tabular-nums text-stone-500">{r.rank}</td>
                <td className="px-2 py-1.5">
                  <button onClick={() => onPick(r.key)} className="inline-flex items-center gap-2 text-left hover:underline">
                    <Flag iso2={r.flag} code={r.code} />
                    {r.name}
                    {r.disputed && <span title="各來源數字不一，取維基列出的第一個值">*</span>}
                    {r.corrected && <span className="text-amber-700" title="本站依官方來源更正">✎</span>}
                    {r.host && <span className="rounded bg-stone-100 px-1 text-[10px] text-stone-500">地主</span>}
                  </button>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.gold}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.silver}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.bronze}</td>
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{r.total}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-stone-500">{totalGold ? pct(r.gold / totalGold) : '—'}</td>
                {perM.size > 0 && (
                  <td className="px-2 py-1.5 text-right tabular-nums text-stone-500">
                    {perM.has(r.code) ? fmtPerM(perM.get(r.code)!) : '—'}
                  </td>
                )}
                {prevSt && (
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {p ? <Delta v={p.rank - r.rank} /> : <span className="text-xs text-stone-400">上屆未得牌</span>}
                  </td>
                )}
                {prevSt && (
                  <td className="px-2 py-1.5 text-right tabular-nums">{p ? <Delta v={r.total - p.total} /> : <span className="text-stone-400">—</span>}</td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    <ShowMore total={st.length} shown={shown.length} open={open} onToggle={() => setOpen(!open)} />
    </>
  )
}

/** 每百萬人獎牌：很小的數字不要顯示成 0.00 */
const fmtPerM = (v: number) => (v < 0.01 ? '<0.01' : v.toFixed(v < 1 ? 2 : 1))

// ---------- 某國歷屆 ----------

type Metric = 'gold' | 'total' | 'share' | 'rank'
const METRICS: [Metric, string][] = [
  ['share', '金牌佔比'],
  ['gold', '金牌數'],
  ['total', '獎牌總數'],
  ['rank', '金牌榜名次'],
]

function historyOf(series: Series, sports: SportsData | undefined, sp: string | undefined, key: string) {
  return series.editions.map((e) => {
    const rows = rowsFor(sports, series, e, sp)
    if (!rows) return { e, row: null as Standing | null, share: 0, n: 0, has: false }
    const st = standings({ year: e.year, rows })
    const row = st.find((r) => r.key === key) ?? null
    const g = editionTotals(rows).gold
    return { e, row, share: row && g ? row.gold / g : 0, n: st.length, has: true }
  })
}

function CountryView({
  all,
  series,
  sports,
  pop,
  events,
  f,
  setFilters,
}: {
  all: Series[]
  series: Series
  sports?: SportsData
  pop: PopulationData | null
  events: SportEvent[]
  f: Filters
  setFilters: (f: Filters) => void
}) {
  const [metric, setMetric] = useState<Metric>('share')
  const [compare, setCompare] = useState<string[]>([])
  const key = f.c!
  const name = nameOf(key, 9999)
  const sportName = f.sp ? SPORT_ZH[f.sp] : ''
  const names = nameHistory(all, key)
  const hist = historyOf(series, sports, f.sp, key)
  const medalled = hist.filter((x) => x.row)
  const sums = medalled.reduce((t, x) => [t[0] + x.row!.gold, t[1] + x.row!.silver, t[2] + x.row!.bronze], [0, 0, 0])
  const hasSports = !!sports && sportsInSeries(sports, series).length > 0
  const tops = hasSports && !f.sp ? topSports(sports!, series, key).slice(0, 3) : []
  const recent = hasSports && !f.sp ? recentSources(sports!, series, key) : null
  const facts = f.sp ? [] : milestones(series, key)
  const preds = (PREDECESSORS as Record<string, string[]>)[key] ?? []
  const inOther = all.filter((s) => s.id !== series.id && s.editions.some((e) => e.rows.some(([c]) => canonical(c, e.year) === key)))
  const best = [...medalled].sort((a, b) => b.row!.gold - a.row!.gold || b.row!.total - a.row!.total)[0]
  const liveIn = medalled.some((x) => x.e.live)
  const lastM = [...medalled].reverse().find((x) => !x.e.live && populationOf(pop, x.row!.flag, x.e.held))
  const lastPop = lastM ? populationOf(pop, lastM.row!.flag, lastM.e.held) : null

  const val = (x: (typeof hist)[number]) => {
    if (!x.row) return null
    if (metric === 'gold') return x.row.gold
    if (metric === 'total') return x.row.total
    if (metric === 'share') return Math.round(x.share * 1000) / 10
    return x.row.gold > 0 ? x.row.rank : null
  }
  const lines = [key, ...compare].map((k) => ({ name: nameOf(k, 9999), values: (k === key ? hist : historyOf(series, sports, f.sp, k)).map(val) }))

  return (
    <>
      <Summary
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Flag iso2={flagOf(key, 9999)} code={key} className="text-3xl" />
            {name}・{SERIES_NAME[series.id]}
            {f.sp && <span className="text-stone-500">・{sportName}</span>}
          </span>
        }
      >
        {key === 'TPE' ? (
          <TaiwanNote />
        ) : (
          (names.length > 1 || preds.length > 0) && (
            <p className="text-sm text-stone-700">
              {names.length > 1 && (
                <>
                  <b>名稱：</b>
                  {[...new Map(names.map((n) => [n.name, n])).values()].map((n) => `${n.name}（${n.from}${n.to !== n.from ? `–${n.to}` : ''}）`).join(' → ')}
                </>
              )}
              {preds.length > 0 && (
                <span className="text-stone-500">
                  {names.length > 1 ? '；' : ''}前身：{preds.map((p) => nameOf(p)).join('、')}（不併入）
                </span>
              )}
            </p>
          )
        )}
        {medalled.length === 0 ? (
          <p className="text-sm text-stone-600">
            {name}在{SERIES_NAME[series.id]}{f.sp ? `的${sportName}` : ''}沒有得牌紀錄。
            {inOther.length > 0 && <>有得牌的賽事：{inOther.map((s) => SERIES_NAME[s.id]).join('、')}。</>}
          </p>
        ) : (
          <Tiles
            items={[
              {
                label: `歷屆累計${liveIn ? '（含進行中）' : ''}`,
                value: `${sum3(sums)} 面`,
                sub: <MedalLine g={sums[0]} s={sums[1]} b={sums[2]} />,
              },
              {
                label: '最佳一屆',
                value: best ? `${best.e.year} ${best.e.city}` : '—',
                sub: best ? `${best.row!.gold} 金・${best.row!.total} 面` : undefined,
              },
              ...(lastM && lastPop
                ? [
                    {
                      label: `每百萬人獎牌（${lastM.e.year}）`,
                      value: `${(lastM.row!.total / (lastPop.value / 1e6)).toFixed(2)} 面`,
                      sub: `人口 ${(lastPop.value / 1e6).toFixed(1)} 百萬（${key === 'TPE' ? '內政部' : '世界銀行'}）`,
                    },
                  ]
                : []),
              ...(tops.length
                ? [
                    {
                      label: `熱門運動 Top 3${liveIn ? '（含進行中）' : ''}`,
                      value: tops.map((t) => t.zh).join('、'),
                      sub: tops.map((t) => `${sum3(t.medals)} 面`).join('・'),
                    },
                  ]
                : []),
              ...(recent && recent.editions.length
                ? [
                    {
                      label: `近 6 年奪牌主力（${recent.editions.map((e) => e.year).join('、')}）`,
                      value: recent.list.slice(0, 3).map((t) => t.zh).join('、') || '—',
                      sub: recent.list
                        .slice(0, 3)
                        .map((t) => `${t.medals[0]} 金 ${sum3(t.medals)} 面`)
                        .join('・'),
                    },
                  ]
                : []),
            ]}
          />
        )}
        <Facts items={facts} title="紀錄" />
        <EventList
          list={events.filter(
            (ev) => ev.series.includes(series.id) && ev.codes.some((c) => c === key || canonical(c, ev.from) === key || preds.includes(c)),
          )}
        />
      </Summary>

      {medalled.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-stone-900">歷屆{METRICS.find((m) => m[0] === metric)![1]}</h2>
            <Toggle value={metric} onChange={setMetric} options={METRICS} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {[key, ...compare].map((k, i) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1">
                {nameOf(k, 9999)}
                {i > 0 && (
                  <button className="ml-1 text-stone-400 hover:text-stone-700" aria-label="移除" onClick={() => setCompare(compare.filter((c) => c !== k))}>
                    ✕
                  </button>
                )}
              </span>
            ))}
            {compare.length < 3 && (
              <select
                className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                value=""
                onChange={(e) => e.target.value && setCompare([...compare, e.target.value])}
              >
                <option value="">＋ 加入比較</option>
                {[...preds, ...topKeys(series)].filter((k, i, a) => k !== key && !compare.includes(k) && a.indexOf(k) === i).map((k) => (
                  <option key={k} value={k}>
                    {nameOf(k, 9999)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <TrendChart
            editions={series.editions}
            lines={lines}
            percent={metric === 'share'}
            inverse={metric === 'rank'}
            format={(v) => (v == null ? '未得牌／未參賽' : metric === 'share' ? `${v}%` : metric === 'rank' ? `第 ${v} 名` : `${v} 面`)}
          />
          <p className="text-xs text-stone-500">
            金牌佔比＝該國金牌 ÷ 該屆頒出的全部金牌；項目數逐屆增加，用佔比才能公平比較不同年代。斷點代表該屆未參賽或未得牌。
          </p>
        </section>
      )}

      {medalled.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <h2 className="px-5 pt-5 font-semibold text-stone-900">逐屆成績</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-stone-200 text-xs text-stone-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">屆次</th>
                  <th className="px-2 py-2 text-right font-medium">金</th>
                  <th className="px-2 py-2 text-right font-medium">銀</th>
                  <th className="px-2 py-2 text-right font-medium">銅</th>
                  <th className="px-2 py-2 text-right font-medium">總數</th>
                  <th className="px-2 py-2 text-right font-medium">金牌佔比</th>
                  <th className="px-3 py-2 text-right font-medium">金牌榜名次</th>
                </tr>
              </thead>
              <tbody>
                {[...hist].reverse().map(({ e, row, share, n, has }) => (
                  <tr key={e.year} className={`border-b border-stone-100 ${row ? '' : 'text-stone-400'}`}>
                    <td className="px-3 py-1.5">
                      <button className="text-left hover:underline" onClick={() => setFilters({ ...f, y: e.year })}>
                        {editionLabel(series.id, e, false)}
                      </button>
                      {row && row.code !== key && <span className="ml-1 text-xs text-stone-500">（以「{row.name}」參賽）</span>}
                      {row?.corrected && <span className="ml-1 text-xs text-amber-700">✎ 依官方紀錄更正</span>}
                    </td>
                    {row ? (
                      <>
                        <td className="px-2 py-1.5 text-right tabular-nums">{row.gold}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{row.silver}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{row.bronze}</td>
                        <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{row.total}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{pct(share)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{row.gold > 0 ? `${row.rank} / ${n}` : '—（無金牌）'}</td>
                      </>
                    ) : (
                      <td colSpan={6} className="px-2 py-1.5 text-right text-xs">
                        {has ? '未得牌或未參賽' : `這一屆沒有${sportName}`}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

/** 該系列歷來金牌最多的國家（給「加入比較」選單用） */
function topKeys(series: Series, n = 15) {
  const m = new Map<string, number>()
  for (const e of series.editions) for (const [c, g] of e.rows) m.set(canonical(c, e.year), (m.get(canonical(c, e.year)) ?? 0) + g)
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)
}

// ---------- 某運動歷屆 ----------

function SportView({ series, sports, f, setFilters }: { series: Series; sports?: SportsData; f: Filters; setFilters: (f: Filters) => void }) {
  const [open, setOpen] = useState(false)
  const sp = f.sp!
  const focus = 'TPE'
  const eds = series.editions.filter((e) => rowsFor(sports, series, e, sp))
  const acc = new Map<string, [number, number, number]>()
  for (const e of eds)
    for (const [c, g, s, b] of rowsFor(sports, series, e, sp)!) {
      const k = canonical(c, e.year)
      const v = acc.get(k) ?? [0, 0, 0]
      acc.set(k, [v[0] + g, v[1] + s, v[2] + b])
    }
  const list = [...acc].sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1] || b[1][2] - a[1][2]).map(([key, m]) => ({ key, m }))
  const shown = topPlusFocus(list, open, focus)
  const tpe = acc.get(focus)
  return (
    <>
      <Summary title={`${SERIES_NAME[series.id]}・${SPORT_ZH[sp]}`}>
        <Tiles
          items={[
            { label: '有資料的屆數', value: `${eds.length} 屆`, sub: eds.length ? `${eds[0].year}–${eds[eds.length - 1].year}` : undefined },
            ...list.slice(0, 2).map(({ key, m }, i) => ({
              label: i === 0 ? '金牌最多' : '第二多',
              value: <Country code={key} />,
              sub: <MedalLine g={m[0]} s={m[1]} b={m[2]} />,
            })),
            {
              label: '中華台北',
              value: tpe ? <MedalLine g={tpe[0]} s={tpe[1]} b={tpe[2]} /> : '尚無獎牌',
              sub: tpe ? (
                <button className="underline" onClick={() => setFilters({ ...f, c: focus })}>
                  逐屆成績 →
                </button>
              ) : undefined,
            },
          ]}
        />
      </Summary>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">逐屆頒獎台</h2>
        <p className="mt-1 text-xs text-stone-500">單一項目（例如棒球）列出金、銀、銅牌隊伍；多項目（例如游泳）列出該屆獎牌榜前三名。</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-500">
              <tr>
                <th className="px-2 py-2 text-left font-medium">屆次</th>
                <th className="px-2 py-2 text-left font-medium">🥇 金</th>
                <th className="px-2 py-2 text-left font-medium">🥈 銀</th>
                <th className="px-2 py-2 text-left font-medium">🥉 銅</th>
              </tr>
            </thead>
            <tbody>
              {[...eds].reverse().map((e) => {
                const rows = rowsFor(sports, series, e, sp)!
                const golds = rows.reduce((s, r) => s + r[1], 0)
                const single = golds <= 1
                const st = standings({ year: e.year, rows })
                const cell = (list: Standing[], showCounts: boolean) =>
                  list.length ? (
                    <div className="space-y-0.5">
                      {list.map((r) => (
                        <div key={r.code} className={`flex items-center gap-1.5 ${r.key === focus ? 'font-semibold text-blue-800' : ''}`}>
                          <Flag iso2={r.flag} code={r.code} />
                          {r.name}
                          {showCounts && (
                            <span className="text-xs font-normal text-stone-500">
                              {r.gold}金{r.silver}銀{r.bronze}銅
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-stone-300">—</span>
                  )
                const podium = single
                  ? [st.filter((r) => r.gold), st.filter((r) => r.silver), st.filter((r) => r.bronze)]
                  : [st.slice(0, 1), st.slice(1, 2), st.slice(2, 3)]
                const tpeRow = st.find((r) => r.key === focus)
                const tpeShown = podium.some((p) => p.includes(tpeRow!))
                return (
                  <tr key={e.year} className="border-b border-stone-100 align-top">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button className="hover:underline" onClick={() => setFilters({ ...f, y: e.year })}>
                        {e.year} {e.city}
                      </button>
                      {tpeRow && !tpeShown && (
                        <div className="text-xs text-blue-800">
                          中華台北 {tpeRow.gold}金{tpeRow.silver}銀{tpeRow.bronze}銅
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">{cell(podium[0], !single)}</td>
                    <td className="px-2 py-2">{cell(podium[1], !single)}</td>
                    <td className="px-2 py-2">{cell(podium[2], !single)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">歷屆累計獎牌榜</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-500">
              <tr>
                <th className="px-2 py-2 text-left font-medium">國家／地區</th>
                <th className="px-2 py-2 text-right font-medium">金</th>
                <th className="px-2 py-2 text-right font-medium">銀</th>
                <th className="px-2 py-2 text-right font-medium">銅</th>
                <th className="px-2 py-2 text-right font-medium">總數</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ key, m }) => (
                <tr key={key} className={`border-b border-stone-100 ${key === focus ? 'bg-blue-50/70' : ''}`}>
                  <td className="px-2 py-1.5">
                    <button className="hover:underline" onClick={() => setFilters({ ...f, c: key })}>
                      <Country code={key} />
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m[0]}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m[1]}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m[2]}</td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{sum3(m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ShowMore total={list.length} shown={shown.length} open={open} onToggle={() => setOpen(!open)} />
        <p className="mt-2 text-xs text-stone-500">分項資料取自維基百科各運動頁面；少數早期屆次缺團體項目，表演賽不計。</p>
      </section>
    </>
  )
}

// ---------- 整個系列 ----------

function SeriesView({ series, f, setFilters }: { series: Series; f: Filters; setFilters: (f: Filters) => void }) {
  const allTime = new Map<string, [number, number, number]>()
  for (const e of series.editions)
    for (const [c, g, s, b] of e.rows) {
      const k = canonical(c, e.year)
      const v = allTime.get(k) ?? [0, 0, 0]
      allTime.set(k, [v[0] + g, v[1] + s, v[2] + b])
    }
  const ranked = [...allTime].sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1])
  const top5 = ranked.slice(0, 5).map(([k]) => k)
  const lines = top5.map((k) => ({
    name: nameOf(k, 9999),
    values: series.editions.map((e) => {
      const t = editionTotals(e.rows).gold
      const present = e.rows.some(([c]) => canonical(c, e.year) === k)
      return present && t ? Math.round((medalsOf(e.rows, k, e.year)[0] / t) * 1000) / 10 : null
    }),
  }))
  const hostRows = series.editions
    .filter((e) => !e.live)
    .flatMap((e) => hostEffects(series, e))
    .filter((h) => h.before.length)
  const avgLift = hostRows.length ? hostRows.reduce((s, h) => s + (h.now.share - h.avgBeforeShare), 0) / hostRows.length : 0
  const first = series.editions[0]
  const last = series.editions.filter((e) => !e.live).at(-1)!

  return (
    <>
      <Summary title={SERIES_NAME[series.id]}>
        <Tiles
          items={[
            { label: '收錄屆數', value: `${series.editions.length} 屆`, sub: `${first.year}–${series.editions.at(-1)!.year}` },
            { label: '歷來金牌最多', value: <Country code={ranked[0][0]} />, sub: `${ranked[0][1][0]} 金・共 ${sum3(ranked[0][1])} 面` },
            { label: '最近一屆', value: `${last.year} ${last.city}`, sub: <button className="underline" onClick={() => setFilters({ ...f, y: last.year })}>看獎牌榜 →</button> },
            {
              label: '地主效應（平均）',
              value: `${avgLift >= 0 ? '+' : ''}${(avgLift * 100).toFixed(1)} 個百分點`,
              sub: `主辦國獎牌佔比 vs 它主辦前兩屆的平均，共 ${hostRows.length} 屆可比較`,
            },
          ]}
        />
      </Summary>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">強權消長：歷屆金牌佔比</h2>
        <p className="mt-1 text-xs text-stone-500">
          每屆項目數不同（{first.year} 年頒出 {editionTotals(first.rows).gold} 金，{last.year} 年 {editionTotals(last.rows).gold}{' '}
          金），看「佔比」才能跨年代比較。取歷來金牌最多的 5 國；前身國家（如蘇聯、東西德）不併入。
        </p>
        <TrendChart editions={series.editions} lines={lines} legend percent format={(v) => (v == null ? '未參賽／未得牌' : `${v}%`)} />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">地主效應：主辦國比平常多拿多少？</h2>
        <p className="mt-1 text-xs text-stone-500">
          比較主辦國「本屆獎牌佔比」與「它主辦前兩屆（有得牌、非主辦）的平均佔比」。用佔比而非面數，才能排除各屆項目數不同的影響。
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-500">
              <tr>
                <th className="px-2 py-2 text-left font-medium">屆次</th>
                <th className="px-2 py-2 text-left font-medium">地主</th>
                <th className="px-2 py-2 text-right font-medium">主辦時佔比</th>
                <th className="px-2 py-2 text-right font-medium">前兩屆平均</th>
                <th className="px-2 py-2 text-right font-medium">差距</th>
              </tr>
            </thead>
            <tbody>
              {[...hostRows].reverse().map((h) => (
                <tr key={`${h.edition.year}-${h.key}`} className="border-b border-stone-100">
                  <td className="px-2 py-1.5">
                    <button className="hover:underline" onClick={() => setFilters({ ...f, y: h.edition.year })}>
                      {h.edition.year} {h.edition.city}
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <Country code={h.key} year={h.edition.year} />
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{pct(h.now.share)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-stone-500">{pct(h.avgBeforeShare)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    <Delta v={(h.now.share - h.avgBeforeShare) * 100} digits={1} suffix=" 點" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
