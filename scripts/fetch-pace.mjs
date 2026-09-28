// 重建「每天結束時各國累計獎牌」：用維基獎牌表頁的歷史版本，逐日取當天賽事結束後的版本。
// 驗證關卡：取到的版本「金牌總數」必須等於大會賽程表當天累計完成的金牌項目數，
// 對不上就在附近時段找下一個版本；都找不到才標記 approx（網站會註明）。
// 來源：英文維基百科頁面歷史（CC BY-SA 4.0）；賽程累計數出自維基賽程表模板，其來源為大會官方每日賽程。
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { parseMedalsTable, parseCumulative, totals } from '../src/lib/wikiMedals.js'
import { fileFor, fetchTitles } from './fetch-wiki.mjs'

const API = 'https://en.wikipedia.org/w/api.php'
const UA = 'medal-atlas-data/0.1 (https://github.com/Standing07/medal-atlas)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const EDITIONS = [
  {
    key: 'asian-games-2022',
    page: '2022 Asian Games medal table',
    calendar: 'Template:2022 Asian Games calendar',
    utcOffset: 8, // 杭州 UTC+8
    firstMedalDay: '2023-09-24',
    // 賽程表欄位從 9/19 開始，前 5 天沒有決賽
    calendarStartDay: '2023-09-19',
  },
  {
    key: 'asian-games-2026',
    page: '2026 Asian Games medal table',
    calendar: 'Template:2026 Asian Games calendar',
    utcOffset: 9, // 名古屋 UTC+9
    firstMedalDay: '2026-09-20',
    calendarStartDay: '2026-09-10',
  },
]

const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** 當地時間 → UTC ISO 字串 */
const localToUtc = (day, hour, offset) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCHours(hour - offset)
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

async function revisionsBetween(title, fromUtc, toUtc) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'revisions', titles: title,
    rvprop: 'ids|timestamp|content', rvslots: 'main', rvlimit: '50', rvdir: 'newer',
    rvstart: fromUtc, rvend: toUtc,
  })
  const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })
  const json = await res.json()
  return (json.query.pages[0].revisions ?? []).map((r) => ({
    revid: r.revid, timestamp: r.timestamp, wikitext: r.slots.main.content,
  }))
}

async function latestBefore(title, utc) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'revisions', titles: title,
    rvprop: 'ids|timestamp|content', rvslots: 'main', rvlimit: '1', rvdir: 'older', rvstart: utc,
  })
  const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })
  const r = (await res.json()).query.pages[0].revisions?.[0]
  return r ? { revid: r.revid, timestamp: r.timestamp, wikitext: r.slots.main.content } : null
}

const now = new Date()
const out = {}
for (const ed of EDITIONS) {
  await fetchTitles([ed.calendar], { always: true })
  const cal = JSON.parse(await readFile(fileFor(ed.calendar), 'utf8'))
  const cumAll = parseCumulative(cal.wikitext)
  if (!cumAll) throw new Error(`讀不到賽程累計列：${ed.calendar}`)
  const totalEvents = cumAll.at(-1)
  const days = []
  cumAll.forEach((cum, i) => {
    const day = addDays(ed.calendarStartDay, i)
    if (day >= ed.firstMedalDay) days.push({ day, cum })
  })
  const snaps = []
  for (const { day, cum } of days) {
    // 當地 20:00 到隔天 11:00 之間（當天決賽都結束、隔天決賽還沒開始）
    const from = localToUtc(day, 20, ed.utcOffset)
    const to = localToUtc(addDays(day, 1), 11, ed.utcOffset)
    if (new Date(from) > now) break
    let revs = await revisionsBetween(ed.page, from, to)
    await sleep(250)
    if (!revs.length) {
      const r = await latestBefore(ed.page, to)
      if (r) revs = [r]
    }
    const parsed = revs
      .map((r) => {
        const p = parseMedalsTable(r.wikitext)
        return p ? { ...r, rows: p.rows, golds: totals(p.rows).gold } : null
      })
      .filter(Boolean)
    // 選「金牌數 = 當天累計項目數」的最後一個版本（同分平手會讓金牌略多，所以也接受 +1、+2）
    // 優先取「金牌數剛好等於累計項目數」的最後一個版本；維基賽會期間常有人提早或誤填，
    // 剛好相等的版本最可靠。沒有才接受 +1、+2（平手並列金牌會讓金牌略多於項目數）。
    // 同樣吻合的版本有好幾個時，取「存活最久」的那個：錯字或惡意修改通常幾分鐘內就被改回，
    // 維持最久沒人改的版本最可信。
    const endMs = Math.min(new Date(to).getTime(), now.getTime())
    parsed.forEach((p, i) => {
      const next = parsed[i + 1] ? new Date(parsed[i + 1].timestamp).getTime() : endMs
      p.life = next - new Date(p.timestamp).getTime()
    })
    const longest = (list) => list.sort((a, b) => b.life - a.life)[0]
    let pick =
      longest(parsed.filter((p) => p.golds === cum)) ??
      longest(parsed.filter((p) => p.golds === cum + 1)) ??
      longest(parsed.filter((p) => p.golds === cum + 2))
    if (!pick) {
      // 維基更新偶爾較慢：把時段延長到隔天深夜，仍只接受金牌數吻合的版本
      const more = await revisionsBetween(ed.page, to, localToUtc(addDays(day, 1), 23, ed.utcOffset))
      await sleep(250)
      pick = more
        .map((r) => {
          const p = parseMedalsTable(r.wikitext)
          return p ? { ...r, rows: p.rows, golds: totals(p.rows).gold } : null
        })
        .filter(Boolean)
        .find((p) => p.golds >= cum && p.golds <= cum + 2)
    }
    let approx = false
    if (!pick) {
      pick = [...parsed].sort((a, b) => Math.abs(a.golds - cum) - Math.abs(b.golds - cum))[0]
      approx = true
    }
    if (!pick) {
      console.log(ed.key, day, '找不到任何版本')
      continue
    }
    const inProgress = new Date(to) > now && pick.golds < cum
    snaps.push({
      day, eventsDone: cum, golds: pick.golds, revid: pick.revid, timestamp: pick.timestamp,
      approx: approx || undefined, inProgress: inProgress || undefined,
      medals: Object.fromEntries(pick.rows.map((r) => [r.code, [r.gold, r.silver, r.bronze]])),
    })
    console.log(ed.key, day, `賽程累計 ${cum} 項 / 版本金牌 ${pick.golds}`, approx ? '⚠️ 對不上' : '✓', inProgress ? '(當天尚未結束)' : '')
  }
  // 清理：累計獎牌只會增加，所以用「最後一天」往回推，每天每國的金／銀／銅都不能超過隔天的數字。
  // 這會修掉維基編輯過程中短暫出現的誤植（例如把 3 金打成 10 金），
  // 也會去掉最後名單裡不存在的錯誤代碼（例如把 MAS 誤打成 MAL）。每次修正都記錄下來。
  const fixes = []
  for (let i = snaps.length - 2; i >= 0; i--) {
    const next = snaps[i + 1].medals
    for (const [code, vals] of Object.entries(snaps[i].medals)) {
      const cap = next[code] ?? [0, 0, 0]
      const fixed = vals.map((v, k) => Math.min(v, cap[k]))
      if (fixed.some((v, k) => v !== vals[k])) {
        fixes.push(`${snaps[i].day} ${code} ${vals.join('/')}→${fixed.join('/')}`)
        if (fixed[0] + fixed[1] + fixed[2] === 0) delete snaps[i].medals[code]
        else snaps[i].medals[code] = fixed
      }
    }
  }
  if (fixes.length) console.log(`${ed.key} 清理 ${fixes.length} 筆：`, fixes.join('；'))
  out[ed.key] = { page: ed.page, calendar: ed.calendar, totalEvents, schedule: days, snapshots: snaps, fixes }
}
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/data/pace.json', import.meta.url), JSON.stringify(out))
console.log('寫入 public/data/pace.json')
