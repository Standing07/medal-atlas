// 各種「一句話摘要」的計算：地主效應、歷史紀錄與里程碑、國名更迭、熱門運動、近年獎牌來源。
// 原則：只陳述已發生的事實，不做預測（例如不寫「這屆能不能破紀錄」）。
import { canonical, nameOf } from './countries.js'
import { SPORT_ZH } from './sports.js'
import { editionLabel, editionTotals, standings, type Edition, type Row, type Series, type SportsData } from './data'

const sum3 = (v: number[]) => v[0] + v[1] + v[2]

/** 某國在某屆的金銀銅（用歸併後代碼） */
export function medalsOf(rows: Row[], key: string, year: number): [number, number, number] {
  const v: [number, number, number] = [0, 0, 0]
  for (const [c, g, s, b] of rows)
    if (canonical(c, year) === key) {
      v[0] += g
      v[1] += s
      v[2] += b
    }
  return v
}

// ---------- 地主效應 ----------

export interface HostEffect {
  key: string
  name: string
  edition: Edition
  now: { medals: [number, number, number]; share: number }
  /** 同一國在之前（非主辦）的兩屆 */
  before: { edition: Edition; medals: [number, number, number]; share: number }[]
  avgBeforeShare: number
}

/** 地主在本屆的獎牌佔比，和它之前兩屆（有參賽得牌、非主辦）的平均佔比比較 */
export function hostEffects(series: Series, edition: Edition): HostEffect[] {
  const hosts = [...new Set(edition.rows.filter((r) => r[4]?.includes('h')).map((r) => canonical(r[0], edition.year)))]
  const idx = series.editions.findIndex((e) => e.year === edition.year)
  const totalOf = (e: Edition) => {
    const t = editionTotals(e.rows)
    return t.gold + t.silver + t.bronze
  }
  return hosts.map((key) => {
    const medals = medalsOf(edition.rows, key, edition.year)
    const before: HostEffect['before'] = []
    for (let i = idx - 1; i >= 0 && before.length < 2; i--) {
      const e = series.editions[i]
      const wasHost = e.rows.some((r) => r[4]?.includes('h') && canonical(r[0], e.year) === key)
      const m = medalsOf(e.rows, key, e.year)
      if (wasHost || sum3(m) === 0) continue
      before.push({ edition: e, medals: m, share: sum3(m) / totalOf(e) })
    }
    return {
      key,
      name: nameOf(key, edition.year),
      edition,
      now: { medals, share: sum3(medals) / totalOf(edition) },
      before,
      avgBeforeShare: before.length ? before.reduce((s, b) => s + b.share, 0) / before.length : NaN,
    }
  })
}

// ---------- 歷史紀錄與里程碑 ----------

/** 某國在某系列的事實句（不含預測） */
export function milestones(series: Series, key: string): string[] {
  const done = series.editions.filter((e) => !e.live)
  const hist = done
    .map((e) => {
      const st = standings(e)
      const row = st.find((r) => r.key === key)
      return { e, m: medalsOf(e.rows, key, e.year), rank: row && row.gold > 0 ? row.rank : null }
    })
    .filter((x) => sum3(x.m) > 0)
  if (!hist.length) return []
  const sn = series.id
  const out: string[] = []
  const lab = (e: Edition) => editionLabel(sn, e, false)
  const join = (list: { e: Edition }[]) => list.map((x) => lab(x.e)).join('、')

  const maxG = Math.max(...hist.map((x) => x.m[0]))
  if (maxG > 0) {
    const best = hist.filter((x) => x.m[0] === maxG)
    out.push(`單屆最多 ${maxG} 金：${join(best)}。`)
  }
  const maxT = Math.max(...hist.map((x) => sum3(x.m)))
  const bestT = hist.filter((x) => sum3(x.m) === maxT)
  out.push(`單屆最多 ${maxT} 面：${join(bestT)}。`)
  const firstGold = hist.find((x) => x.m[0] > 0)
  if (firstGold) out.push(`第一面金牌：${lab(firstGold.e)}。`)
  // 連續得牌
  let streak = 0
  for (let i = done.length - 1; i >= 0; i--) {
    if (sum3(medalsOf(done[i].rows, key, done[i].year)) > 0) streak++
    else break
  }
  if (streak >= 3) out.push(`已連續 ${streak} 屆有獎牌入帳。`)
  return out
}

/** 某國在某一屆的成績放回歷屆比較（例：「為歷屆第 2 多」），只陳述事實 */
export function editionStanding(series: Series, edition: Edition, key: string): string | null {
  const m = medalsOf(edition.rows, key, edition.year)
  if (sum3(m) === 0) return null
  const others = series.editions.filter((e) => e.year !== edition.year && !e.live).map((e) => medalsOf(e.rows, key, e.year))
  const place = (better: number, tie: number) =>
    better === 0 ? (tie > 0 ? `與另外 ${tie} 屆並列歷屆最多` : '為歷屆最多') : `為歷屆第 ${better + 1} 多${tie > 0 ? `（與 ${tie} 屆同數）` : ''}`
  const g = place(others.filter((o) => o[0] > m[0]).length, others.filter((o) => o[0] === m[0]).length)
  const t = place(others.filter((o) => sum3(o) > sum3(m)).length, others.filter((o) => sum3(o) === sum3(m)).length)
  const name = nameOf(key, 9999)
  const tail = edition.live ? '（本屆進行中，以目前數字計）' : ''
  return `${name}本屆 ${m[0]} 金、共 ${sum3(m)} 面：金牌數${g}，總數${t}${tail}。`
}

// ---------- 國名更迭 ----------

export interface NameSpan {
  name: string
  code: string
  from: number
  to: number
  series: string[]
}

/** 某國在各賽事中出現過的名稱與代碼（依年份排序） */
export function nameHistory(all: Series[], key: string): NameSpan[] {
  const map = new Map<string, NameSpan>()
  for (const s of all)
    for (const e of s.editions)
      for (const [c] of e.rows) {
        if (canonical(c, e.year) !== key) continue
        const name = nameOf(c, e.year)
        const id = `${name}|${c}`
        const cur = map.get(id) ?? { name, code: c, from: e.year, to: e.year, series: [] }
        cur.from = Math.min(cur.from, e.year)
        cur.to = Math.max(cur.to, e.year)
        if (!cur.series.includes(s.id)) cur.series.push(s.id)
        map.set(id, cur)
      }
  return [...map.values()].sort((a, b) => a.from - b.from)
}

// ---------- 運動 ----------

export interface SportTally {
  sport: string
  zh: string
  medals: [number, number, number]
}

function tally(sports: SportsData, keys: { key: string; year: number; edKey: string }[], country: string): SportTally[] {
  const acc = new Map<string, [number, number, number]>()
  for (const { year, edKey } of keys) {
    const bySport = sports.editions[edKey]
    if (!bySport) continue
    for (const [sp, rows] of Object.entries(bySport)) {
      const m = medalsOf(rows, country, year)
      if (!sum3(m)) continue
      const v = acc.get(sp) ?? [0, 0, 0]
      acc.set(sp, [v[0] + m[0], v[1] + m[1], v[2] + m[2]])
    }
  }
  return [...acc]
    .map(([sport, medals]) => ({ sport, zh: SPORT_ZH[sport] ?? sport, medals }))
    .sort((a, b) => sum3(b.medals) - sum3(a.medals) || b.medals[0] - a.medals[0])
}

/** 某國在某系列歷屆的熱門運動（依獎牌總數） */
export function topSports(sports: SportsData, series: Series, country: string): SportTally[] {
  return tally(
    sports,
    series.editions.map((e) => ({ key: country, year: e.year, edKey: `${series.id}-${e.year}` })),
    country,
  )
}

/** 近 N 年（依實際舉行年份）的主要獎牌來源 */
export function recentSources(sports: SportsData, series: Series, country: string, years = 6, now = new Date()) {
  const since = now.getFullYear() - years
  const eds = series.editions.filter((e) => e.held >= since)
  return {
    editions: eds,
    list: tally(
      sports,
      eds.map((e) => ({ key: country, year: e.year, edKey: `${series.id}-${e.year}` })),
      country,
    ),
  }
}

/** 某系列有分項資料的運動（依歷來頒出獎牌數排序） */
export function sportsInSeries(sports: SportsData, series: Series, year?: number) {
  const count = new Map<string, number>()
  for (const e of series.editions) {
    if (year !== undefined && e.year !== year) continue
    for (const [sp, rows] of Object.entries(sports.editions[`${series.id}-${e.year}`] ?? {}))
      count.set(sp, (count.get(sp) ?? 0) + rows.reduce((s, r) => s + r[1] + r[2] + r[3], 0))
  }
  return [...count].sort((a, b) => b[1] - a[1]).map(([id]) => ({ id, zh: SPORT_ZH[id] ?? id }))
}
