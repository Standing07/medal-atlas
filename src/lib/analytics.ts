// Cloudflare Web Analytics：瀏覽人數統計。不使用 cookie、不收集個人資料，所以不需要同意視窗。
// 網址用 #/ 路由，React Router 換頁時會呼叫 history.pushState；開啟 spa 模式讓 Cloudflare 把換頁也算進去。
import { CF_ANALYTICS_TOKEN } from '../config'

let started = false
export function initAnalytics() {
  if (!CF_ANALYTICS_TOKEN || started) return
  started = true
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_ANALYTICS_TOKEN, spa: true }))
  document.head.appendChild(s)
}

export const analyticsEnabled = () => !!CF_ANALYTICS_TOKEN
