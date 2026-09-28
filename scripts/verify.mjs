// 資料查核（第二來源＋穩定度），結果寫到 data-raw/verify.json 供內部品管（網站只把 Olympedia 列為來源）。
//
// A. 維基穩定度：拿每屆獎牌表「現在」和「一年前」「兩年前」的版本比對，
//    數字被改過的國家列出來（可能是禁藥追回獎牌的正當更正，也可能是編輯戰）。
// B. 奧運第二來源：Olympedia（國際奧會合作的奧運資料庫，https://www.olympedia.org）
//    每屆總覽頁的獎牌榜（前段班國家）＋中華台北國家頁（歷屆全部）。
//    Olympedia robots.txt 要求每次請求間隔 10 秒，本腳本遵守。
//
// 用法：npm run data:verify（約 12 分鐘，Olympedia 部分有快取，第二次很快）
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { parseMedalsTable, parseWikitableMedals } from '../src/lib/wikiMedals.js'
import { canonical } from '../src/lib/countries.js'

const API = 'https://en.wikipedia.org/w/api.php'
const UA = 'medal-atlas-data/0.1 (https://github.com/Standing07/medal-atlas)'
const OLY = 'https://www.olympedia.org'
const CACHE = new URL('../data-raw/olympedia/', import.meta.url)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const medals = JSON.parse(await readFile(new URL('../public/data/medals.json', import.meta.url), 'utf8'))

const toMap = (rows, year) => {
  const m = new Map()
  for (const r of rows) {
    const c = canonical(r.code ?? r[0], year)
    const v = r.code ? [r.gold, r.silver, r.bronze] : [r[1], r[2], r[3]]
    const prev = m.get(c) ?? [0, 0, 0]
    m.set(c, prev.map((x, i) => x + v[i]))
  }
  return m
}
const diff = (a, b) => {
  const out = []
  for (const code of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(code) ?? [0, 0, 0]
    const y = b.get(code) ?? [0, 0, 0]
    if (x.some((v, i) => v !== y[i])) out.push({ code, ours: x, other: y })
  }
  return out
}

// ---------- A. 維基穩定度 ----------
async function revisionAt(title, iso) {
  const p = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'revisions', titles: title,
    rvprop: 'ids|timestamp|content', rvslots: 'main', rvlimit: '1', rvdir: 'older', rvstart: iso,
  })
  const j = await (await fetch(`${API}?${p}`, { headers: { 'User-Agent': UA } })).json()
  const r = j.query.pages[0].revisions?.[0]
  return r ? { revid: r.revid, ts: r.timestamp, wikitext: r.slots.main.content } : null
}

const verify = { generatedAt: new Date().toISOString(), editions: {}, tpe: null }
const now = Date.now()
for (const s of medals.series) {
  for (const e of s.editions) {
    if (e.live) continue
    const key = `${s.id}-${e.year}`
    const ours = toMap(e.rows, e.year)
    const changes = []
    for (const years of [1, 2]) {
      const iso = new Date(now - years * 365 * 864e5).toISOString().replace(/\.\d{3}Z$/, 'Z')
      const old = await revisionAt(e.src.title, iso)
      await sleep(150)
      if (!old) continue
      const parsed = parseMedalsTable(old.wikitext) ?? parseWikitableMedals(old.wikitext)
      if (!parsed || !parsed.rows.length) continue
      const d = diff(ours, toMap(parsed.rows, e.year))
      if (d.length) changes.push({ yearsAgo: years, revid: old.revid, ts: old.ts, diffs: d })
    }
    verify.editions[key] = { wikiChanges: changes }
    if (changes.length) console.log(`維基近年有改動 ${key}：`, changes.map((c) => `${c.yearsAgo}年前 ${c.diffs.length} 國`).join('、'))
  }
}

// ---------- B. Olympedia ----------
async function exists(u) {
  try {
    await access(u)
    return true
  } catch {
    return false
  }
}
async function olyGet(path) {
  await mkdir(CACHE, { recursive: true })
  const f = new URL(path.replace(/^\//, '').replace(/\//g, '_') + '.html', CACHE)
  if (await exists(f)) return readFile(f, 'utf8')
  await sleep(10_000) // robots.txt Crawl-delay: 10
  const res = await fetch(OLY + path, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Olympedia ${path} HTTP ${res.status}`)
  const html = await res.text()
  await writeFile(f, html)
  return html
}

const list = await olyGet('/editions')
const olySection = list.slice(list.indexOf('<h2>Olympic Games</h2>'), list.indexOf('<h2>Intercalated Games</h2>'))
const editionIds = { summer: {}, winter: {} }
// Olympedia 以 <h3>Summer</h3>、<h3>Winter</h3>、<h3>Equestrian</h3>（1956 馬術分場）分表；只取前兩張
for (const part of olySection.split('<h3>').slice(1)) {
  const season = part.startsWith('Summer') ? 'summer' : part.startsWith('Winter') ? 'winter' : null
  if (!season) continue
  for (const m of part.matchAll(/<a href="\/editions\/(\d+)">(\d{4})<\/a>/g)) editionIds[season][m[2]] = m[1]
}

for (const [season, sid] of [['summer', 'summer-olympics'], ['winter', 'winter-olympics']]) {
  const s = medals.series.find((x) => x.id === sid)
  for (const e of s.editions) {
    const id = editionIds[season][e.year]
    if (!id) continue
    const html = await olyGet(`/editions/${id}`)
    const i = html.indexOf('<h2>Medal table</h2>')
    if (i < 0) continue
    const seg = html.slice(i, html.indexOf('</table>', i))
    const rows = []
    for (const tr of seg.split('<tr>').slice(2)) {
      const code = tr.match(/\/countries\/([A-Z0-9]{3})/)?.[1]
      const nums = [...tr.matchAll(/<td>(\d+)<\/td>/g)].map((m) => Number(m[1]))
      if (code && nums.length >= 3) rows.push({ code, gold: nums[0], silver: nums[1], bronze: nums[2] })
    }
    // 同一支隊伍在兩個來源的代碼不同（已逐一對照隊名確認）
    const alias = (c) =>
      c === 'MIX' ? 'ZZX' // 混合隊
        : c === 'WIF' ? 'BWI' // 1960 西印度群島聯隊
          : c === 'IOA' && e.year === 1992 ? 'IOP' // 1992 獨立奧運參賽者
            : c === 'SCG' && e.year <= 2000 ? 'YUG' // 1996、2000 南斯拉夫聯邦共和國
              : c === 'GER' && e.year >= 1956 && e.year <= 1964 ? 'EUA' // 1956–1964 德國聯隊
                : c
    for (const r of rows) r.code = alias(r.code)
    const ours = toMap(e.rows, e.year)
    const theirs = toMap(rows, e.year)
    // Olympedia 總覽頁只列前段班，所以只比對它有列出的國家
    const d = diff(new Map([...ours].filter(([c]) => theirs.has(c))), theirs)
    const key = `${sid}-${e.year}`
    verify.editions[key] = { ...verify.editions[key], olympedia: { id, compared: theirs.size, diffs: d } }
    console.log(`Olympedia ${key}：比對 ${theirs.size} 國，${d.length ? `⚠️ ${d.length} 國不同` : '✓ 全部相符'}`)
  }
}

// 中華台北國家頁：歷屆奧運（夏＋冬）逐屆獎牌
const tpeHtml = await olyGet('/countries/TPE')
const tpeRows = []
for (const tr of tpeHtml.split('<tr>')) {
  const ed = tr.match(/\/editions\/(\d+)">(\d{4}) (Summer|Winter) Olympics/)
  if (!ed) continue
  const nums = [...tr.matchAll(/<td[^>]*>\s*(\d+)\s*<\/td>/g)].map((m) => Number(m[1]))
  if (nums.length >= 4) {
    const [g, s, b] = nums.slice(-4, -1)
    tpeRows.push({ year: Number(ed[2]), season: ed[3].toLowerCase(), gold: g, silver: s, bronze: b })
  }
}
verify.tpe = { source: `${OLY}/countries/TPE`, rows: tpeRows }
console.log('Olympedia 中華台北：', tpeRows.filter((r) => r.gold + r.silver + r.bronze).map((r) => `${r.year}${r.season[0]} ${r.gold}/${r.silver}/${r.bronze}`).join('；'))

// 查核報告只供內部品管，不放上網站
await writeFile(new URL('../data-raw/verify.json', import.meta.url), JSON.stringify(verify, null, 1))
console.log('✓ 寫入 data-raw/verify.json')
