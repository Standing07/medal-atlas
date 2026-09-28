// @ts-check
/**
 * 國家／代表隊代碼 → 繁體中文名、國旗（flag-icons 的 ISO 兩碼）、歸併對象。
 * 代碼是維基百科獎牌表使用的國際奧會式三碼。英文原名由維基模板展開查得（2026-09-28）。
 *
 * 歸併（lineage）只用在「同一個國家、只是換了代碼或名稱」的情況，
 * 例如新加坡 SIN→SGP、斯里蘭卡舊名錫蘭 CEY→SRI。
 * 國家分裂或合併（蘇聯、東西德、南斯拉夫、捷克斯洛伐克）不歸併，
 * 改在國家頁以「前身」列出，避免把不同國家的成績混在一起。
 */

/** @type {Record<string, [string, string | null]>} 代碼 → [中文名, 國旗 ISO 兩碼或 null] */
const C = {
  AFG: ['阿富汗', 'af'], AHO: ['荷屬安地列斯', null], AIN: ['個人中立運動員', null],
  ALB: ['阿爾巴尼亞', 'al'], ALG: ['阿爾及利亞', 'dz'], ANG: ['安哥拉', 'ao'],
  ANT: ['安地卡及巴布達', 'ag'], ANZ: ['澳紐聯隊', null], ARG: ['阿根廷', 'ar'],
  ARM: ['亞美尼亞', 'am'], ARU: ['阿魯巴', 'aw'], AUS: ['澳洲', 'au'], AUT: ['奧地利', 'at'],
  AZE: ['亞塞拜然', 'az'], BAH: ['巴哈馬', 'bs'], BAN: ['孟加拉', 'bd'], BAR: ['巴貝多', 'bb'],
  BDI: ['蒲隆地', 'bi'], BEL: ['比利時', 'be'], BEN: ['貝南', 'bj'], BER: ['百慕達', 'bm'],
  BGU: ['英屬圭亞那', null], BHK: ['英屬宏都拉斯', null], BHR: ['巴林', 'bh'],
  BIH: ['波士尼亞與赫塞哥維納', 'ba'], BIR: ['緬甸', 'mm'], BIZ: ['貝里斯', 'bz'],
  BLR: ['白俄羅斯', 'by'], BOH: ['波希米亞', null], BOL: ['玻利維亞', 'bo'], BOT: ['波札那', 'bw'],
  BRA: ['巴西', 'br'], BRN: ['巴林', 'bh'], BRU: ['汶萊', 'bn'], BUL: ['保加利亞', 'bg'],
  BUR: ['布吉納法索', 'bf'], BWI: ['英屬西印度群島聯隊', null], CAF: ['中非共和國', 'cf'],
  CAM: ['柬埔寨', 'kh'], CAN: ['加拿大', 'ca'], CAY: ['開曼群島', 'ky'], CEY: ['錫蘭', 'lk'],
  CGO: ['剛果共和國', 'cg'], CHA: ['查德', 'td'], CHI: ['智利', 'cl'], CHN: ['中國', 'cn'],
  CIV: ['象牙海岸', 'ci'], CMR: ['喀麥隆', 'cm'], COD: ['剛果民主共和國', 'cd'],
  COG: ['剛果共和國', 'cg'], COK: ['庫克群島', 'ck'], COL: ['哥倫比亞', 'co'],
  COR: ['韓國／北韓聯隊', null], CPV: ['維德角', 'cv'], CRC: ['哥斯大黎加', 'cr'],
  CRO: ['克羅埃西亞', 'hr'], CUB: ['古巴', 'cu'], CYP: ['賽普勒斯', 'cy'], CZE: ['捷克', 'cz'],
  DEN: ['丹麥', 'dk'], DJI: ['吉布地', 'dj'], DMA: ['多米尼克', 'dm'], DOM: ['多明尼加', 'do'],
  EAI: ['獨立運動員隊', null], ECU: ['厄瓜多', 'ec'], EGY: ['埃及', 'eg'], ENG: ['英格蘭', 'gb-eng'],
  EOR: ['奧運難民代表隊', null], ERI: ['厄利垂亞', 'er'], ESA: ['薩爾瓦多', 'sv'],
  ESP: ['西班牙', 'es'], EST: ['愛沙尼亞', 'ee'], ETH: ['衣索比亞', 'et'],
  EUA: ['德國聯隊', null], EUN: ['獨立國協聯隊', null], FIJ: ['斐濟', 'fj'], FIN: ['芬蘭', 'fi'],
  FRA: ['法國', 'fr'], FRG: ['西德', null], FRN: ['羅德西亞與尼亞薩蘭', null], GAB: ['加彭', 'ga'],
  GAM: ['甘比亞', 'gm'], GBR: ['英國', 'gb'], GBS: ['幾內亞比索', 'gw'], GDR: ['東德', null],
  GEO: ['喬治亞', 'ge'], GEQ: ['赤道幾內亞', 'gq'], GER: ['德國', 'de'], GGY: ['根西', 'gg'],
  GHA: ['迦納', 'gh'], GRE: ['希臘', 'gr'], GRN: ['格瑞那達', 'gd'], GUA: ['瓜地馬拉', 'gt'],
  GUE: ['根西', 'gg'], GUI: ['幾內亞', 'gn'], GUY: ['蓋亞那', 'gy'], HAI: ['海地', 'ht'],
  HKG: ['香港', 'hk'], HON: ['宏都拉斯', 'hn'], HUN: ['匈牙利', 'hu'], INA: ['印尼', 'id'],
  IND: ['印度', 'in'], IOA: ['獨立奧運選手', null], IOC: ['科威特獨立運動員', null],
  IOM: ['曼島', 'im'], IOP: ['獨立奧運參賽者', null], IRE: ['愛爾蘭', 'ie'], IRI: ['伊朗', 'ir'],
  IRL: ['愛爾蘭', 'ie'], IRN: ['伊朗', 'ir'], IRQ: ['伊拉克', 'iq'], ISL: ['冰島', 'is'],
  ISR: ['以色列', 'il'], ISV: ['美屬維京群島', 'vi'], ITA: ['義大利', 'it'],
  IVB: ['英屬維京群島', 'vg'], JAM: ['牙買加', 'jm'], JEY: ['澤西', 'je'], JOR: ['約旦', 'jo'],
  JPN: ['日本', 'jp'], KAZ: ['哈薩克', 'kz'], KEN: ['肯亞', 'ke'], KGZ: ['吉爾吉斯', 'kg'],
  KHM: ['高棉共和國', 'kh'], KIR: ['吉里巴斯', 'ki'], KOR: ['南韓', 'kr'], KOS: ['科索沃', 'xk'],
  KSA: ['沙烏地阿拉伯', 'sa'], KUW: ['科威特', 'kw'], LAO: ['寮國', 'la'], LAT: ['拉脫維亞', 'lv'],
  LBA: ['利比亞', 'ly'], LBN: ['黎巴嫩', 'lb'], LBR: ['賴比瑞亞', 'lr'], LCA: ['聖露西亞', 'lc'],
  LES: ['賴索托', 'ls'], LIB: ['黎巴嫩', 'lb'], LIE: ['列支敦斯登', 'li'], LIT: ['立陶宛', 'lt'],
  LTU: ['立陶宛', 'lt'], LUX: ['盧森堡', 'lu'], MAC: ['澳門', 'mo'], MAD: ['馬達加斯加', 'mg'],
  MAL: ['馬來亞', null], MAR: ['摩洛哥', 'ma'], MAS: ['馬來西亞', 'my'], MAW: ['馬拉威', 'mw'],
  MDA: ['摩爾多瓦', 'md'], MEX: ['墨西哥', 'mx'], MGL: ['蒙古', 'mn'], MKD: ['北馬其頓', 'mk'],
  MLI: ['馬利', 'ml'], MLT: ['馬爾他', 'mt'], MNE: ['蒙特內哥羅', 'me'], MON: ['摩納哥', 'mc'],
  MOZ: ['莫三比克', 'mz'], MRI: ['模里西斯', 'mu'], MYA: ['緬甸', 'mm'], NAM: ['納米比亞', 'na'],
  NCA: ['尼加拉瓜', 'ni'], NED: ['荷蘭', 'nl'], NEP: ['尼泊爾', 'np'], NFI: ['諾福克島', 'nf'],
  NFK: ['諾福克島', 'nf'], NGA: ['奈及利亞', 'ng'], NGR: ['奈及利亞', 'ng'], NIG: ['尼日', 'ne'],
  NIR: ['北愛爾蘭', 'gb-nir'], NIU: ['紐埃', 'nu'], NOR: ['挪威', 'no'], NRH: ['北羅德西亞', null],
  NRU: ['諾魯', 'nr'], NZL: ['紐西蘭', 'nz'], OAR: ['俄羅斯奧運選手', null], OMA: ['阿曼', 'om'],
  PAK: ['巴基斯坦', 'pk'], PAN: ['巴拿馬', 'pa'], PAR: ['巴拉圭', 'py'], PER: ['秘魯', 'pe'],
  PHI: ['菲律賓', 'ph'], PLE: ['巴勒斯坦', 'ps'], PNG: ['巴布亞紐幾內亞', 'pg'], POL: ['波蘭', 'pl'],
  POR: ['葡萄牙', 'pt'], PRK: ['北韓', 'kp'], PUR: ['波多黎各', 'pr'], QAT: ['卡達', 'qa'],
  RAU: ['阿拉伯聯合共和國', null], ROM: ['羅馬尼亞', 'ro'], ROU: ['羅馬尼亞', 'ro'],
  RSA: ['南非', 'za'], RUS: ['俄羅斯', 'ru'], RWA: ['盧安達', 'rw'], SAF: ['南非', 'za'],
  SAM: ['薩摩亞', 'ws'], SAU: ['沙烏地阿拉伯', 'sa'], SCG: ['塞爾維亞與蒙特內哥羅', null],
  SCO: ['蘇格蘭', 'gb-sct'], SEN: ['塞內加爾', 'sn'], SEY: ['塞席爾', 'sc'], SGP: ['新加坡', 'sg'],
  SIN: ['新加坡', 'sg'], SKN: ['聖克里斯多福及尼維斯', 'kn'], SLE: ['獅子山', 'sl'],
  SLO: ['斯洛維尼亞', 'si'], SMR: ['聖馬利諾', 'sm'], SOL: ['索羅門群島', 'sb'], SOM: ['索馬利亞', 'so'],
  SRB: ['塞爾維亞', 'rs'], SRH: ['南羅德西亞', null], SRI: ['斯里蘭卡', 'lk'], SSD: ['南蘇丹', 'ss'],
  STP: ['聖多美普林西比', 'st'], SUD: ['蘇丹', 'sd'], SUI: ['瑞士', 'ch'], SUR: ['蘇利南', 'sr'],
  SVG: ['聖文森及格瑞那丁', 'vc'], SVK: ['斯洛伐克', 'sk'], SWE: ['瑞典', 'se'], SWZ: ['史瓦帝尼', 'sz'],
  SYR: ['敘利亞', 'sy'], TAN: ['坦尚尼亞', 'tz'], TCH: ['捷克斯洛伐克', null], TGA: ['東加', 'to'],
  THA: ['泰國', 'th'], TJK: ['塔吉克', 'tj'], TKM: ['土庫曼', 'tm'], TOG: ['多哥', 'tg'],
  TON: ['東加', 'to'], TPE: ['中華台北', 'tw'], TRI: ['千里達及托巴哥', 'tt'],
  TTO: ['千里達及托巴哥', 'tt'], TUN: ['突尼西亞', 'tn'], TUR: ['土耳其', 'tr'], TUV: ['吐瓦魯', 'tv'],
  UAE: ['阿拉伯聯合大公國', 'ae'], UAR: ['阿拉伯聯合共和國（埃及）', null], UGA: ['烏干達', 'ug'],
  UKR: ['烏克蘭', 'ua'], URS: ['蘇聯', null], URU: ['烏拉圭', 'uy'], USA: ['美國', 'us'],
  UZB: ['烏茲別克', 'uz'], VAN: ['萬那杜', 'vu'], VEN: ['委內瑞拉', 've'], VIE: ['越南', 'vn'],
  VIN: ['聖文森及格瑞那丁', 'vc'], VNM: ['越南共和國（南越）', null], VOL: ['上伏塔', null],
  WAL: ['威爾斯', 'gb-wls'], WSM: ['西薩摩亞', 'ws'], YEM: ['葉門', 'ye'], YUG: ['南斯拉夫', null],
  ZAI: ['薩伊', 'cd'], ZAM: ['尚比亞', 'zm'], ZIM: ['辛巴威', 'zw'], ZZX: ['混合隊', null],
}

/**
 * 歸併：舊代碼 → 現行代碼（同一國家改代碼或改國名）。
 * 例外：ROC 在 1954–1970 是「中華民國」（台灣），2020 年後是「俄羅斯奧會」，依年份判斷，見 canonical()。
 */
const LINEAGE = {
  SIN: 'SGP', BRN: 'BHR', SAU: 'KSA', IRN: 'IRI', ROM: 'ROU', LIT: 'LTU', NGA: 'NGR',
  NFI: 'NFK', WSM: 'SAM', TRI: 'TTO', VIN: 'SVG', TON: 'TGA', SAF: 'RSA', KHM: 'CAM',
  BIR: 'MYA', CEY: 'SRI', MAL: 'MAS', ZAI: 'COD', COG: 'CGO', UAR: 'EGY', VOL: 'BUR',
  BGU: 'GUY', BHK: 'BIZ', GGY: 'GUE', IRE: 'IRL', NRH: 'ZAM', SRH: 'ZIM', LIB: 'LBN',
  OAR: 'RUS', RAU: 'EGY',
}

/** 前身國家（不歸併，只在國家頁列出供參考） */
export const PREDECESSORS = {
  RUS: ['URS', 'EUN'], UKR: ['URS', 'EUN'], BLR: ['URS', 'EUN'], KAZ: ['URS', 'EUN'],
  UZB: ['URS', 'EUN'], GEO: ['URS', 'EUN'], ARM: ['URS', 'EUN'], AZE: ['URS', 'EUN'],
  LTU: ['URS'], LAT: ['URS'], EST: ['URS'], MDA: ['URS', 'EUN'], KGZ: ['URS', 'EUN'],
  TJK: ['URS', 'EUN'], TKM: ['URS', 'EUN'],
  GER: ['FRG', 'GDR', 'EUA'], CZE: ['TCH', 'BOH'], SVK: ['TCH'],
  SRB: ['SCG', 'YUG'], MNE: ['SCG', 'YUG'], CRO: ['YUG'], SLO: ['YUG'], BIH: ['YUG'], MKD: ['YUG'],
  AUS: ['ANZ'], NZL: ['ANZ'],
}

/**
 * 某屆某代碼 → 用來串連歷年趨勢的代碼。
 * @param {string} code
 * @param {number} year
 */
export function canonical(code, year) {
  if (code === 'ROC') return year >= 2000 ? 'RUS' : 'TPE'
  return LINEAGE[/** @type {keyof typeof LINEAGE} */ (code)] ?? code
}

/**
 * 顯示名稱（依年份，讓歷史名稱正確呈現）
 * @param {string} code
 * @param {number} [year]
 */
export function nameOf(code, year) {
  if (code === 'ROC') {
    // 依維基百科〈Chinese Taipei at the Olympics〉〈Chinese Taipei at the Asian Games〉：
    // 奧運 1960 以「福爾摩沙」、1964–1968 以「台灣」參賽；亞洲運動會 1954–1970 以「中華民國」參賽
    if (year === undefined) return '中華民國'
    if (year >= 2000) return '俄羅斯奧會'
    if (year === 1960) return '福爾摩沙'
    if (year === 1964 || year === 1968) return '台灣'
    return '中華民國'
  }
  return C[code]?.[0] ?? code
}

/** @param {string} code @param {number} [year] */
export function flagOf(code, year) {
  if (code === 'ROC') return year !== undefined && year >= 2000 ? null : 'tw'
  return C[code]?.[1] ?? null
}

export const KNOWN_CODES = [...Object.keys(C), 'ROC']
