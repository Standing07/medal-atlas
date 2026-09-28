import { SERIES_NAME, type Series } from '../lib/data'

export interface Filters {
  c?: string // 國家（歸併後代碼）
  g: string // 賽事系列
  y?: number // 屆次
  sp?: string // 運動
}

/** 三維度篩選：國家、賽事（＋屆次）、運動。任意組合都可以，網址會跟著變，方便分享。 */
export default function FilterBar({
  filters,
  onChange,
  countries,
  series,
  sports,
  sportsAvailable,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  countries: { key: string; name: string }[]
  series: Series[]
  sports: { id: string; zh: string }[]
  sportsAvailable: boolean
}) {
  const cur = series.find((s) => s.id === filters.g)
  const main = series.filter((s) => !s.more)
  const more = series.filter((s) => s.more)
  const sel = 'w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800'
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-4">
      <label className="text-xs text-stone-500">
        國家／地區
        <select className={sel} value={filters.c ?? ''} onChange={(e) => onChange({ ...filters, c: e.target.value || undefined })}>
          <option value="">全部國家</option>
          {countries.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-stone-500">
        賽事
        <select
          className={sel}
          value={filters.g}
          onChange={(e) => onChange({ ...filters, g: e.target.value, y: undefined, sp: undefined })}
        >
          {main.map((s) => (
            <option key={s.id} value={s.id}>
              {SERIES_NAME[s.id]}
            </option>
          ))}
          <optgroup label="更多賽事">
            {more.map((s) => (
              <option key={s.id} value={s.id}>
                {SERIES_NAME[s.id]}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="text-xs text-stone-500">
        屆次
        <select
          className={sel}
          value={filters.y ?? ''}
          onChange={(e) => onChange({ ...filters, y: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">歷屆（全部）</option>
          {[...(cur?.editions ?? [])].reverse().map((e) => (
            <option key={e.year} value={e.year}>
              {e.year} {e.city}
              {e.live ? '（進行中）' : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-stone-500">
        運動
        <select
          className={sel}
          value={filters.sp ?? ''}
          disabled={!sportsAvailable}
          onChange={(e) => onChange({ ...filters, sp: e.target.value || undefined })}
        >
          <option value="">{sportsAvailable ? '全部運動' : '此賽事暫無分項資料'}</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.zh}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
