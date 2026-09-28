/** 中華台北參賽名稱與缺席紀錄（精簡版，細節可展開）。來源：維基百科各參賽頁 */
export default function TaiwanNote() {
  return (
    <details className="rounded-xl bg-white px-4 py-2.5 text-xs leading-relaxed text-stone-600 ring-1 ring-stone-200">
      <summary className="cursor-pointer text-sm text-stone-700">
        <b>參賽名稱：</b>中華民國／福爾摩沙／台灣 → 1984 年起「中華台北」（成績都併入計算）
      </summary>
      <ul className="mt-2 list-disc space-y-0.5 pl-4">
        <li>夏季奧林匹克運動會：1960「福爾摩沙」、1964–1968「台灣」、1972「中華民國」；1976、1980 未參賽。</li>
        <li>冬季奧林匹克運動會：1972 年起參賽，至今未得牌。</li>
        <li>亞洲運動會：1954–1970「中華民國」；1962、1974–1986 未參加；1990 年起「中華台北」。</li>
        <li>世界大學運動會：1987 年起參加。</li>
      </ul>
      <p className="mt-1 text-stone-400">
        來源：維基百科
        <a className="underline" href="https://en.wikipedia.org/wiki/Chinese_Taipei_at_the_Olympics" target="_blank" rel="noreferrer">
          〈Chinese Taipei at the Olympics〉
        </a>
        <a className="underline" href="https://en.wikipedia.org/wiki/Chinese_Taipei_at_the_Asian_Games" target="_blank" rel="noreferrer">
          〈…at the Asian Games〉
        </a>
        <a className="underline" href="https://en.wikipedia.org/wiki/Chinese_Taipei_at_the_FISU_World_University_Games" target="_blank" rel="noreferrer">
          〈…at the FISU World University Games〉
        </a>
      </p>
    </details>
  )
}
