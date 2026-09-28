// 第一步：從各屆賽事主頁找出所有「<運動> at the <屆次>」連結，存成 data-raw/sport-links.json
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { SERIES } from './series.mjs'

export const SPORT_SERIES = {
  'summer-olympics': (y) => `${y} Summer Olympics`,
  'winter-olympics': (y) => `${y} Winter Olympics`,
  'asian-games': (y) => `${y} Asian Games`,
}
const API = 'https://en.wikipedia.org/w/api.php'
const UA = 'medal-atlas-data/0.1 (https://github.com/Standing07/medal-atlas)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(params, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${API}?${new URLSearchParams(params)}`, { headers: { 'User-Agent': UA } })
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      await sleep(2000 * (i + 1)) // 被限流時回傳非 JSON，等一下再試
    }
  }
  throw new Error('維基 API 連續回應異常')
}
export { getJson, sleep, API, UA }

if (process.argv[1].endsWith('sport-links.mjs')) {
  const out = {}
  for (const [sid, pageOf] of Object.entries(SPORT_SERIES)) {
    const s = SERIES.find((x) => x.id === sid)
    for (const y of s.years) {
      const ev = pageOf(y)
      const j = await getJson({ action: 'parse', page: ev, prop: 'links', format: 'json', formatversion: '2', redirects: '1' })
      const xs = [...new Set((j.parse?.links ?? []).filter((l) => l.ns === 0 && l.title.endsWith(` at the ${ev}`)).map((l) => l.title.slice(0, -` at the ${ev}`.length)))]
      out[`${sid}-${y}`] = { event: ev, xs }
      await sleep(400)
    }
    console.log(sid, 'done')
  }
  await mkdir(new URL('../data-raw/', import.meta.url), { recursive: true })
  await writeFile(new URL('../data-raw/sport-links.json', import.meta.url), JSON.stringify(out))
}
