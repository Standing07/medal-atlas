import { Navigate, useParams } from 'react-router-dom'

/** 舊網址 #/games/<賽事>/<年份> 轉到新的探索頁 */
export default function Games() {
  const { series = 'summer-olympics', year } = useParams()
  return <Navigate replace to={`/explore?g=${series}${year ? `&y=${year}` : ''}`} />
}
