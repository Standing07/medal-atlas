import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadMedals, loadPace, SERIES_NAME, type MedalsData, type PaceData } from '../lib/data'
import { analyticsEnabled } from '../lib/analytics'

export default function About() {
  const [data, setData] = useState<MedalsData>()
  const [pace, setPace] = useState<PaceData>()
  useEffect(() => {
    loadMedals().then(setData)
    loadPace().then(setPace)
  }, [])

  return (
    <article className="max-w-3xl space-y-6 text-stone-700">
      <h1 className="text-2xl font-bold text-stone-900">資料來源與方法</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-stone-900">收錄範圍</h2>
        {data ? (
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-500">
              <tr>
                <th className="py-1 text-left font-medium">賽事</th>
                <th className="py-1 text-left font-medium">屆數</th>
                <th className="py-1 text-left font-medium">年份</th>
              </tr>
            </thead>
            <tbody>
              {data.series.map((s) => (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="py-1">
                    <Link to={`/games/${s.id}`} className="underline">
                      {SERIES_NAME[s.id]}
                    </Link>
                  </td>
                  <td className="py-1 tabular-nums">{s.editions.length}</td>
                  <td className="py-1 tabular-nums">
                    {s.editions[0].year}–{s.editions.at(-1)!.year}
                    {s.id === 'summer-olympics' && '（全部，不含國際奧會不承認的 1906 屆間運動會）'}
                    {s.id === 'winter-olympics' && '（全部）'}
                    {s.id === 'asian-games' && '（全部，2026 進行中）'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>載入中…</p>
        )}
        <p className="text-sm">
          資料整理日：{data?.generatedAt.slice(0, 10)}。獎牌數會因禁藥追回、重新分配而在賽後多年仍有變動，本站以整理當天的版本為準。
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-900">來源</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>歷屆獎牌榜</b>：英文維基百科各屆「medal table」頁面（CC BY-SA 4.0）。每一屆都記錄了取用的版本編號與日期，頁面上的「來源」連結會開啟那個確切版本。
          </li>
          <li>
            <b>奧林匹克運動會</b>：另參考{' '}
            <a className="underline" href="https://www.olympedia.org" target="_blank" rel="noreferrer">
              Olympedia
            </a>
            （與國際奧會合作的奧運統計資料庫）。
          </li>
          <li>
            <b>進行中的亞洲運動會</b>：每天台灣時間 23:50 更新，之後每 6 小時（05:50、11:50、17:50）再更新一次，取維基百科獎牌表在該時間點的版本；
            通過合理性檢查（金牌總數不倒退、不超過總項目數、沒有國家獎牌變少）才採用，否則沿用前一次的資料。官方數字以
            <a className="underline" href={data?.live.officialResults} target="_blank" rel="noreferrer">
              大會成績網站
            </a>
            為準。
          </li>
          <li>
            <b>依運動分項</b>（夏季、冬季奧林匹克運動會與亞洲運動會）：維基百科各運動頁面（例：〈Swimming at the 2024 Summer
            Olympics〉）。每一屆都檢查「各運動加總＝總獎牌表」：75 屆中有 38 屆完全吻合，多數屆次涵蓋 99% 以上的獎牌；差額多是 1990
            年以前的團體項目與禁藥改判只更新在總表，頁面上會標示涵蓋比例。表演賽不計入。中華台北的分項資料每一屆都與總表吻合。
          </li>
          <li>
            <b>每百萬人獎牌數</b>：人口取賽事舉行年份。各國為世界銀行 World Development Indicators「SP.POP.TOTL」（年中人口，CC BY
            4.0）；世界銀行沒有台灣，中華台北改用內政部統計處「土地面積、戶數與人口數」（年底人口，政府資料開放授權條款），目前只有 1990
            年起的資料，更早的屆次不計算。蘇聯、東西德等已不存在的代表隊沒有人口資料。
          </li>
          <li>
            <b>特殊事件</b>（抵制、改名、延期、禁賽等 23 則）：每則都附出處，多為英文維基百科相關條目（例：〈List of Olympic Games
            boycotts〉〈Chinese Taipei at the Olympics〉）。
          </li>
          <li>
            <b>賽事進度與每日項目數</b>：維基百科〈2026 Asian Games calendar〉〈2022 Asian Games calendar〉模板，出處為大會官方每日賽程。
          </li>
          <li>
            <b>更正</b>：維基數字與官方紀錄不符、且有官方來源可對照時，本站依官方更正，並在該屆以 ✎ 標示、附來源（見下方「已知限制」）。
          </li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-900">「上屆同進度」怎麼算</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            「賽事進度」＝已頒發的金牌數 ÷ 本屆金牌項目總數（2026 愛知・名古屋亞洲運動會 {pace?.['asian-games-2026']?.totalEvents ?? '—'}{' '}
            項）。遇到並列金牌時會略為高估。
          </li>
          <li>
            上屆（2022 杭州亞洲運動會，{pace?.['asian-games-2022']?.totalEvents ?? '—'}{' '}
            項）每一天結束時的各國累計，取自維基獎牌表當晚的歷史版本；每一天都核對「版本裡的金牌總數＝大會賽程當天累計完成的項目數」，對得上才採用。
          </li>
          <li>同一晚有多個版本時，取「維持最久沒被改動」的那一個——誤植通常幾分鐘內就被改回。</li>
          <li>
            累計獎牌只增不減，所以再用最後一天往回檢查，修掉編輯過程中短暫出現的錯字。本次共修正{' '}
            {pace ? Object.values(pace).reduce((n, p) => n + p.fixes.length, 0) : '—'} 筆：
            {pace && Object.values(pace).flatMap((p) => p.fixes).join('；')}。
          </li>
          <li>本屆進度落在兩天之間時，用前後兩天線性內插，所以會出現小數，屬推估值。</li>
        </ol>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-900">地主效應與歷史紀錄怎麼算</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>地主效應＝主辦國本屆的獎牌佔比，減去它主辦前兩屆（有得牌、非主辦）的平均佔比。用佔比而非面數，排除各屆項目數不同的影響。</li>
          <li>進行中的賽事，地主效應改用「上屆同進度」比較（推估值）。</li>
          <li>「歷史紀錄與里程碑」與「你知道嗎？」卡片都由資料自動算出，只陳述已發生的事，不做預測。</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-900">國家與代表隊的處理</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>只改代碼或國名的同一個國家會併在一起（例：新加坡 SIN→SGP、錫蘭→斯里蘭卡、薩伊→剛果民主共和國）。</li>
          <li>
            國家分裂或合併<b>不併入</b>：蘇聯、獨立國協聯隊、東德、西德、南斯拉夫、捷克斯洛伐克各自獨立，在後繼國家的頁面以「前身」列出，可加入比較。
          </li>
          <li>
            俄羅斯以「俄羅斯奧運選手」（2018）、「俄羅斯奧會」（2020–2022）名義參賽的成績併入俄羅斯；2024 年起的「個人中立運動員」含白俄羅斯選手，不併入。
          </li>
          <li>
            中華台北：奧林匹克運動會 1960 年以「福爾摩沙」、1968 年以「台灣」名義得牌；亞洲運動會 1954–1970 年以「中華民國」名義得牌，都併入中華台北計算。
          </li>
          <li>名稱使用各賽會的正式參賽名稱，不代表任何政治立場。</li>
        </ul>
      </section>

      {analyticsEnabled() && <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-900">瀏覽統計與隱私</h2>
        <p>
          本站用 Cloudflare Web Analytics 統計瀏覽人數與熱門頁面。它不使用 cookie、不追蹤個別訪客，本站也不收集姓名、email
          等個人資料，沒有廣告。
        </p>
      </section>}

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-900">已知限制</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            泛美運動會 1955、1959、1975、1983、1987 年，維基頁面列出多個來源互相矛盾的數字（例：美國金牌 81/88），本站取第一個值並以 * 標示。
          </li>
          <li>
            維基百科是群眾編輯，少數頁面有編輯爭議或誤植。目前依官方來源更正 2 筆：2017 臺北世界大學運動會中華台北（維基 30/35/31 → 官方
            26/34/30）、2025 萊茵-魯爾世界大學運動會法國（維基 12/12/17 → 3/5/9，改回後全表金牌數才等於官方的 234 項）。
          </li>
        </ul>
      </section>
    </article>
  )
}
