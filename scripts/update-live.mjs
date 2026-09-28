// 排程用的輕量更新：只更新「進行中的賽事」，不重抓全部歷屆（避免每 6 小時對維基送上千個請求）。
//  1. 總獎牌表：取最近一個更新時間點（台灣 23:50 起每 6 小時）的版本，寫回 public/data/medals.json
//  2. 分項運動：同一時間點的各運動頁，寫回 public/data/sports.json
//  （每日累計另由 scripts/fetch-pace.mjs 更新）
// 賽事閉幕兩天後自動不做事。
import { readFile, writeFile } from 'node:fs/promises'
import { LIVE } from './series.mjs'
import { fetchLiveAt } from './fetch-wiki.mjs'
import { latestCheckpoint } from '../src/lib/schedule.js'
import { parseMedalsTable, totals } from '../src/lib/wikiMedals.js'
import { SPORT_BY_EN } from '../src/lib/sports.js'
import { getJson, sleep } from './sport-links.mjs'

const now = new Date()
const end = new Date(LIVE.lastDay + 'T00:00:00Z')
end.setUTCDate(end.getUTCDate() + 2)
if (now > end) {
  console.log(`${LIVE.lastDay} 已閉幕超過兩天，不更新`)
  process.exit(0)
}

const MEDALS = new URL('../public/data/medals.json', import.meta.url)
const SPORTS = new URL('../public/data/sports.json', import.meta.url)
const cp = latestCheckpoint(now)
const cpIso = cp.toISOString().replace(/\.\d{3}Z$/, 'Z')

// 1. 總獎牌表
const medals = JSON.parse(await readFile(MEDALS, 'utf8'))
const ed = medals.series.find((s) => s.id === LIVE.series).editions.find((e) => e.year === LIVE.year)
const page = await fetchLiveAt(LIVE.page, cp)
const parsed = parseMedalsTable(page.wikitext)
const oldGold = ed.rows.reduce((s, r) => s + r[1], 0)
const newGold = totals(parsed.rows).gold
if (newGold < oldGold) {
  console.log(`⚠️ 新版本金牌 ${newGold} 少於目前 ${oldGold}，可能是編輯中的版本，這次不更新總表`)
} else {
  ed.rows = parsed.rows.map((r) => (r.host || parsed.host.includes(r.code) ? [r.code, r.gold, r.silver, r.bronze, 'h'] : [r.code, r.gold, r.silver, r.bronze]))
  ed.src = { title: page.title, revid: page.revid, ts: page.timestamp, checkpoint: page.checkpoint }
  medals.generatedAt = now.toISOString()
  await writeFile(MEDALS, JSON.stringify(medals))
  console.log(`總表：${cpIso} 時點，金牌 ${oldGold} → ${newGold}`)
}

// 2. 分項運動
const ev = `${LIVE.year} Asian Games`
const links = await getJson({ action: 'parse', page: ev, prop: 'links', format: 'json', formatversion: '2', redirects: '1' })
const xs = [...new Set((links.parse?.links ?? []).filter((l) => l.ns === 0 && l.title.endsWith(` at the ${ev}`)).map((l) => l.title.slice(0, -` at the ${ev}`.length)))].filter((x) => SPORT_BY_EN[x])
const bySport = {}
for (const x of xs) {
  const j = await getJson({
    action: 'query', format: 'json', formatversion: '2', redirects: '1', prop: 'revisions',
    rvprop: 'content', rvslots: 'main', rvlimit: '1', rvdir: 'older', rvstart: cpIso, titles: `${x} at the ${ev}`,
  })
  const content = j.query.pages[0].revisions?.[0]?.slots.main.content
  const rows = content && parseMedalsTable(content)?.rows
  if (rows?.length) bySport[SPORT_BY_EN[x][0]] = rows.map((r) => [r.code, r.gold, r.silver, r.bronze])
  await sleep(200)
}
const sports = JSON.parse(await readFile(SPORTS, 'utf8'))
const key = `${LIVE.series}-${LIVE.year}`
const totalMedals = ed.rows.reduce((s, r) => s + r[1] + r[2] + r[3], 0)
const sportMedals = Object.values(bySport).flat().reduce((s, r) => s + r[1] + r[2] + r[3], 0)
sports.editions[key] = bySport
sports.coverage[key] = { complete: false, ratio: totalMedals ? Math.round(Math.min(1, sportMedals / totalMedals) * 1000) / 1000 : 0, nDiffs: 0 }
sports.generatedAt = now.toISOString()
await writeFile(SPORTS, JSON.stringify(sports))
console.log(`分項：${Object.keys(bySport).length} 個運動，涵蓋 ${sportMedals}/${totalMedals} 面`)
