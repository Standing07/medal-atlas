import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import EChart from './EChart'
import { editionTooltip, editionXAxis, SERIES_COLORS } from '../lib/chart'

export interface TrendLine {
  name: string
  /** 與 editions 同順序；null＝未參賽或未得牌（斷線） */
  values: (number | null)[]
}

/** 歷屆趨勢折線圖：橫軸是真實年份，每屆標「年份 城市」 */
export default function TrendChart({
  editions,
  lines,
  format,
  inverse = false,
  percent = false,
  legend = false,
  className = 'mt-3 h-96 w-full',
}: {
  editions: { year: number; city: string }[]
  lines: TrendLine[]
  format: (v: number | null) => string
  inverse?: boolean
  percent?: boolean
  legend?: boolean
  className?: string
}) {
  const option = useMemo<EChartsOption>(
    () => ({
      animation: false,
      color: SERIES_COLORS,
      grid: { left: 44, right: 96, top: legend ? 36 : 16, bottom: 88 },
      legend: legend ? { top: 0, left: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: '#57534e' } } : { show: false },
      tooltip: editionTooltip(editions, format),
      xAxis: editionXAxis(editions),
      yAxis: {
        type: 'value',
        inverse,
        min: inverse ? 1 : 0,
        minInterval: 1,
        axisLine: { show: true, lineStyle: { color: '#78716c' } },
        axisLabel: { color: '#78716c', formatter: percent ? '{value}%' : '{value}' },
        splitLine: { lineStyle: { color: '#f0efec' } },
      },
      series: lines.map((l) => ({
        name: l.name,
        type: 'line',
        connectNulls: false,
        symbolSize: 6,
        lineStyle: { width: 2 },
        endLabel: { show: lines.length > 1, formatter: '{a}', color: '#44403c', fontSize: 11 },
        labelLayout: { moveOverlap: 'shiftY' },
        data: editions.map((e, i) => [e.year, l.values[i]]),
      })),
    }),
    [editions, lines, format, inverse, percent, legend],
  )
  return <EChart option={option} notMerge className={className} />
}
