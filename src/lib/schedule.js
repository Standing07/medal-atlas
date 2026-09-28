// @ts-check
/**
 * 即時獎牌數的更新時間：每天台灣時間 23:50 更新，之後每 6 小時再更新一次
 * （05:50、11:50、17:50）。台灣是 UTC+8、沒有日光節約時間。
 * 網頁與資料腳本共用，確保大家看到的都是同一個時間點的版本。
 */
export const UPDATE_TIMES_TAIPEI = ['23:50', '05:50', '11:50', '17:50']

const SIX_HOURS = 6 * 3600e3
// 台灣 11:50 ＝ UTC 03:50，以此為基準每 6 小時一個更新點
const ANCHOR = Date.UTC(2000, 0, 1, 3, 50)

/** 最近一次（已經過的）更新時間 */
export function latestCheckpoint(now = new Date()) {
  const n = Math.floor((now.getTime() - ANCHOR) / SIX_HOURS)
  return new Date(ANCHOR + n * SIX_HOURS)
}

/** 下一次更新時間 */
export function nextCheckpoint(now = new Date()) {
  return new Date(latestCheckpoint(now).getTime() + SIX_HOURS)
}
