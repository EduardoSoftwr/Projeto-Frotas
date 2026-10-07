import { useEffect, useState } from 'react'
import type { AppPage } from './components/AppLayout'
import AuthProvider from './context/AuthProvider'
import FleetProvider from './context/FleetProvider'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import NewUsagePage from './pages/NewUsagePage'
import ReturnUsagePage from './pages/ReturnUsagePage'
import UsersPage from './pages/UsersPage'
import './App.css'

function readPageFromLocation(): AppPage {
  const requestedPage = new URLSearchParams(window.location.search).get('page')
  if (requestedPage === 'new-usage' || requestedPage === 'return-usage' || requestedPage === 'history' || requestedPage === 'reports' || requestedPage === 'users' || requestedPage === 'login') return requestedPage
  return 'dashboard'
}

function FleetApplication() {
  const [page, setPage] = useState<AppPage>(readPageFromLocation)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  useEffect(() => {
    function syncPageFromLocation() {
      setPage(readPageFromLocation())
    }
    window.addEventListener('popstate', syncPageFromLocation)
    return () => window.removeEventListener('popstate', syncPageFromLocation)
  }, [])

  function navigate(nextPage: AppPage) {
    const nextUrl = new URL(window.location.href)
    if (nextPage === 'dashboard') nextUrl.searchParams.delete('page')
    else nextUrl.searchParams.set('page', nextPage)
    window.history.pushState({}, '', nextUrl)
    setPage(nextPage)
  }

  if (page === 'dashboard') return <DashboardPage onNavigate={navigate} />
  if (page === 'new-usage') return <NewUsagePage onNavigate={navigate} />
  if (page === 'return-usage') return <ReturnUsagePage onNavigate={navigate} />
  if (page === 'login') return <LoginPage onAuthenticated={() => navigate('dashboard')} />
  if (page === 'users') return <UsersPage onNavigate={navigate} />
  return <HistoryPage page={page} onNavigate={navigate} />
}

function App() {
  return <AuthProvider><FleetProvider><FleetApplication /></FleetProvider></AuthProvider>
}

export default App
