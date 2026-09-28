import { parseMedalsTable, totals } from './wikiMedals.js'
import { latestCheckpoint } from './schedule.js'
import type { Edition, LiveConfig, PaceEdition, Row } from './data'

export interface LiveState {
  rows: Row[]
  /** 這份資料對應的更新時間點（台灣 23:50 起每 6 小時） */
  checkpoint: string
  /** 維基該版本的編輯時間 */
  asOf: string
  revid: number
  /** 'live' = 網頁自己抓到更新時間點的版本並通過檢查；'bundled' = 網站打包時的快照 */
  mode: 'live' | 'bundled'
  note?: string
  goldsAwarded: number
  totalEvents: number
}

const API = 'https://en.wikipedia.org/w/api.php'

/** 網站打包時的快照 */
export function bundledState(bundled: Edition, pace: PaceEdition | undefined, note?: string): LiveState {
  return {
    rows: bundled.rows,
    checkpoint: bundled.src.checkpoint ?? bundled.src.ts,
    asOf: bundled.src.ts,
    revid: bundled.src.revid,
    mode: 'bundled',
    note,
    goldsAwarded: bundled.rows.reduce((s, r) => s + r[1], 0),
    totalEvents: pace?.totalEvents ?? 0,
  }
}

/**
 * 取「最近一個更新時間點」當下的維基獎牌表版本（不是最新版本），讓所有人在同一時段看到同一份數字。
 * 從該時間點往前最多看 10 個版本，取最新一個通過三道檢查的：
 *  1. 解析得到獎牌表
 *  2. 金牌總數不少於快照、也不超過總項目數太多（擋掉誤植與惡意修改）
 *  3. 沒有任何國家的獎牌比快照時還少
 * 都不通過就沿用網站快照並說明原因。
 */
export async function fetchLive(
  cfg: LiveConfig,
  bundled: Edition,
  pace: PaceEdition | undefined,
  now = new Date(),
): Promise<LiveState> {
  const cp = latestCheckpoint(now)
  const fallback = (note?: string): LiveState => bundledState(bundled, pace, note)
  const bundledCp = new Date(bundled.src.checkpoint ?? bundled.src.ts)
  if (cp.getTime() <= bundledCp.getTime()) return fallback() // 快照已經是最近一個時間點
  const totalEvents = pace?.totalEvents ?? 0
  const bundledGold = bundled.rows.reduce((s, r) => s + r[1], 0)
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'revisions',
      titles: cfg.page,
      rvprop: 'ids|timestamp|content',
      rvslots: 'main',
      rvlimit: '10',
      rvdir: 'older',
      rvstart: cp.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      origin: '*',
    })
    const res = await fetch(`${API}?${params}`)
    if (!res.ok) return fallback(`連不上維基百科（HTTP ${res.status}）`)
    const json = await res.json()
    const revs: { revid: number; timestamp: string; slots: { main: { content: string } } }[] =
      json?.query?.pages?.[0]?.revisions ?? []
    let reason = '維基百科沒有回傳資料'
    for (const rev of revs) {
      const parsed = parseMedalsTable(rev.slots.main.content)
      if (!parsed || !parsed.rows.length) {
        reason = '讀不到獎牌表'
        continue
      }
      const g = totals(parsed.rows).gold
      if (g < bundledGold || (totalEvents && g > totalEvents + 5)) {
        reason = `金牌總數（${g}）不合理`
        continue
      }
      const byCode = new Map(parsed.rows.map((r) => [r.code, r]))
      const shrunk = bundled.rows.filter(([code, gg, s, b]) => {
        const r = byCode.get(code)
        return !r || r.gold + r.silver + r.bronze < gg + s + b
      })
      if (shrunk.length) {
        reason = `有國家獎牌變少（${shrunk.map((r) => r[0]).join('、')}）`
        continue
      }
      return {
        rows: parsed.rows.map((r) => [r.code, r.gold, r.silver, r.bronze, r.host ? 'h' : ''] as Row),
        checkpoint: cp.toISOString(),
        asOf: rev.timestamp,
        revid: rev.revid,
        mode: 'live',
        goldsAwarded: g,
        totalEvents,
      }
    }
    return fallback(`更新時間點的維基版本${reason}，暫不採用`)
  } catch {
    return fallback('連不上維基百科')
  }
}

/** 今天是賽會第幾天（以主辦地時間計），以及大會賽程表預定「到今天結束」會完成幾項 */
export function scheduleToday(cfg: LiveConfig, pace: PaceEdition | undefined, now = new Date()) {
  const local = new Intl.DateTimeFormat('en-CA', { timeZone: cfg.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const day0 = new Date(cfg.firstDay + 'T00:00:00Z').getTime()
  const dayN = new Date(cfg.lastDay + 'T00:00:00Z').getTime()
  const today = new Date(local + 'T00:00:00Z').getTime()
  const totalDays = Math.round((dayN - day0) / 864e5) + 1
  const dayIndex = Math.min(totalDays, Math.max(0, Math.round((today - day0) / 864e5) + 1))
  const plannedByToday = pace?.schedule.filter((d) => d.day <= local).at(-1)?.cum ?? 0
  const finished = today > dayN
  return { local, dayIndex, totalDays, plannedByToday, finished }
}
