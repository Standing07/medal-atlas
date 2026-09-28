// Google Analytics 4：瀏覽人數統計。
// 採「同意模式」：訪客按「同意」前不寫 cookie（Google 只收到不含 cookie 的匿名計數），按了才完整統計。
import { GA_ID } from '../config'

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

const KEY = 'medal-atlas-consent'
export type Consent = 'granted' | 'denied'

export function storedConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

let started = false
export function initAnalytics() {
  if (!GA_ID || started) return
  started = true
  window.dataLayer = window.dataLayer || []
  // gtag 規定要把 arguments 物件原樣放進 dataLayer
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('consent', 'default', {
    analytics_storage: storedConsent() === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { send_page_view: false })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

/** 網址用 #/ 路由，換頁時要自己送 page_view */
export function trackPage() {
  if (!GA_ID) return
  window.gtag?.('event', 'page_view', {
    page_location: location.href,
    page_path: location.pathname + location.hash,
    page_title: document.title,
  })
}

export function setConsent(v: Consent) {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* 私密瀏覽等情況存不了，就只套用這次 */
  }
  window.gtag?.('consent', 'update', { analytics_storage: v })
}

export const analyticsEnabled = () => !!GA_ID
