import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import Live from './pages/Live'
import Games from './pages/Games'
import Country from './pages/Country'
import About from './pages/About'
import Explore from './pages/Explore'

// 用 hash 路由（網址帶 #/），部署在靜態主機上不需要額外設定轉址
const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Live /> },
      { path: 'games', element: <Games /> },
      { path: 'games/:series', element: <Games /> },
      { path: 'games/:series/:year', element: <Games /> },
      { path: 'country/:code', element: <Country /> },
      { path: 'explore', element: <Explore /> },
      { path: 'about', element: <About /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
