// 「你知道嗎？」卡片：從資料算出的事實，加上少數附來源的整理事實。只寫已發生的事，不做預測。
import { canonical, nameOf } from './countries.js'
import { editionLabel, editionTotals, SERIES_NAME, type MedalsData, type SportEvent } from './data'
import { hostEffects, medalsOf } from './insights'

export interface Fact {
  text: string
  source: string
  url?: string
  tag: string
}

/** [0,1,0] → 「1 面銀牌」；[2,0,5] → 「2 金、5 銅」 */
function medalWords(m: number[]) {
  const parts = (['金', '銀', '銅'] as const).map((z, i) => (m[i] ? `${m[i]} ${z}` : '')).filter(Boolean)
  if (parts.length === 1) return parts[0].replace(/(\d+) (.)/, '$1 面$2牌')
  return parts.join('、')
}

const WIKI_TPE_OLY = 'https://en.wikipedia.org/wiki/Chinese_Taipei_at_the_Olympics'
const WIKI_TPE_AG = 'https://en.wikipedia.org/wiki/Chinese_Taipei_at_the_Asian_Games'

export function buildFacts(data: MedalsData, events: SportEvent[] = []): Fact[] {
  const out: Fact[] = []
  // 與中華台北有關的重大事件（附來源）
  for (const ev of events.filter((e) => e.codes.includes('TPE')))
    out.push({ tag: '中華台北', text: ev.zh, source: ev.sourceTitle || '維基百科', url: ev.source })
  const S = (id: string) => data.series.find((s) => s.id === id)!
  const summer = S('summer-olympics')
  const winter = S('winter-olympics')
  const asian = S('asian-games')
  const uni = S('universiade')
  const src = '本站整理（英文維基百科各屆獎牌表）'

  // --- 中華台北 ---
  const tpeWinter = winter.editions.filter((e) => e.rows.some(([c]) => canonical(c, e.year) === 'TPE')).length
  if (tpeWinter === 0)
    out.push({
      tag: '中華台北',
      text: `中華台北從 1972 年起參加冬季奧林匹克運動會，到 ${winter.editions.at(-1)!.year} 年為止還沒有得過獎牌。`,
      source: '維基百科〈Chinese Taipei at the Olympics〉；本站整理各屆冬季奧林匹克運動會獎牌表',
      url: WIKI_TPE_OLY,
    })
  const firstOly = summer.editions.find((e) => e.rows.some(([c]) => canonical(c, e.year) === 'TPE'))
  if (firstOly) {
    const m = medalsOf(firstOly.rows, 'TPE', firstOly.year)
    const code = firstOly.rows.find(([c]) => canonical(c, firstOly.year) === 'TPE')![0]
    out.push({
      tag: '中華台北',
      text: `中華台北的第一面夏季奧林匹克運動會獎牌出現在 ${editionLabel('summer-olympics', firstOly, false)}（${medalWords(m)}），當時以「${nameOf(code, firstOly.year)}」名義參賽。`,
      source: `${src}；名稱依維基百科〈Chinese Taipei at the Olympics〉`,
      url: WIKI_TPE_OLY,
    })
  }
  out.push({
    tag: '中華台北',
    text: '中華台北 1974 到 1986 年沒有參加亞洲運動會，1990 年北京亞洲運動會起以「中華台北」名義重返。',
    source: '維基百科〈Chinese Taipei at the Asian Games〉',
    url: WIKI_TPE_AG,
  })
  const firstOlyGold = summer.editions.find((e) => medalsOf(e.rows, 'TPE', e.year)[0] > 0)
  if (firstOlyGold)
    out.push({
      tag: '中華台北',
      text: `中華台北第一面夏季奧林匹克運動會金牌在 ${editionLabel('summer-olympics', firstOlyGold, false)}。`,
      source: src,
    })
  // 中華台北在各賽事單屆最多金牌
  for (const s of [asian, uni, summer]) {
    const hist = s.editions.filter((e) => !e.live).map((e) => ({ e, m: medalsOf(e.rows, 'TPE', e.year) }))
    const max = Math.max(...hist.map((x) => x.m[0]))
    if (max <= 0) continue
    const best = hist.filter((x) => x.m[0] === max)
    out.push({
      tag: '中華台北',
      text: `中華台北在${SERIES_NAME[s.id]}單屆最多拿下 ${max} 面金牌：${best.map((x) => editionLabel(s.id, x.e, false)).join('、')}。`,
      source: src,
    })
  }

  // --- 地主效應：各系列歷來提升最多的主辦國 ---
  for (const s of [summer, asian, winter]) {
    const hs = s.editions
      .filter((e) => !e.live)
      .flatMap((e) => hostEffects(s, e))
      .filter((h) => h.before.length)
      .sort((a, b) => b.now.share - b.avgBeforeShare - (a.now.share - a.avgBeforeShare))
    const h = hs[0]
    if (!h) continue
    out.push({
      tag: '地主效應',
      text: `${SERIES_NAME[s.id]}史上地主效應最明顯的是 ${editionLabel(s.id, h.edition, false)}：${h.name}拿下全部獎牌的 ${(h.now.share * 100).toFixed(1)}%，主辦前兩屆平均只有 ${(h.avgBeforeShare * 100).toFixed(1)}%。`,
      source: `${src}；以獎牌佔比計算`,
    })
  }

  // --- 單一國家最高金牌佔比 ---
  for (const s of [summer, asian, winter]) {
    let best = { share: 0, key: '', e: s.editions[0] }
    for (const e of s.editions.filter((x) => !x.live)) {
      const t = editionTotals(e.rows).gold
      for (const [c, g] of e.rows) if (g / t > best.share) best = { share: g / t, key: canonical(c, e.year), e }
    }
    out.push({
      tag: '強權',
      text: `${SERIES_NAME[s.id]}單一國家金牌佔比最高的紀錄：${editionLabel(s.id, best.e, false)}，${nameOf(best.key, best.e.year)}拿下 ${(best.share * 100).toFixed(1)}% 的金牌。`,
      source: src,
    })
  }

  // --- 規模 ---
  const f = summer.editions[0]
  const l = summer.editions.filter((e) => !e.live).at(-1)!
  out.push({
    tag: '規模',
    text: `夏季奧林匹克運動會從 ${f.year} 年頒出 ${editionTotals(f.rows).gold} 面金牌，成長到 ${l.year} 年的 ${editionTotals(l.rows).gold} 面。`,
    source: src,
  })
  const everMedal = new Set(summer.editions.flatMap((e) => e.rows.map(([c]) => canonical(c, e.year))))
  out.push({
    tag: '規模',
    text: `歷屆夏季奧林匹克運動會中，共有 ${everMedal.size} 個國家或代表隊至少拿過一面獎牌（含蘇聯、東西德等已不存在的代表隊）。`,
    source: src,
  })
  out.push({
    tag: '歷史',
    text: '夏季奧林匹克運動會 1916、1940、1944 年因世界大戰停辦，所以歷屆圖表在這幾年會留空。',
    source: '本站整理（各屆清單）',
  })
  return out
}
