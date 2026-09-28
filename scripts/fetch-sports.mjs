// 第二步：下載每屆每個運動的維基頁面，解析各國獎牌 → public/data/sports.json
// 驗證關卡：同一屆「各運動加總」必須等於該屆總獎牌表（逐國比對），對得上才標為完整。
// 用法：npm run data:sports（已下載的頁面會快取在 data-raw/sports/）
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { parseMedalsTable } from '../src/lib/wikiMedals.js'
import { SPORT_BY_EN } from '../src/lib/sports.js'
import { canonical } from '../src/lib/countries.js'
import { getJson, sleep } from './sport-links.mjs'
import { LIVE } from './series.mjs'
import { latestCheckpoint } from '../src/lib/schedule.js'

const RAW = new URL('../data-raw/sports/', import.meta.url)
const links = JSON.parse(await readFile(new URL('../data-raw/sport-links.json', import.meta.url), 'utf8'))
const medals = JSON.parse(await readFile(new URL('../public/data/medals.json', import.meta.url), 'utf8'))
const force = process.argv.includes('--force')
const exists = async (u) => access(u).then(() => true, () => false)
const fileFor = (t) => new URL(t.replace(/[/:]/g, '_') + '.json', RAW)

/** 沒有獎牌表模板時（多為團體運動）：從得牌名單表抓國旗，每列依序是 金、銀、銅（銅可能 2 個） */
function parseMedalistTables(wikitext) {
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
  const heads = [...text.matchAll(/==\s*(Medal summary|Medalists|Medallists|Medal winners|Results summary|Podium|Winners)\s*==/gi)].map((m) => m.index)
  if (!heads.length) return null
  const tables = []
  for (const start of heads) {
    const sect = text.slice(start)
    const tStart = sect.indexOf('{|')
    if (tStart < 0) continue
    const tEnd = sect.indexOf('\n|}', tStart)
    const t = sect.slice(tStart, tEnd > 0 ? tEnd : undefined)
    if (!tables.includes(t)) tables.push(t)
  }
  const table = tables.join('\n|-\n')
  const by = new Map()
  const add = (c, k) => {
    const r = by.get(c) ?? { code: c, gold: 0, silver: 0, bronze: 0 }
    r[k]++
    by.set(c, r)
  }
  for (const row of table.split(/\n\|-/).slice(1)) {
    const codes = [...row.matchAll(/\{\{\s*[Ff]lag[^{}]*?\|\s*([A-Z]{3})\s*(?=\||\}\})/g)].map((m) => m[1])
    if (codes.length === 1) {
      // 一列一面牌、以 Gold／Silver／Bronze 標示的舊式表格
      const kind = /\bgold\b/i.test(row) ? 'gold' : /\bsilver\b/i.test(row) ? 'silver' : /\bbronze\b|cc9966/i.test(row) ? 'bronze' : null
      if (kind) add(codes[0], kind)
      continue
    }
    if (codes.length < 2) continue
    add(codes[0], 'gold')
    add(codes[1], 'silver')
    for (const c of codes.slice(2, 4)) add(c, 'bronze')
  }
  return by.size ? [...by.values()] : null
}

/** 單一項目的運動：資訊框直接寫 gold = {{flagIOC|YUG}}、silver = …、bronze = … */
function parseInfobox(wikitext) {
  const text = wikitext.slice(0, 6000)
  const by = new Map()
  for (const kind of ['gold', 'silver', 'bronze']) {
    const m = text.match(new RegExp(`\\|\\s*${kind}\\s*=([^\\n]*)`, 'i'))
    if (!m) continue
    for (const c of [...m[1].matchAll(/\{\{\s*[Ff]lag[^{}]*?\|\s*([A-Z]{3})\s*(?=\||\}\})/g)].map((x) => x[1])) {
      const r = by.get(c) ?? { code: c, gold: 0, silver: 0, bronze: 0 }
      r[kind]++
      by.set(c, r)
    }
  }
  // 另一種寫法：men_gold = ARG、goldNOC = SWE、bronze2NOC = …（直接寫代碼）
  if (!by.size) {
    for (const m of text.matchAll(/\|\s*(?:\w+_)?(gold|silver|bronze)\d?(?:NOC)?\s*=\s*([A-Z]{3})\b/gi)) {
      const kind = m[1].toLowerCase()
      const r = by.get(m[2]) ?? { code: m[2], gold: 0, silver: 0, bronze: 0 }
      r[kind]++
      by.set(m[2], r)
    }
  }
  // 再一種：「'''Gold Medal''' – {{fbo|FRA}}」
  if (!by.size) {
    for (const m of wikitext.matchAll(/'''(Gold|Silver|Bronze) Medal'''[^\n{]{0,30}\{\{\s*[A-Za-z]{2,12}\s*\|\s*([A-Z]{3})\b/g)) {
      const kind = m[1].toLowerCase()
      const r = by.get(m[2]) ?? { code: m[2], gold: 0, silver: 0, bronze: 0 }
      r[kind]++
      by.set(m[2], r)
    }
  }
  // 最終名次表：「[[File:Gold medal icon.svg…]]」下一格是 {{bb|USA}} 這類隊伍模板
  if (!by.size) {
    for (const m of wikitext.matchAll(/(Gold|Silver|Bronze) medal icon[^\n]*\n[^\n]*?\{\{\s*[A-Za-z]{1,12}\s*\|\s*([A-Z]{3})\b/g)) {
      const kind = m[1].toLowerCase()
      const r = by.get(m[2]) ?? { code: m[2], gold: 0, silver: 0, bronze: 0 }
      r[kind]++
      by.set(m[2], r)
    }
  }
  const rows = [...by.values()]
  return rows.some((r) => r.gold) ? rows : null
}

await mkdir(RAW, { recursive: true })
// 需要的頁面
const want = []
for (const [key, { event, xs }] of Object.entries(links)) {
  for (const x of xs) if (SPORT_BY_EN[x]) want.push({ key, title: `${x} at the ${event}`, sport: SPORT_BY_EN[x][0] })
}
const liveKey = `${LIVE.series}-${LIVE.year}`
const todo = []
for (const w of want) if (w.key !== liveKey && (force || !(await exists(fileFor(w.title))))) todo.push(w.title)
// 進行中的賽事：每個運動頁都取「最近一個更新時間點」的版本，與總表同一時間
const cp = latestCheckpoint().toISOString().replace(/\.\d{3}Z$/, 'Z')
for (const w of want.filter((x) => x.key === liveKey)) {
  const j = await getJson({
    action: 'query', format: 'json', formatversion: '2', redirects: '1', prop: 'revisions',
    rvprop: 'ids|timestamp|content', rvslots: 'main', rvlimit: '1', rvdir: 'older', rvstart: cp, titles: w.title,
  })
  const p = j.query.pages[0]
  if (p.revisions) {
    const r = p.revisions[0]
    await writeFile(fileFor(w.title), JSON.stringify({ title: p.title, revid: r.revid, ts: r.timestamp, wikitext: r.slots.main.content }))
  }
  await sleep(200)
}
console.log(`進行中賽事分項：取 ${cp} 時點版本`)
for (let i = 0; i < todo.length; i += 10) {
  const batch = todo.slice(i, i + 10)
  const j = await getJson({
    action: 'query', format: 'json', formatversion: '2', redirects: '1', prop: 'revisions',
    rvprop: 'ids|timestamp|content', rvslots: 'main', titles: batch.join('|'),
  })
  const redirects = new Map((j.query.redirects ?? []).map((r) => [r.to, r.from]))
  for (const p of j.query.pages) {
    const asked = redirects.get(p.title) ?? p.title
    if (!p.revisions) continue
    const r = p.revisions[0]
    await writeFile(fileFor(asked), JSON.stringify({ title: p.title, revid: r.revid, ts: r.timestamp, wikitext: r.slots.main.content }))
  }
  if (i % 100 === 0) console.log(`下載 ${i + batch.length}/${todo.length}`)
  await sleep(400)
}

// 解析＋逐屆驗證
const out = { generatedAt: new Date().toISOString(), editions: {}, coverage: {} }
for (const [key, { xs }] of Object.entries(links)) {
  const [sid, yearStr] = [key.slice(0, key.lastIndexOf('-')), key.slice(key.lastIndexOf('-') + 1)]
  const year = Number(yearStr)
  const ed = medals.series.find((s) => s.id === sid)?.editions.find((e) => e.year === year)
  if (!ed) continue
  const bySport = {}
  const notes = []
  for (const x of xs) {
    const m = SPORT_BY_EN[x]
    if (!m) continue
    const f = fileFor(`${x} at the ${links[key].event}`)
    if (!(await exists(f))) continue
    const page = JSON.parse(await readFile(f, 'utf8'))
    let rows = parseMedalsTable(page.wikitext)?.rows
    let how = 'table'
    if (!rows?.length && key !== liveKey) {
      rows = parseMedalistTables(page.wikitext)
      how = 'medalists'
    }
    if (!rows?.length && key !== liveKey) {
      rows = parseInfobox(page.wikitext)
      how = 'infobox'
    }
    if (!rows?.length) {
      notes.push(`${x}：讀不到得牌資料`)
      continue
    }
    const prev = bySport[m[0]]
    if (prev) {
      notes.push(`${x}：與同運動另一頁重複，略過`)
      continue
    }
    bySport[m[0]] = { how, src: { title: page.title, revid: page.revid }, rows: rows.map((r) => [r.code, r.gold, r.silver, r.bronze]) }
  }
  const total = new Map()
  for (const [c, g, sv, b] of ed.rows) {
    const k = canonical(c, year)
    const v = total.get(k) ?? [0, 0, 0]
    total.set(k, [v[0] + g, v[1] + sv, v[2] + b])
  }
  // 挑選：有些頁面是表演賽（不計入正式獎牌）或與別頁重複（例：Nordic skiing 總頁）。
  // 逐一試「拿掉／放回」每個運動，只要能讓各運動加總更接近總表就採用，直到無法再改善。
  const sumOf = (ids) => {
    const m = new Map()
    for (const id of ids)
      for (const [c, g, sv, b] of bySport[id].rows) {
        const k = canonical(c, year)
        const v = m.get(k) ?? [0, 0, 0]
        m.set(k, [v[0] + g, v[1] + sv, v[2] + b])
      }
    return m
  }
  const cost = (ids) => {
    const m = sumOf(ids)
    let d = 0
    for (const k of new Set([...m.keys(), ...total.keys()])) {
      const a = m.get(k) ?? [0, 0, 0]
      const b = total.get(k) ?? [0, 0, 0]
      d += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
    }
    return d
  }
  let chosen = new Set(Object.keys(bySport))
  let best = cost(chosen)
  for (let improved = true; improved; ) {
    improved = false
    for (const id of Object.keys(bySport)) {
      const trial = new Set(chosen)
      if (trial.has(id)) trial.delete(id)
      else trial.add(id)
      const c = cost(trial)
      if (c < best) {
        best = c
        chosen = trial
        improved = true
      }
    }
  }
  for (const id of Object.keys(bySport)) if (!chosen.has(id)) {
    notes.push(`${id}：加進來反而與總表差更多（多為表演賽或重複頁），不計`)
    delete bySport[id]
  }
  const sum = sumOf(chosen)
  const diffs = []
  for (const k of new Set([...sum.keys(), ...total.keys()])) {
    const a = sum.get(k) ?? [0, 0, 0]
    const b = total.get(k) ?? [0, 0, 0]
    if (a.some((v, i) => v !== b[i])) diffs.push(`${k} 各運動加總 ${a.join('/')} vs 總表 ${b.join('/')}`)
  }
  const matchedCountries = [...total.keys()].filter((k) => {
    const a = sum.get(k) ?? [0, 0, 0]
    const b = total.get(k)
    return a.every((v, i) => v === b[i])
  })
  out.editions[key] = Object.fromEntries(Object.entries(bySport).map(([id, s]) => [id, s.rows]))
  const totalMedals = [...total.values()].reduce((s, v) => s + v[0] + v[1] + v[2], 0)
  const ratio = totalMedals ? Math.max(0, 1 - best / totalMedals) : 0
  out.coverage[key] = { complete: diffs.length === 0, ratio: Math.round(ratio * 1000) / 1000, matched: matchedCountries, diffs: diffs.slice(0, 12), nDiffs: diffs.length, notes }
}
await mkdir(new URL('../data-raw/', import.meta.url), { recursive: true })
await writeFile(new URL('../data-raw/sports-report.json', import.meta.url), JSON.stringify(out.coverage, null, 1))
const complete = Object.values(out.coverage).filter((c) => c.complete).length
console.log(`完整（各運動加總＝總表）：${complete}/${Object.keys(out.coverage).length} 屆`)
for (const [k, c] of Object.entries(out.coverage)) if (!c.complete) console.log(`  ${k}：${c.nDiffs} 國不符，例：${c.diffs.slice(0, 2).join('；')}`)
await writeFile(new URL('../public/data/sports.json', import.meta.url), JSON.stringify(out))
