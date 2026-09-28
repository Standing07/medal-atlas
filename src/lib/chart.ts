import type { EChartsOption } from 'echarts'

type Ed = { year: number; city: string }

/**
 * 歷屆橫軸：用「真實年份」當刻度（停辦年份會留空，比例正確），
 * 每一屆都有刻度，標籤寫「年份 城市」。
 */
export function editionXAxis(editions: Ed[]): EChartsOption['xAxis'] {
  const years = editions.map((e) => e.year)
  const city = new Map(editions.map((e) => [e.year, e.city]))
  return {
    type: 'value',
    min: years[0] - 2,
    max: years[years.length - 1] + 2,
    axisLine: { show: true, onZero: false, lineStyle: { color: '#78716c', width: 1 } },
    axisTick: { show: true, customValues: years, length: 4, lineStyle: { color: '#78716c' } },
    axisLabel: {
      customValues: years,
      formatter: (v: number) => `${v} ${city.get(v) ?? ''}`,
      rotate: 55,
      fontSize: 10,
      color: '#57534e',
      hideOverlap: true,
    },
    splitLine: { show: false },
    axisPointer: { snap: true, label: { show: false } },
  }
}

/** 滑過圖表時的提示框：標題是「年份 城市」，下面列出每條線在該屆的數值 */
export function editionTooltip(editions: Ed[], fmt: (v: number | null) => string): EChartsOption['tooltip'] {
  const city = new Map(editions.map((e) => [e.year, e.city]))
  return {
    trigger: 'axis',
    axisPointer: { type: 'line', lineStyle: { color: '#a8a29e' } },
    formatter: (params) => {
      const list = (Array.isArray(params) ? params : [params]) as unknown as {
        value: [number, number | null]
        marker: string
        seriesName: string
      }[]
      if (!list.length) return ''
      const year = list[0].value[0]
      const rows = list.map((p) => `${p.marker}${p.seriesName}　<b>${fmt(p.value[1])}</b>`).join('<br/>')
      return `<div style="font-weight:600;margin-bottom:2px">${year} ${city.get(year) ?? ''}</div>${rows}`
    },
  }
}

/** 系列顏色：依國家被加入的順序固定分配，不依名次重新上色 */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
