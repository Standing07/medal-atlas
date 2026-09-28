// 下載各屆獎牌表的維基原始碼到 data-raw/wiki/（不進版控）。
// 來源：英文維基百科 MediaWiki API（https://en.wikipedia.org/w/api.php），內容授權 CC BY-SA 4.0。
// 用法：npm run data:fetch            （已下載過的會跳過）
//       npm run data:fetch -- --force  （全部重抓）
import { mkdir, writeFile, access } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { SERIES, LIVE } from './series.mjs'
import { latestCheckpoint } from '../src/lib/schedule.js'
import { parseMedalsTable } from '../src/lib/wikiMedals.js'

const API = 'https://en.wikipedia.org/w/api.php'
const UA = 'medal-atlas-data/0.1 (https://github.com/Standing07/medal-atlas)'
const OUT = new URL('../data-raw/wiki/', import.meta.url)
const force = process.argv.includes('--force')

export const fileFor = (title) => new URL(title.replace(/[/:]/g, '_') + '.json', OUT)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 一次抓最多 50 頁的最新版本（含 revid、時間戳、內容），自動跟隨轉址 */
async function fetchBatch(titles) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', redirects: '1',
    prop: 'revisions', rvprop: 'ids|timestamp|content', rvslots: 'main',
    titles: titles.join('|'),
  })
  const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const redirects = new Map((json.query.redirects ?? []).map((r) => [r.to, r.from]))
  const normalized = new Map((json.query.normalized ?? []).map((r) => [r.to, r.from]))
  const out = new Map()
  for (const p of json.query.pages) {
    let asked = p.title
    if (redirects.has(asked)) asked = redirects.get(asked)
    if (normalized.has(asked)) asked = normalized.get(asked)
    if (p.missing || !p.revisions) { out.set(asked, null); continue }
    const rev = p.revisions[0]
    out.set(asked, {
      title: p.title, pageid: p.pageid, revid: rev.revid, timestamp: rev.timestamp,
      wikitext: rev.slots.main.content,
    })
  }
  return out
}

async function exists(u) { try { await access(u); return true } catch { return false } }

export async function fetchTitles(titles, { always = false } = {}) {
  await mkdir(OUT, { recursive: true })
  const todo = []
  for (const t of titles) if (always || force || !(await exists(fileFor(t)))) todo.push(t)
  const missing = []
  for (let i = 0; i < todo.length; i += 20) {
    const batch = todo.slice(i, i + 20)
    const got = await fetchBatch(batch)
    for (const t of batch) {
      const page = got.get(t)
      if (!page) { missing.push(t); continue }
      await writeFile(fileFor(t), JSON.stringify({ ...page, fetchedAt: new Date().toISOString() }))
    }
    await sleep(300)
  }
  return { fetched: todo.length - missing.length, missing }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const titles = []
  for (const s of SERIES) for (const y of s.years) titles.push(s.page(y))
  let r = await fetchTitles(titles)
  console.log(`主頁：新抓 ${r.fetched} 頁，找不到 ${r.missing.length} 頁`)
  // 找不到獨立獎牌表頁的屆次 → 改抓賽事主頁（獎牌表寫在主頁裡）
  const fallbacks = []
  for (const s of SERIES) for (const y of s.years) {
    if (r.missing.includes(s.page(y)) && s.fallbackPage) fallbacks.push(s.fallbackPage(y))
  }
  if (fallbacks.length) {
    const r2 = await fetchTitles(fallbacks)
    console.log(`備援頁：新抓 ${r2.fetched} 頁，找不到：`, r2.missing)
  }
  if (r.missing.length) console.log('找不到：', r.missing)
  // 賽程表每次都重抓
  await fetchTitles([LIVE.calendarPage], { always: true })
  // 進行中的賽事：取「最近一個更新時間點」（台灣 23:50 起每 6 小時）當下的版本，與網頁的更新規則一致
  const cp = latestCheckpoint()
  const live = await fetchLiveAt(LIVE.page, cp)
  console.log(`進行中賽事：取 ${cp.toISOString()} 時點的版本（編輯於 ${live.timestamp}）`)
}

/** 取某時間點以前、最新且讀得到獎牌表的版本 */
export async function fetchLiveAt(title, cp) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'revisions', titles: title,
    rvprop: 'ids|timestamp|content', rvslots: 'main', rvlimit: '10', rvdir: 'older',
    rvstart: cp.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  })
  const json = await (await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })).json()
  const p = json.query.pages[0]
  const rev = p.revisions.find((r) => parseMedalsTable(r.slots.main.content)?.rows.length)
  if (!rev) throw new Error(`${title}：${cp.toISOString()} 以前找不到可讀的版本`)
  const page = {
    title: p.title, pageid: p.pageid, revid: rev.revid, timestamp: rev.timestamp,
    checkpoint: cp.toISOString(), wikitext: rev.slots.main.content, fetchedAt: new Date().toISOString(),
  }
  await mkdir(OUT, { recursive: true })
  await writeFile(fileFor(title), JSON.stringify(page))
  return page
}
