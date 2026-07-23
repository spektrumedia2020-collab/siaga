import { useState, useEffect, ReactNode } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import './Dashboard.css'
import { getRoleDisplayName, getUserRoles } from '../lib/roleUtils'
import { MarketsPage } from '../pages/MarketsPage'
import { UserManagement } from '../pages/UserManagement'
import { TransactionsPage } from '../pages/TransactionsPage'
import { ReconciliationsPage } from '../pages/ReconciliationsPage'

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
  activeRoleName?: string | null
}

type PageType = 'dashboard' | 'pasar' | 'users' | 'transaksi' | 'rekonsiliasi' | 'laporan'

export function Dashboard({ user, onLogout, isDashboardHeader, children, impersonation = null, onStopImpersonation, activeRoleName }: DashboardProps) {

  const handleStop = () => {
    if (!onStopImpersonation) return
    const ok = window.confirm('Stop impersonation and return to your account?')
    if (ok) onStopImpersonation()
  }
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [rawUserRoles, setRawUserRoles] = useState<any[]>([])

  // Determine effective role name (internal) for access checks
  const effectiveRoleName = (activeRoleName || (rawUserRoles && rawUserRoles[0]?.role_name) || '') as string
  const isMarketAdmin = ['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN'].includes((effectiveRoleName || '').toUpperCase())

  useEffect(() => {
    // Fetch roles for current user to display in header (fallback/debug)
    let mounted = true
    const fetchRoles = async () => {
      if (!user?.id) return
      try {
        const supabase = getSupabaseClient()
        const { data: userRolesData, error: urError } = await supabase
          .from('user_roles')
          .select('id, user_id, role_id, market_id')
          .eq('user_id', user.id)

        // fetch roles mapping separately to avoid related-select / RLS issues
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id, name')

        const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))

        const enriched = (userRolesData || []).map((ur: any) => ({
          ...ur,
          role_name: roleMap.get(ur.role_id) || 'UNKNOWN'
        }))

        console.debug('Dashboard: fetched user_roles for header', enriched, urError)
        if (mounted) setRawUserRoles(enriched)

        // Fallback: if user_roles is empty, try users.id_role
        if ((enriched || []).length === 0) {
          const { data: userData } = await supabase
            .from('users')
            .select('id_role')
            .eq('auth_uid', user.id)
            .maybeSingle()

          const roleId = userData?.id_role
          const roleName = roleId != null ? (roleMap.get(roleId) || 'UNKNOWN') : null
          if (mounted && roleName) {
            setRawUserRoles([{ role_name: roleName }])
          }
        }
      } catch (e) {
        console.error('Dashboard: error fetching user_roles', e)
      }
    }

    // Read hash from URL and set initial page
    const hash = window.location.hash.slice(1) || 'dashboard'
    setCurrentPage((hash as PageType) || 'dashboard')

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1) || 'dashboard'
      setCurrentPage((newHash as PageType) || 'dashboard')
    }

    window.addEventListener('hashchange', handleHashChange)
    fetchRoles()

    return () => {
      mounted = false
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const assignedMarketId = rawUserRoles?.[0]?.market_id || 0

  const renderContent = () => {
    switch (currentPage) {
      case 'pasar':
        return <MarketsPage />
      case 'users':
        return isMarketAdmin ? <div><h2>Akses ditolak</h2><p>Anda tidak diizinkan melihat halaman ini.</p></div> : <UserManagement />
      case 'transaksi':
        return assignedMarketId ? <TransactionsPage marketId={assignedMarketId} /> : (
          <div className="error-message">
            <h2>Pasar belum ditetapkan</h2>
            <p>Anda belum memiliki pasar yang terhubung untuk melihat transaksi.</p>
          </div>
        )
      case 'rekonsiliasi':
        return assignedMarketId ? <ReconciliationsPage marketId={assignedMarketId} /> : (
          <div className="error-message">
            <h2>Pasar belum ditetapkan</h2>
            <p>Anda belum memiliki pasar yang terhubung untuk melihat rekonsiliasi.</p>
          </div>
        )
      default:
        return (
          <div className="welcome-dashboard">
            <h2>Selamat Datang, {user?.email}!</h2>
            <p>Pilih menu di sidebar untuk memulai.</p>
            <div className="quick-links">
              <a href="#pasar" className="quick-link">
                📍 Manajemen Pasar
              </a>
              {!isMarketAdmin && (
                <>
                  <a href="#users" className="quick-link">
                    👥 User Management
                  </a>
                  <a href="#transaksi" className="quick-link">
                    💰 Transaksi
                  </a>
                  <a href="#laporan" className="quick-link">
                    📊 Laporan
                  </a>
                </>
              )}
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
                <div className="user-email-role">
                  <span className="user-email">{user?.email}</span>
                  {/** show role under email if available; fallback to fetched rawUserRoles */}
                  {activeRoleName ? (
                    <small className="user-role">{getRoleDisplayName(activeRoleName)}</small>
                  ) : rawUserRoles && rawUserRoles.length > 0 ? (
                    <small className="user-role">{getRoleDisplayName(rawUserRoles[0].role_name || (Array.isArray(rawUserRoles[0].roles) ? rawUserRoles[0].roles[0]?.name : rawUserRoles[0].roles?.name))}</small>
                  ) : (
                    <small className="user-role">Tidak ada role</small>
                  )}
                </div>
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
            <div className="user-email-role-inline">
              <span className="user-email">{user?.email}</span>
              <span className="user-role-inline"> {`[🔐 ${getRoleDisplayName(activeRoleName || (rawUserRoles && rawUserRoles[0]?.role_name) || '')}]`}</span>
            </div>
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
                      onClick={(e) => { e.preventDefault(); window.location.hash = 'dashboard'; setCurrentPage('dashboard') }}
                      className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                    >
                      🏠 Dashboard
                    </a>
                  </li>
              <li>
                <a
                  href="#pasar"
                  onClick={(e) => { e.preventDefault(); window.location.hash = 'pasar'; setCurrentPage('pasar') }}
                  className={`nav-link ${currentPage === 'pasar' ? 'active' : ''}`}
                >
                  📍 Pasar
                </a>
              </li>
              {!isMarketAdmin && (
                <>
                  <li>
                    <a
                      href="#users"
                      onClick={(e) => { e.preventDefault(); window.location.hash = 'users'; setCurrentPage('users') }}
                      className={`nav-link ${currentPage === 'users' ? 'active' : ''}`}
                    >
                      👥 Users
                    </a>
                  </li>
                  <li>
                    <a
                      href="#transaksi"
                      onClick={(e) => { e.preventDefault(); window.location.hash = 'transaksi'; setCurrentPage('transaksi') }}
                      className={`nav-link ${currentPage === 'transaksi' ? 'active' : ''}`}
                    >
                      💰 Transaksi
                    </a>
                  </li>
                  <li>
                    <a
                      href="#laporan"
                      onClick={(e) => { e.preventDefault(); window.location.hash = 'laporan'; setCurrentPage('laporan') }}
                      className={`nav-link ${currentPage === 'laporan' ? 'active' : ''}`}
                    >
                      📊 Laporan
                    </a>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </aside>

        <section className="content">
          {children && currentPage === 'dashboard' ? children : renderContent()}
        </section>
      </main>
    </div>
  )
}
