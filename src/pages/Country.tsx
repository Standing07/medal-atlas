import { Navigate, useParams, useSearchParams } from 'react-router-dom'

/** 舊網址 #/country/<代碼>?s=<賽事> 轉到新的探索頁 */
export default function Country() {
  const { code = 'TPE' } = useParams()
  const [params] = useSearchParams()
  return <Navigate replace to={`/explore?c=${code.toUpperCase()}&g=${params.get('s') ?? 'summer-olympics'}`} />
}
