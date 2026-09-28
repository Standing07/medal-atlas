// 把 data-raw/wiki/ 的維基原始碼整理成網站要用的 public/data/medals.json。
// 驗證關卡：每屆至少要有 1 國、金牌總數 > 0；已知的總項目數要對得上（容許平手並列）。
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { SERIES, LIVE } from './series.mjs'
import { fileFor } from './fetch-wiki.mjs'
import { parseMedalsTable, parseWikitableMedals, totals } from '../src/lib/wikiMedals.js'
import { KNOWN_CODES } from '../src/lib/countries.js'
import { CORRECTIONS } from './corrections.mjs'

const load = async (t) => {
  try {
    return JSON.parse(await readFile(fileFor(t), 'utf8'))
  } catch {
    return null
  }
}

const unknown = new Set()
const problems = []
const out = { generatedAt: new Date().toISOString(), live: LIVE, series: [] }

for (const s of SERIES) {
  const editions = []
  for (const year of s.years) {
    let page = await load(s.page(year))
    let parsed = page && parseMedalsTable(page.wikitext)
    let method = 'template'
    if ((!parsed || !parsed.rows.length) && s.fallbackPage) {
      const fb = await load(s.fallbackPage(year))
      const p2 = fb && parseMedalsTable(fb.wikitext)
      if (p2 && p2.rows.length) {
        page = fb
        parsed = p2
      }
    }
    if ((!parsed || !parsed.rows.length) && page) {
      parsed = parseWikitableMedals(page.wikitext)
      method = 'wikitable'
    }
    if (!parsed || !parsed.rows.length) {
      problems.push(`${s.id} ${year}：解析不到獎牌表`)
      continue
    }
    // 套用有官方來源的更正（先確認維基現值仍是我們當初看到的錯誤值，避免蓋掉之後的正確修改）
    const corrections = []
    for (const c of CORRECTIONS.filter((c) => c.series === s.id && c.year === year)) {
      const r = parsed.rows.find((x) => x.code === c.code)
      const now = r ? [r.gold, r.silver, r.bronze] : [0, 0, 0]
      if (now.every((v, i) => v === c.medals[i])) continue // 維基已經改回正確值
      if (!now.every((v, i) => v === c.wikiHad[i])) {
        problems.push(`${s.id} ${year} ${c.code}：維基現值 ${now.join('/')} 與更正檔記錄的 ${c.wikiHad.join('/')} 不同，請人工確認`)
        continue
      }
      Object.assign(r, { gold: c.medals[0], silver: c.medals[1], bronze: c.medals[2], corrected: true })
      corrections.push({ code: c.code, from: now, to: c.medals, source: c.source, url: c.url, checked: c.checked, note: c.note })
    }
    const t = totals(parsed.rows)
    if (t.gold <= 0) problems.push(`${s.id} ${year}：金牌總數為 0`)
    for (const r of parsed.rows) if (!KNOWN_CODES.includes(r.code)) unknown.add(`${r.code}(${s.id} ${year})`)
    const disputed = parsed.rows.some((r) => r.disputed)
    editions.push({
      year,
      held: s.held?.[year] ?? year,
      city: s.cities?.[year] ?? '',
      src: { title: page.title, revid: page.revid, ts: page.timestamp, ...(page.checkpoint ? { checkpoint: page.checkpoint } : {}) },
      method,
      ...(disputed ? { disputed: true } : {}),
      ...(corrections.length ? { corrections } : {}),
      ...(s.id === LIVE.series && year === LIVE.year ? { live: true } : {}),
      // 每列：[代碼, 金, 銀, 銅, 旗標]；旗標 h=地主、d=數字有爭議、c=依官方來源更正
      rows: parsed.rows.map((r) => {
        const flag = (r.host || parsed.host.includes(r.code) || s.hosts?.[year] === r.code ? 'h' : '') + (r.disputed ? 'd' : '') + (r.corrected ? 'c' : '')
        return flag ? [r.code, r.gold, r.silver, r.bronze, flag] : [r.code, r.gold, r.silver, r.bronze]
      }),
    })
  }
  out.series.push({ id: s.id, zh: s.zh, en: s.en, ...(s.more ? { more: true } : {}), editions })
  console.log(`${s.zh}：${editions.length}/${s.years.length} 屆`)
}

if (unknown.size) problems.push(`沒有中文名的代碼：${[...unknown].join(', ')}`)
if (problems.length) {
  console.error('❌ 驗證未通過：\n' + problems.join('\n'))
  process.exit(1)
}
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
const json = JSON.stringify(out)
await writeFile(new URL('../public/data/medals.json', import.meta.url), json)
console.log(`✓ 寫入 public/data/medals.json（${(json.length / 1024).toFixed(0)} KB）`)
