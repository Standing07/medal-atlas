// 以官方／權威來源更正維基百科的個別數字。只在「維基與官方紀錄不符、且有可引用來源」時使用，
// 每筆都要附來源與查證日期，網站上會標示「本站依官方來源更正」。
export const CORRECTIONS = [
  {
    series: 'universiade',
    year: 2017,
    code: 'TPE',
    medals: [26, 34, 30],
    wikiHad: [30, 35, 31],
    source: '國家運動訓練中心〈2017年臺北世界大學運動會 中華台北成績公佈表〉；公視新聞網〈2017世大運我奪90面獎牌 26金史上最多〉',
    url: 'https://www.nstc.org.tw/NewsDetailC1.aspx?Cond=34c429ae-fca1-4183-b61c-e8cf26a67a3a',
    checked: '2026-09-28',
    note: '維基百科此欄自 2019 年起在 26/34/30 與 30/35/31 之間反覆被修改（編輯爭議）。',
  },
  {
    series: 'universiade',
    year: 2025,
    code: 'FRA',
    medals: [3, 5, 9],
    wikiHad: [12, 12, 17],
    source: 'FISU〈The Rhine-Ruhr 2025 medals〉（本屆共 234 個金牌項目）；維基百科〈France at the 2025 Summer World University Games〉（法國 3 金 5 銀 9 銅）',
    url: 'https://www.fisu.net/2025/06/26/the-rhine-ruhr-2025-medals-the-world-in-motion/',
    checked: '2026-09-28',
    note: '維基總表在 2026-06-09 的一次編輯把法國改成 12/12/17，使全表金牌變成 243 面，與官方 234 個項目不符；改回 3/5/9 後全表剛好 234 金。',
  },
]
