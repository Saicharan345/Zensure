import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LogIn, LogOut, Shield } from 'lucide-react'
import LoginPage from './pages/LoginPage'
import AdminLoginPage from './pages/AdminLoginPage'
import DashboardPage from './pages/DashboardPage'
import SPILIntegrationPage from './pages/SPILIntegrationPage'
import AIIMSEnginePage from './pages/AIIMSEnginePage'
import WalletPage from './pages/WalletPage'
import AdminPanelPage from './pages/AdminPanelPage'

const getAPIUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location.hostname.includes('loca.lt')) return 'https://zensure-api.loca.lt'
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) return ''
  // Production fallback — if no env var set, try relative (won't work cross-origin)
  return ''
}

const API_URL = getAPIUrl()

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('zensure_auth')
    if (!stored) return null

    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  })
  
  const [adminUser, setAdminUser] = useState(() => {
    const stored = localStorage.getItem('zensure_admin_auth')
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  })

  const [currentAdminToken, setCurrentAdminToken] = useState(() => localStorage.getItem('zensure_admin_token'))

  const handleLogin = useCallback((authData) => {
    // Clear everything first to prevent session bleeding
    localStorage.removeItem('zensure_auth')
    localStorage.removeItem('zensure_admin_token')
    localStorage.removeItem('zensure_admin_auth')
    setCurrentUser(null)
    setAdminUser(null)
    setCurrentAdminToken(null)

    if (authData.role === 'admin') {
      setCurrentAdminToken(authData.token)
      setAdminUser(authData.user)
      localStorage.setItem('zensure_admin_token', authData.token)
      localStorage.setItem('zensure_admin_auth', JSON.stringify(authData.user))
    } else {
      setCurrentUser(authData.user)
      localStorage.setItem('zensure_auth', JSON.stringify(authData.user))
    }
  }, [])

  const handleLogout = useCallback(() => {
    setCurrentUser(null)
    setAdminUser(null)
    setCurrentAdminToken(null)
    localStorage.removeItem('zensure_auth')
    localStorage.removeItem('zensure_admin_token')
    localStorage.removeItem('zensure_admin_auth')
    window.location.href = '/' // Force reload to clear state
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public/Worker/Admin Routing */}
        {(!currentUser && !adminUser) ? (
          <>
            <Route path="/admin-login" element={<AdminLoginPage onLogin={handleLogin} apiUrl={API_URL} />} />
            <Route path="/*" element={<LoginPage onLogin={handleLogin} apiUrl={API_URL} />} />
          </>
        ) : adminUser ? (
          /* Admin Specific Routes */
          <Route
            path="/*"
            element={
              <PageLayout 
                currentUser={adminUser} 
                onLogout={handleLogout} 
                isAdmin={true} 
                apiUrl={API_URL}
              >
                <Routes>
                  <Route path="/" element={<AdminPanelPage adminToken={currentAdminToken} apiUrl={API_URL} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PageLayout>
            }
          />
        ) : (
          /* Worker Specific Routes */
          <>
            <Route
              path="/"
              element={
                <PageLayout currentUser={currentUser} onLogout={handleLogout} apiUrl={API_URL}>
                  <DashboardPage currentUser={currentUser} apiUrl={API_URL} />
                </PageLayout>
              }
            />
            <Route
              path="/spil"
              element={
                <PageLayout currentUser={currentUser} onLogout={handleLogout} apiUrl={API_URL}>
                  <SPILIntegrationPage currentUser={currentUser} apiUrl={API_URL} />
                </PageLayout>
              }
            />
            <Route
              path="/aiims"
              element={
                <PageLayout currentUser={currentUser} onLogout={handleLogout} apiUrl={API_URL}>
                  <AIIMSEnginePage currentUser={currentUser} apiUrl={API_URL} />
                </PageLayout>
              }
            />
            <Route
              path="/wallet"
              element={
                <PageLayout currentUser={currentUser} onLogout={handleLogout} apiUrl={API_URL}>
                  <WalletPage currentUser={currentUser} apiUrl={API_URL} />
                </PageLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

function PageLayout({ children, currentUser, onLogout, isAdmin, apiUrl }) {
  const isActive = (path) => window.location.pathname === path


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <a href="/" className="flex items-center gap-2 text-2xl font-bold text-cyan-400 hover:text-cyan-300">
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
                ZENSURE {isAdmin && <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md ml-2 tracking-[0.2em] uppercase">Admin</span>}
              </a>

              {!isAdmin && (
                <nav className="flex gap-1">
                  <NavLink path="/" text="Dashboard" active={isActive('/')} />
                  <NavLink path="/spil" text="SPIL Integration" active={isActive('/spil')} />
                  <NavLink path="/wallet" text="ZenCoins" active={isActive('/wallet')} />
                  <NavLink path="/aiims" text="AIIMS Engine" active={isActive('/aiims')} />
                </nav>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-200">{currentUser.name}</div>
                <div className="text-xs text-slate-400">{isAdmin ? currentUser.email : `${currentUser.platform} | ${currentUser.city}`}</div>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/20"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}

function NavLink({ path, text, active }) {
  return (
    <a
      href={path}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-cyan-600/20 text-cyan-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      {text}
    </a>
  )
}
