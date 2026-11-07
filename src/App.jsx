import { Suspense, lazy, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import SuccessPage from './pages/SuccessPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))

export default function App() {
  const [response, setResponse] = useState(null)
  return <BrowserRouter><Routes><Route path="/" element={<HomePage/>}/><Route path="/register" element={<RegisterPage onSubmit={setResponse}/>}/><Route path="/success" element={<SuccessPage response={response} onReset={()=>setResponse(null)}/>}/><Route path="/privacy" element={<PrivacyPage/>}/><Route path="/admin" element={<Suspense fallback={<main className="admin-page"><div className="admin-loading">Loading organizer dashboard…</div></main>}><AdminDashboard/></Suspense>}/><Route path="*" element={<NotFoundPage/>}/></Routes></BrowserRouter>
}
