/** 表格底下的「顯示全部／收合」按鈕 */
export default function ShowMore({ total, shown, open, onToggle }: { total: number; shown: number; open: boolean; onToggle: () => void }) {
  if (total <= shown && !open) return null
  return (
    <button type="button" onClick={onToggle} className="mt-2 w-full rounded-lg bg-stone-50 py-2 text-sm text-stone-600 hover:bg-stone-100">
      {open ? '收合，只看前 10 名' : `更多（共 ${total} 個國家／地區）`}
    </button>
  )
}

/** 前 10 名＋焦點國家 */
export function topPlusFocus<T extends { key: string }>(rows: T[], open: boolean, focus?: string, n = 10): T[] {
  return open ? rows : rows.filter((r, i) => i < n || r.key === focus)
}
