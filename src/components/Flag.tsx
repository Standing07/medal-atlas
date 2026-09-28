/** SVG 國旗（flag-icons）。歷史代表隊（蘇聯、東德、聯隊等）沒有現行國旗，改顯示代碼小方塊 */
export default function Flag({ iso2, code, className = '' }: { iso2: string | null; code?: string; className?: string }) {
  if (!iso2)
    return (
      <span
        className={`inline-flex h-[0.9em] w-[1.33em] items-center justify-center rounded-sm bg-stone-200 text-[0.45em] font-semibold leading-none text-stone-600 ${className}`}
        aria-hidden
      >
        {code?.slice(0, 3)}
      </span>
    )
  return <span className={`fi fi-${iso2.toLowerCase()} rounded-sm shadow-sm ${className}`} aria-hidden />
}
