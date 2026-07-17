import { useState, useEffect, ReactNode } from 'react'
import './Dashboard.css'
import { MarketsPage } from '../pages/MarketsPage'
import { OfficersPage } from '../pages/OfficersPage'
import { StallsPage } from '../pages/StallsPage'
import { UserManagement } from '../pages/UserManagement'

interface DashboardProps {
  user: any
  onLogout: () => void
  isDashboardHeader?: boolean
  children?: ReactNode
  impersonation?: {
    originalUserId: string
    targetUserId: string
    targetRole: any
  } | null
  onStopImpersonation?: () => void
}

type PageType = 'dashboard' | 'pasar' | 'lapak' | 'petugas' | 'users' | 'transaksi' | 'laporan'

export function Dashboard({ user, onLogout, isDashboardHeader, children }: DashboardProps) {
  // @ts-ignore
  const impersonation = (arguments[0] && arguments[0].impersonation) || null
  // @ts-ignore
  const onStopImpersonation = (arguments[0] && arguments[0].onStopImpersonation) || undefined

  const handleStop = () => {
    if (!onStopImpersonation) return
    const ok = window.confirm('Stop impersonation and return to your account?')
    if (ok) onStopImpersonation()
  }
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')

  useEffect(() => {
    // Read hash from URL
    const hash = window.location.hash.slice(1) || 'dashboard'
    setCurrentPage((hash as PageType) || 'dashboard')

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1) || 'dashboard'
      setCurrentPage((newHash as PageType) || 'dashboard')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const renderContent = () => {
    switch (currentPage) {
      case 'pasar':
        return <MarketsPage />
      case 'lapak':
        return <StallsPage marketId={0} />
      case 'petugas':
        return <OfficersPage marketId={0} />
      case 'users':
        return <UserManagement />
      case 'transaksi':
        return <div><h2>Halaman Transaksi (Coming Soon)</h2></div>
      case 'laporan':
        return <div><h2>Halaman Laporan (Coming Soon)</h2></div>
      default:
        return (
          <div className="welcome-dashboard">
            <h2>Selamat Datang, {user?.email}!</h2>
            <p>Pilih menu di sidebar untuk memulai.</p>
            <div className="quick-links">
              <a href="#pasar" className="quick-link">
                📍 Manajemen Pasar
              </a>
              <a href="#lapak" className="quick-link">
                🏪 Manajemen Lapak
              </a>
              <a href="#petugas" className="quick-link">
                👮 Manajemen Petugas
              </a>
              <a href="#users" className="quick-link">
                👥 User Management
              </a>
              <a href="#transaksi" className="quick-link">
                💰 Transaksi
              </a>
              <a href="#laporan" className="quick-link">
                📊 Laporan
              </a>
            </div>
          </div>
        )
    }
  }

  // If using custom dashboard (superadmin/market admin)
  if (isDashboardHeader && children) {
    return (
      <div className="dashboard">
        {impersonation && (
          <div className="impersonation-banner" style={{background:'#ffeeba',padding:'8px 12px',textAlign:'center'}}>
            <strong>🔀 Impersonating as {impersonation.targetRole?.role_name || impersonation.targetUserId}</strong>
            {onStopImpersonation && (
              <button style={{marginLeft:12}} onClick={handleStop}>Stop impersonation</button>
            )}
          </div>
        )}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="logo-section">
              <img src="/logo.jpeg" alt="SiAga Logo" className="logo-img" />
              <h1 className="app-name">SiAga</h1>
            </div>
            <div className="user-info">
              <span>{user?.email}</span>
              <button onClick={onLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="dashboard-main-full">
          <section className="content-full">
            {children}
          </section>
        </main>
      </div>
    )
  }

  // Default dashboard with sidebar
  return (
    <div className="dashboard">
      {impersonation && (
        <div className="impersonation-banner" style={{background:'#ffeeba',padding:'8px 12px',textAlign:'center'}}>
          <strong>🔀 Impersonating as {impersonation.targetRole?.role_name || impersonation.targetUserId}</strong>
          {onStopImpersonation && (
            <button style={{marginLeft:12}} onClick={handleStop}>Stop impersonation</button>
          )}
        </div>
      )}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <img src="/logo.jpeg" alt="SiAga Logo" className="logo-img" />
            <h1 className="app-name">SiAga</h1>
          </div>
          <div className="user-info">
            <span>{user?.email}</span>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <aside className="sidebar">
          <nav>
            <ul>
              <li>
                <a
                  href="#dashboard"
                  className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                >
                  🏠 Dashboard
                </a>
              </li>
              <li>
                <a
                  href="#pasar"
                  className={`nav-link ${currentPage === 'pasar' ? 'active' : ''}`}
                >
                  📍 Pasar
                </a>
              </li>
              <li>
                <a
                  href="#lapak"
                  className={`nav-link ${currentPage === 'lapak' ? 'active' : ''}`}
                >
                  🏪 Lapak
                </a>
              </li>
              <li>
                <a
                  href="#petugas"
                  className={`nav-link ${currentPage === 'petugas' ? 'active' : ''}`}
                >
                  👮 Petugas
                </a>
              </li>
              <li>
                <a
                  href="#users"
                  className={`nav-link ${currentPage === 'users' ? 'active' : ''}`}
                >
                  👥 Users
                </a>
              </li>
              <li>
                <a
                  href="#transaksi"
                  className={`nav-link ${currentPage === 'transaksi' ? 'active' : ''}`}
                >
                  💰 Transaksi
                </a>
              </li>
              <li>
                <a
                  href="#laporan"
                  className={`nav-link ${currentPage === 'laporan' ? 'active' : ''}`}
                >
                  📊 Laporan
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        <section className="content">
          {renderContent()}
        </section>
      </main>
    </div>
  )
}
