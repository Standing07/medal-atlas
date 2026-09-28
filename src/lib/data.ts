import { canonical, nameOf, flagOf } from './countries.js'

export type Row = [code: string, gold: number, silver: number, bronze: number, flags?: string]

export interface Edition {
  year: number
  held: number
  city: string
  src: { title: string; revid: number; ts: string; checkpoint?: string }
  method: 'template' | 'wikitable'
  disputed?: boolean
  live?: boolean
  corrections?: { code: string; from: number[]; to: number[]; source: string; url: string; checked: string; note: string }[]
  rows: Row[]
}

export interface Series {
  id: string
  zh: string
  en: string
  /** 放在「更多賽事」 */
  more?: boolean
  editions: Edition[]
}

export interface LiveConfig {
  series: string
  year: number
  page: string
  calendarPage: string
  firstDay: string
  lastDay: string
  timezone: string
  officialResults: string
}

export interface MedalsData {
  generatedAt: string
  live: LiveConfig
  series: Series[]
}

export interface PaceSnapshot {
  day: string
  eventsDone: number
  golds: number
  revid: number
  timestamp: string
  approx?: boolean
  medals: Record<string, [number, number, number]>
}

export interface PaceEdition {
  page: string
  calendar: string
  totalEvents: number
  schedule: { day: string; cum: number }[]
  snapshots: PaceSnapshot[]
  fixes: string[]
}

export type PaceData = Record<string, PaceEdition>

const cache = new Map<string, Promise<unknown>>()
function loadJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`${import.meta.env.BASE_URL}data/${path}`).then((r) => {
        if (!r.ok) throw new Error(`讀不到 ${path}（HTTP ${r.status}）`)
        return r.json()
      }),
    )
  }
  return cache.get(path) as Promise<T>
}
export const loadMedals = () => loadJson<MedalsData>('medals.json')

/** 分項（依運動）獎牌：editions[`${series}-${year}`][sportId] = 各國列 */
export interface SportsData {
  generatedAt: string
  editions: Record<string, Record<string, Row[]>>
  coverage: Record<string, { complete: boolean; ratio: number; nDiffs: number }>
}
export const loadSports = () => loadJson<SportsData>('sports.json')

/** 重大事件（抵制、改名、延期等），每筆附來源 */
export interface SportEvent {
  id: string
  series: string[]
  from: number
  to: number
  codes: string[]
  zh: string
  source: string
  sourceTitle: string
}
export const loadEvents = () => loadJson<SportEvent[]>('events.json').catch(() => [] as SportEvent[])

/** 人口（世界銀行；台灣另用官方資料）：byIso2[iso2][年份] = 人口 */
export interface PopulationData {
  source: string
  lastUpdated: string
  byIso2: Record<string, Record<string, number>>
  twSource?: string
}
export const loadPopulation = () => loadJson<PopulationData>('population.json').catch(() => null)

/** 某代表隊在某年的人口（取該年，沒有就取之前最近的一年）；歷史代表隊（蘇聯等）沒有 → null */
export function populationOf(pop: PopulationData | null | undefined, iso2: string | null, year: number) {
  if (!pop || !iso2 || iso2.includes('-')) return null
  const series = pop.byIso2[iso2]
  if (!series) return null
  for (let y = year; y >= year - 5; y--) if (series[y]) return { value: series[y], year: y }
  return null
}
export const loadPace = () => loadJson<PaceData>('pace.json')

// ---------- 計算 ----------

export interface Standing {
  code: string
  key: string // 串連歷年用的代碼（例：SIN→SGP）
  name: string
  flag: string | null
  gold: number
  silver: number
  bronze: number
  total: number
  rank: number
  host: boolean
  disputed: boolean
  corrected: boolean
}

export type RankBy = 'gold' | 'total'

/** 依國際奧會慣例（金→銀→銅）或總數排名；數字完全相同者並列同名次 */
export function standings(edition: Pick<Edition, 'year' | 'rows'>, by: RankBy = 'gold'): Standing[] {
  const list = edition.rows.map(([code, g, s, b, f]) => ({
    code,
    key: canonical(code, edition.year),
    name: nameOf(code, edition.year),
    flag: flagOf(code, edition.year),
    gold: g,
    silver: s,
    bronze: b,
    total: g + s + b,
    rank: 0,
    host: !!f?.includes('h'),
    disputed: !!f?.includes('d'),
    corrected: !!f?.includes('c'),
  }))
  const cmp = (a: Standing, b: Standing) =>
    by === 'total'
      ? b.total - a.total || b.gold - a.gold || b.silver - a.silver
      : b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze
  list.sort((a, b) => cmp(a, b) || a.code.localeCompare(b.code))
  list.forEach((r, i) => {
    r.rank = i > 0 && cmp(list[i - 1], r) === 0 ? list[i - 1].rank : i + 1
  })
  return list
}

export function editionTotals(rows: Row[]) {
  return rows.reduce(
    (t, [, g, s, b]) => ({ gold: t.gold + g, silver: t.silver + s, bronze: t.bronze + b }),
    { gold: 0, silver: 0, bronze: 0 },
  )
}

export function previousEdition(series: Series, year: number): Edition | undefined {
  const i = series.editions.findIndex((e) => e.year === year)
  return i > 0 ? series.editions[i - 1] : undefined
}

/** 某國在某系列歷屆的成績（用歸併後代碼） */
export function countryHistory(series: Series, key: string, by: RankBy = 'gold') {
  return series.editions.map((e) => {
    const st = standings(e, by)
    const t = editionTotals(e.rows)
    const mine = st.filter((r) => r.key === key)
    if (!mine.length) return { edition: e, row: null as Standing | null, goldShare: 0, totalShare: 0, participants: st.length }
    const row = mine[0]
    return {
      edition: e,
      row,
      goldShare: t.gold ? row.gold / t.gold : 0,
      totalShare: row.total / (t.gold + t.silver + t.bronze || 1),
      participants: st.length,
    }
  })
}

/** 在「上屆每天結束的累計」之間做線性內插，取得與本屆相同進度時的成績（推估值） */
export function atProgress(pace: PaceEdition, fraction: number, key: string, year: number): [number, number, number] {
  const target = fraction * pace.totalEvents
  const pts = [{ x: 0, v: [0, 0, 0] as number[] }].concat(
    pace.snapshots.map((s) => {
      const v = [0, 0, 0]
      for (const [code, m] of Object.entries(s.medals)) {
        if (canonical(code, year) === key) m.forEach((x, i) => (v[i] += x))
      }
      return { x: s.eventsDone, v }
    }),
  )
  if (target >= pts[pts.length - 1].x) return pts[pts.length - 1].v as [number, number, number]
  for (let i = 1; i < pts.length; i++) {
    if (target <= pts[i].x) {
      const a = pts[i - 1]
      const b = pts[i]
      const t = b.x === a.x ? 1 : (target - a.x) / (b.x - a.x)
      return a.v.map((x, k) => x + (b.v[k] - x) * t) as [number, number, number]
    }
  }
  return [0, 0, 0]
}

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString('zh-TW', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`

/** 賽事全名 */
export const SERIES_NAME: Record<string, string> = {
  'summer-olympics': '夏季奧林匹克運動會',
  'winter-olympics': '冬季奧林匹克運動會',
  'asian-games': '亞洲運動會',
  'pan-american-games': '泛美運動會',
  'commonwealth-games': '大英國協運動會',
  universiade: '世界大學運動會',
  'european-games': '歐洲運動會',
  'african-games': '非洲運動會',
}

/** 例：「2022 杭州亞洲運動會（2023 年舉行）」 */
export function editionLabel(seriesId: string, e: Pick<Edition, 'year' | 'held' | 'city'>, withHeld = true) {
  const held = withHeld && e.held !== e.year ? `（${e.held} 年舉行）` : ''
  return `${e.year} ${e.city}${SERIES_NAME[seriesId] ?? ''}${held}`
}
