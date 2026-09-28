import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { EChartsOption } from 'echarts'
import EChart from '../components/EChart'
import Flag from '../components/Flag'
import { Delta, MedalLine, MEDAL } from '../components/Medals'
import {
  atProgress,
  editionLabel,
  fmt,
  loadEvents,
  loadMedals,
  loadPace,
  pct,
  previousEdition,
  standings,
  type MedalsData,
  type PaceData,
  type SportEvent,
  type RankBy,
} from '../lib/data'
import { bundledState, fetchLive, scheduleToday, type LiveState } from '../lib/live'
import { nextCheckpoint } from '../lib/schedule.js'
import DidYouKnow from '../components/DidYouKnow'
import ShowMore, { topPlusFocus } from '../components/ShowMore'
import { buildFacts } from '../lib/facts'
import { canonical, nameOf, flagOf } from '../lib/countries.js'

type Metric = 'total' | 'gold'
const COLOR_NOW = '#2a78d6'
const COLOR_PREV = '#eb6834'

const taipeiTime = (iso: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

export default function Live() {
  const [medals, setMedals] = useState<MedalsData>()
  const [pace, setPace] = useState<PaceData>()
  const [live, setLive] = useState<LiveState>()
  const [error, setError] = useState<string>()
  const [params, setParams] = useSearchParams()
  const focus = (params.get('c') ?? 'TPE').toUpperCase()
  const [metric, setMetric] = useState<Metric>('total')
  const [rankBy, setRankBy] = useState<RankBy>('gold')
  const [openAll, setOpenAll] = useState(false)

  useEffect(() => {
    Promise.all([loadMedals(), loadPace()])
      .then(([m, p]) => {
        setMedals(m)
        setPace(p)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const [events, setEvents] = useState<SportEvent[]>([])
  useEffect(() => {
    loadEvents().then(setEvents)
  }, [])
  const facts = useMemo(() => (medals ? buildFacts(medals, events) : []), [medals, events])
  const cfg = medals?.live
  const series = medals?.series.find((s) => s.id === cfg?.series)
  const edition = series?.editions.find((e) => e.year === cfg?.year)
  const prev = series && edition ? previousEdition(series, edition.year) : undefined
  const paceNow = pace && cfg ? pace[`${cfg.series}-${cfg.year}`] : undefined
  const pacePrev = pace && cfg && prev ? pace[`${cfg.series}-${prev.year}`] : undefined

  // 每天台灣時間 23:50 更新，之後每 6 小時（05:50、11:50、17:50）再更新一次：
  // 開頁時取最近一個更新時間點的版本；頁面一直開著的話，到下一個時間點自動更新。
  useEffect(() => {
    if (!cfg || !edition) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    setLive((cur) => cur ?? bundledState(edition, paceNow))
    const run = () => {
      fetchLive(cfg, edition, paceNow).then((s) => alive && setLive(s))
      timer = setTimeout(run, nextCheckpoint().getTime() - Date.now() + 60_000)
    }
    run()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [cfg, edition, paceNow])

  const view = useMemo(() => {
    if (!edition || !prev || !live || !pacePrev) return null
    const progress = live.totalEvents ? Math.min(1, live.goldsAwarded / live.totalEvents) : 0
    const now = standings({ year: edition.year, rows: live.rows }, rankBy)
    const prevFinal = new Map(standings(prev).map((r) => [r.key, r]))
    const rows = now.map((r) => {
      const same = atProgress(pacePrev, progress, r.key, prev.year)
      return { ...r, same, prevFinal: prevFinal.get(r.key) }
    })
    return { progress, rows }
  }, [edition, prev, live, pacePrev, rankBy])

  if (error) return <p className="text-rose-700">資料載入失敗：{error}</p>
  if (!cfg || !series || !edition || !prev || !view || !live || !paceNow || !pacePrev)
    return <p className="py-20 text-center text-stone-500">載入獎牌資料中…</p>

  const sched = scheduleToday(cfg, paceNow)
  const me = view.rows.find((r) => r.key === focus)
  const meNow = me ? [me.gold, me.silver, me.bronze] : [0, 0, 0]
  const meSame = atProgress(pacePrev, view.progress, focus, prev.year)
  const mePrevFinal = view.rows.find((r) => r.key === focus)?.prevFinal ?? standings(prev).find((r) => r.key === focus)
  const sum = (v: number[]) => v[0] + v[1] + v[2]
  const pick = (v: number[]) => (metric === 'gold' ? v[0] : sum(v))
  const focusName = nameOf(focus, edition.year)
  const countries = [
    ...new Map(
      [...view.rows.map((r) => [r.key, r.name] as const), ...standings(prev).map((r) => [r.key, r.name] as const)],
    ),
  ].sort((a, b) => (a[0] === 'TPE' ? -1 : b[0] === 'TPE' ? 1 : a[1].localeCompare(b[1], 'zh-Hant')))

  // 地主效應：地主目前的獎牌 vs 上屆同進度
  const hostRows = view.rows.filter((r) => r.host)
  const nowLabel = editionLabel(series.id, edition, false)
  const prevLabel = editionLabel(series.id, prev, false)

  return (
    <div className="space-y-6">
      {/* 賽事進度 */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-rose-600">
              {sched.finished ? '● 已閉幕' : '● 進行中'}
            </p>
            <h1 className="text-2xl font-bold text-stone-900">{nowLabel}</h1>
            <p className="text-sm text-stone-500">
              {cfg.firstDay.slice(5).replace('-', '/')}–{cfg.lastDay.slice(5).replace('-', '/')}・共{' '}
              {live.totalEvents} 個金牌項目・上屆為 {prevLabel}（{prev.held} 年舉行）
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-stone-900">{pct(view.progress, 0)}</p>
            <p className="text-xs text-stone-500">賽事進度</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`賽事進度 ${pct(view.progress)}`}>
          <div className="h-full rounded-full bg-stone-800" style={{ width: pct(view.progress) }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-stone-500">
          <span>
            已頒發 {live.goldsAwarded} 面金牌 ／ {live.totalEvents} 項
            {sched.dayIndex > 0 && `・第 ${sched.dayIndex} 天（共 ${sched.totalDays} 天）`}
            {sched.plannedByToday > 0 && `・大會賽程預定今天結束時完成 ${sched.plannedByToday} 項`}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
          更新時間：每天台灣時間 23:50 更新，之後每 6 小時（05:50、11:50、17:50）再更新一次。
          目前是 {taipeiTime(live.checkpoint)} 的資料（維基百科獎牌表該時間點的版本，最後編輯於 {taipeiTime(live.asOf)}），
          下次更新 {taipeiTime(nextCheckpoint().toISOString())}。數字以
          <a className="underline" href={cfg.officialResults} target="_blank" rel="noreferrer">
            大會官方成績
          </a>
          為準。
        </p>
        {live.note && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">⚠️ {live.note}，目前顯示 {taipeiTime(live.checkpoint)} 的資料。</p>}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        {hostRows.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="font-semibold text-stone-900">🏟️ 地主效應</h2>
            {hostRows.map((h) => {
              const same = sum(h.same)
              return (
                <div key={h.code} className="mt-3 text-sm leading-relaxed text-stone-700">
                  <p className="flex items-center gap-2 text-base font-semibold text-stone-900">
                    <Flag iso2={h.flag} code={h.code} /> {h.name}目前 {h.total} 面
                  </p>
                  <p className="mt-1">
                    上屆同進度（推估）{fmt(same, 1)} 面，本屆主場{' '}
                    <b className={h.total >= same ? 'text-emerald-700' : 'text-rose-700'}>
                      {h.total >= same ? '多' : '少'} {fmt(Math.abs(h.total - same), 1)} 面
                    </b>
                    ；{prevLabel}最終拿下 {h.prevFinal?.total ?? 0} 面。
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    「上屆同進度」為依杭州亞洲運動會每日累計內插的推估值。
                    <Link className="underline" to={`/explore?g=${series.id}`}>
                      看歷屆亞洲運動會的地主效應 →
                    </Link>
                  </p>
                </div>
              )
            })}
          </div>
        )}
        <div className={hostRows.length ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <DidYouKnow facts={facts} />
        </div>
      </section>

      {/* 焦點國家 */}
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
          <label className="flex items-center gap-2 text-sm text-stone-500">
            焦點國家
            <select
              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-stone-800"
              value={focus}
              onChange={(e) => setParams({ c: e.target.value }, { replace: true })}
            >
              {countries.map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex items-center gap-3">
            <Flag iso2={flagOf(focus, edition.year)} code={focus} className="text-3xl" />
            <div>
              <p className="text-xl font-bold text-stone-900">{focusName}</p>
              <p className="text-sm text-stone-500">
                {me ? `${rankBy === 'gold' ? '金牌榜' : '總獎牌榜'}第 ${me.rank} 名` : '目前尚未得牌'}
              </p>
            </div>
            <p className="ml-auto text-right">
              <span className="text-5xl font-bold text-stone-900">{sum(meNow)}</span>
              <span className="ml-1 text-sm text-stone-500">面</span>
            </p>
          </div>
          <MedalLine g={meNow[0]} s={meNow[1]} b={meNow[2]} className="mt-2 text-sm" />

          <dl className="mt-5 space-y-3 border-t border-stone-100 pt-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-stone-500">
                上屆同進度
                <span className="block text-xs text-stone-400">{prevLabel}完成 {pct(view.progress, 0)} 時（推估）</span>
              </dt>
              <dd className="text-right">
                <span className="font-semibold">
                  {fmt(meSame[0], 1)} 金・{fmt(sum(meSame), 1)} 面
                </span>
                <span className="block whitespace-nowrap text-xs">
                  金 <Delta v={meNow[0] - meSame[0]} digits={1} />　總 <Delta v={sum(meNow) - sum(meSame)} digits={1} />
                </span>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-stone-500">
                上屆最終
                <span className="block text-xs text-stone-400">{prevLabel}閉幕時</span>
              </dt>
              <dd className="text-right">
                <span className="font-semibold">
                  {mePrevFinal ? `${mePrevFinal.gold} 金・${mePrevFinal.total} 面` : '未得牌'}
                </span>
                {mePrevFinal && mePrevFinal.total > 0 && (
                  <span className="block text-xs text-stone-500">目前已達上屆總數的 {pct(sum(meNow) / mePrevFinal.total, 0)}</span>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-stone-500">
            「同進度」＝上屆也完成 {pct(view.progress, 0)} 金牌項目的那一刻。由上屆每天結束時的累計獎牌內插而得，屬推估值；
            各國強項集中在哪幾天會影響比較，僅供參考。
          </p>
          <Link to={`/explore?c=${focus}&g=${series.id}`} className="mt-3 inline-block text-sm text-blue-700 underline">
            看{focusName}歷屆的成績與熱門運動 →
          </Link>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-stone-900">
              {focusName}：本屆 vs 上屆，同進度累計{metric === 'gold' ? '金牌' : '獎牌'}
            </h2>
            <Toggle
              value={metric}
              onChange={setMetric}
              options={[
                ['total', '總獎牌'],
                ['gold', '金牌'],
              ]}
            />
          </div>
          <PaceChart
            key={focus + metric}
            now={paceNow.snapshots.map((s) => ({ x: s.eventsDone / paceNow.totalEvents, v: sumFor(s.medals, focus, edition.year) }))}
            livePoint={{ x: view.progress, v: meNow as [number, number, number] }}
            prev={pacePrev.snapshots.map((s) => ({ x: s.eventsDone / pacePrev.totalEvents, v: sumFor(s.medals, focus, prev.year) }))}
            pick={pick}
            nowLabel={`${edition.year} ${edition.city}`}
            prevLabel={`${prev.year} ${prev.city}`}
            unit={metric === 'gold' ? '金' : '面'}
          />
          <p className="mt-1 text-xs text-stone-500">
            橫軸是「已完成的金牌項目比例」，讓兩屆項目數不同（{live.totalEvents} vs {pacePrev.totalEvents} 項）也能對齊比較。
            每個點是某一天結束時的累計，取自維基百科獎牌表當晚的歷史版本，並逐日核對大會賽程的完成項目數。
          </p>
        </div>
      </section>

      {/* 即時獎牌榜 */}
      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
          <h2 className="font-semibold text-stone-900">獎牌榜（點國家可設為焦點）</h2>
          <Toggle
            value={rankBy}
            onChange={setRankBy}
            options={[
              ['gold', '依金牌排'],
              ['total', '依總數排'],
            ]}
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">名次</th>
                <th className="px-3 py-2 text-left font-medium">國家／地區</th>
                {(['gold', 'silver', 'bronze'] as const).map((k) => (
                  <th key={k} className="px-2 py-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: MEDAL[k].color }} />
                      {MEDAL[k].zh}
                    </span>
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium">總數</th>
                <th className="px-2 py-2 text-right font-medium">上屆同進度</th>
                <th className="px-2 py-2 text-right font-medium">差距</th>
                <th className="px-3 py-2 text-right font-medium">上屆最終</th>
              </tr>
            </thead>
            <tbody>
              {topPlusFocus(view.rows, openAll, focus).map((r) => {
                const sameV = metric === 'gold' ? r.same[0] : sum(r.same)
                const nowV = metric === 'gold' ? r.gold : r.total
                return (
                  <tr
                    key={r.code}
                    onClick={() => setParams({ c: r.key }, { replace: true })}
                    className={`cursor-pointer border-b border-stone-100 hover:bg-stone-50 ${r.key === focus ? 'bg-blue-50/70' : ''}`}
                  >
                    <td className="px-3 py-2 tabular-nums text-stone-500">{r.rank}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <Flag iso2={r.flag} code={r.code} />
                        <span className={r.key === focus ? 'font-semibold' : ''}>{r.name}</span>
                        {r.host && <span className="rounded bg-stone-100 px-1 text-[10px] text-stone-500">地主</span>}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.gold}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.silver}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.bronze}</td>
                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{r.total}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-stone-500">
                      {fmt(sameV, 1)}
                      <span className="text-[10px]">{metric === 'gold' ? ' 金' : ' 面'}</span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      <Delta v={nowV - sameV} digits={1} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-stone-500">
                      {r.prevFinal ? `${r.prevFinal.gold} 金 / ${r.prevFinal.total}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5">
          <ShowMore total={view.rows.length} shown={topPlusFocus(view.rows, openAll, focus).length} open={openAll} onToggle={() => setOpenAll(!openAll)} />
        </div>
        <p className="px-5 py-3 text-xs text-stone-500">
          「上屆同進度」與「差距」依上方切換的{metric === 'gold' ? '金牌' : '總獎牌'}計算。上屆 {prev.year} 杭州亞洲運動會因疫情延至 {prev.held} 年舉行。
        </p>
      </section>
    </div>
  )
}

function sumFor(medals: Record<string, [number, number, number]>, key: string, year: number): [number, number, number] {
  const v: [number, number, number] = [0, 0, 0]
  for (const [code, m] of Object.entries(medals)) if (canonical(code, year) === key) m.forEach((x, i) => (v[i] += x))
  return v
}

export function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div className="inline-flex rounded-full bg-stone-100 p-0.5 text-xs" role="group">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 ${value === v ? 'bg-white font-medium text-stone-900 shadow-sm' : 'text-stone-500'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PaceChart({
  now,
  livePoint,
  prev,
  pick,
  nowLabel,
  prevLabel,
  unit,
}: {
  now: { x: number; v: [number, number, number] }[]
  livePoint: { x: number; v: [number, number, number] }
  prev: { x: number; v: [number, number, number] }[]
  pick: (v: number[]) => number
  nowLabel: string
  prevLabel: string
  unit: string
}) {
  const option = useMemo<EChartsOption>(() => {
    const pts = (list: { x: number; v: number[] }[]) =>
      [[0, 0] as [number, number]].concat(list.map((p) => [Math.round(p.x * 1000) / 10, pick(p.v)] as [number, number]))
    const nowPts = pts(now.filter((p) => p.x < livePoint.x - 1e-6).concat([livePoint]))
    const prevPts = pts(prev)
    return {
      animation: false,
      grid: { left: 40, right: 90, top: 20, bottom: 36 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#a8a29e' } },
        valueFormatter: (v) => `${v} ${unit}`,
      },
      legend: { show: false },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#78716c' },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#d6d3d1' } },
        name: '賽事進度',
        nameLocation: 'middle',
        nameGap: 24,
        nameTextStyle: { color: '#78716c', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#78716c' },
        splitLine: { lineStyle: { color: '#f0efec' } },
      },
      series: [
        {
          name: prevLabel,
          type: 'line',
          data: prevPts,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, type: 'dashed', color: COLOR_PREV },
          itemStyle: { color: COLOR_PREV },
          endLabel: { show: true, formatter: `${prevLabel}\n最終 {@[1]}`, color: '#57534e', fontSize: 11 },
        },
        {
          name: nowLabel,
          type: 'line',
          data: nowPts,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 2.5, color: COLOR_NOW },
          itemStyle: { color: COLOR_NOW, borderColor: '#fff', borderWidth: 2 },
          endLabel: { show: true, formatter: `${nowLabel}\n目前 {@[1]}`, color: '#1c1917', fontSize: 11, fontWeight: 'bold' },
        },
      ],
    }
  }, [now, livePoint, prev, pick, nowLabel, prevLabel, unit])
  return <EChart option={option} notMerge className="mt-2 h-72 w-full" />
}
