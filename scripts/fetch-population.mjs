// 人口資料（用來算「每百萬人獎牌數」）→ public/data/population.json
// 來源：世界銀行 World Development Indicators，SP.POP.TOTL（年中人口），授權 CC BY 4.0
//   https://data.worldbank.org/indicator/SP.POP.TOTL
// 世界銀行沒有台灣：中華台北改用 data-raw/tw_population.csv（官方來源，見該檔說明與 scripts 內註記）
import { readFile, writeFile, access } from 'node:fs/promises'

const url = 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=20000&date=1960:2025'
const [meta, rows] = await (await fetch(url)).json()
const out = { source: 'World Bank WDI SP.POP.TOTL（CC BY 4.0）', lastUpdated: meta.lastupdated, byIso2: {} }
for (const r of rows) {
  if (r.value == null) continue
  const iso2 = r.country.id.toLowerCase()
  ;(out.byIso2[iso2] ??= {})[r.date] = r.value
}
// 台灣（官方資料，由研究步驟整理成 CSV）
const tw = new URL('../data-raw/tw_population.csv', import.meta.url)
if (await access(tw).then(() => true, () => false)) {
  const lines = (await readFile(tw, 'utf8')).trim().split('\n').slice(1)
  out.byIso2.tw = Object.fromEntries(lines.map((l) => l.split(',')).map(([y, p]) => [y, Number(p)]))
  // 內政部統計處「內政統計查詢網」：土地面積、戶數與人口數─按區域別分（年底人口，1990 起），政府資料開放授權條款第 1 版
  out.twSource = '內政部統計處「土地面積、戶數與人口數」（年底人口，1990–2025），政府資料開放授權條款第 1 版'
}
await writeFile(new URL('../public/data/population.json', import.meta.url), JSON.stringify(out))
console.log(`世界銀行 ${Object.keys(out.byIso2).length} 個國家／地區（資料更新 ${meta.lastupdated}），台灣：${out.byIso2.tw ? Object.keys(out.byIso2.tw).length + ' 年' : '尚無'}`)
