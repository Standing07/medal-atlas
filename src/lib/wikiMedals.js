// @ts-check
/**
 * 解析維基百科獎牌表（{{#invoke:Medals table|createTable ...}} 模組）的共用程式。
 * 資料腳本（Node）與網頁即時更新（瀏覽器）共用同一份，確保兩邊算法一致。
 *
 * 維基百科的獎牌表模組把每個國家寫成：
 *   | gold_TPE = 19 | silver_TPE = 20 | bronze_TPE = 28 | host_JPN = yes
 * 代碼是國際奧會（IOC）式的三碼國家代碼。
 */

/**
 * @typedef {{ code: string, gold: number, silver: number, bronze: number, host?: boolean, name?: string }} MedalRow
 */

/** 找出獎牌表模板區塊（大括號配對到結尾），優先取 <onlyinclude> 內的那一個 */
export function findMedalsBlock(wikitext) {
  const clean = wikitext.replace(/<!--[\s\S]*?-->/g, '')
  const onlyStart = clean.indexOf('<onlyinclude>')
  // 兩種寫法都有：{{Medals table | …}} 與 {{#invoke:Medals table|createTable | …}}
  const re = /\{\{\s*(?:#invoke:\s*)?Medals?[ _]table\s*(?:\|\s*createTable\s*)?(?=\||\n)/gi
  /** @type {number[]} */
  const starts = []
  let m
  while ((m = re.exec(clean))) starts.push(m.index)
  if (!starts.length) return null
  let start = starts[0]
  if (onlyStart >= 0) {
    const inside = starts.find((s) => s > onlyStart)
    if (inside !== undefined) start = inside
  }
  let depth = 0
  for (let i = start; i < clean.length - 1; i++) {
    if (clean[i] === '{' && clean[i + 1] === '{') {
      depth++
      i++
    } else if (clean[i] === '}' && clean[i + 1] === '}') {
      depth--
      i++
      if (depth === 0) return clean.slice(start, i + 1)
    }
  }
  return null
}

/** 移除註腳（<ref>…</ref>、<ref …/>）與 {{efn…}} 之類的註記，避免數字被污染 */
function stripNotes(text) {
  return text
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/\{\{\s*(efn|refn|notetag|ref label|sfn|cref)[^{}]*\}\}/gi, '')
}

/**
 * 解析獎牌表區塊 → 國家列。
 * @param {string} wikitext 整頁維基原始碼
 * @returns {{ rows: MedalRow[], host: string[] } | null}
 */
export function parseMedalsTable(wikitext) {
  const block = findMedalsBlock(wikitext)
  if (!block) return null
  const text = stripNotes(block)
  /** @type {Map<string, MedalRow>} */
  const byCode = new Map()
  const get = (code) => {
    let r = byCode.get(code)
    if (!r) {
      r = { code, gold: 0, silver: 0, bronze: 0 }
      byCode.set(code, r)
    }
    return r
  }
  const medalRe = /\|\s*(gold|silver|bronze)_([A-Za-z0-9]{2,5})\s*=\s*(\d+)/g
  let m
  while ((m = medalRe.exec(text))) {
    const r = get(m[2].toUpperCase())
    r[/** @type {'gold'|'silver'|'bronze'} */ (m[1])] = Number(m[3])
  }
  /** @type {string[]} */
  const host = []
  const hostRe = /\|\s*host_([A-Za-z0-9]{2,5})\s*=\s*(yes|y|true|1)\b/gi
  while ((m = hostRe.exec(text))) {
    const code = m[1].toUpperCase()
    host.push(code)
    if (byCode.has(code)) get(code).host = true
  }
  const rows = [...byCode.values()].filter((r) => r.gold + r.silver + r.bronze > 0)
  return { rows: sortRows(rows), host }
}

/** 依國際奧會慣例排序：金→銀→銅，同分依代碼字母 */
export function sortRows(rows) {
  return [...rows].sort(
    (a, b) =>
      b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.code.localeCompare(b.code),
  )
}

/** 加總整屆的金銀銅 */
export function totals(rows) {
  return rows.reduce(
    (t, r) => ({ gold: t.gold + r.gold, silver: t.silver + r.silver, bronze: t.bronze + r.bronze }),
    { gold: 0, silver: 0, bronze: 0 },
  )
}

/**
 * 解析維基「賽程表」模板的「Cumulative total」列 → 每天結束時累計完成的金牌項目數。
 * @param {string} wikitext
 * @returns {number[] | null}
 */
export function parseCumulative(wikitext) {
  const i = wikitext.search(/Cumulative total/i)
  if (i < 0) return null
  const tail = wikitext.slice(i)
  const end = tail.indexOf('|-')
  const seg = end > 0 ? tail.slice(0, end) : tail
  /** @type {number[]} */
  const out = []
  for (const line of seg.split('\n').slice(1)) {
    if (/<!--\s*Events\s*-->/i.test(line)) continue // 最右邊的「總項目數」欄不是某一天
    const raw = line.replace(/<!--[\s\S]*?-->/g, '').trim()
    if (!/^[!|]/.test(raw)) continue // 空行或非表格列
    const cell = raw.replace(/^[!|]\s*/, '').replace(/'''/g, '').trim()
    if (/^\d+$/.test(cell)) out.push(Number(cell))
    else if (cell === '') out.push(0)
  }
  return out.length ? out : null
}

/**
 * 備用解析：少數舊頁面沒用模板，而是手寫表格，一列一國：
 *   | 1 ||align=left| {{flagPASO|USA|1955}} || {{nts|81}}/{{nts|88}} || {{nts|58}} || …
 * 出現「81/88」代表不同來源數字不一，取第一個值並標記 disputed。
 * @param {string} wikitext
 * @returns {{ rows: (MedalRow & { disputed?: boolean })[], host: string[] } | null}
 */
export function parseWikitableMedals(wikitext) {
  const text = stripNotes(wikitext.replace(/<!--[\s\S]*?-->/g, ''))
  /** @type {Map<string, MedalRow & { disputed?: boolean }>} */
  const byCode = new Map()
  for (const line of text.split('\n')) {
    if (!line.startsWith('|') || !line.includes('||')) continue
    const cells = line.split('||')
    const fi = cells.findIndex((c) => /\{\{\s*flag[A-Za-z0-9 ]*\|\s*[A-Z]{3}\b/.test(c))
    if (fi < 0) continue
    const code = /** @type {RegExpMatchArray} */ (cells[fi].match(/\{\{\s*flag[A-Za-z0-9 ]*\|\s*([A-Z]{3})\b/))[1]
    const nums = cells.slice(fi + 1, fi + 4).map((c) => {
      const vals = [...c.replace(/\{\{\s*(?:nts|ntsh)\s*\|\s*(\d+)\s*\}\}/g, '$1').matchAll(/\d+/g)].map((x) => Number(x[0]))
      return { v: vals[0], disputed: vals.length > 1 }
    })
    if (nums.length < 3 || nums.some((n) => n.v === undefined)) continue
    if (byCode.has(code)) continue // 同一頁若有第二張表（例如更正表），只取第一張
    byCode.set(code, {
      code,
      gold: nums[0].v,
      silver: nums[1].v,
      bronze: nums[2].v,
      ...(nums.some((n) => n.disputed) ? { disputed: true } : {}),
    })
  }
  const rows = [...byCode.values()].filter((r) => r.gold + r.silver + r.bronze > 0)
  return rows.length ? { rows: sortRows(rows), host: [] } : null
}
