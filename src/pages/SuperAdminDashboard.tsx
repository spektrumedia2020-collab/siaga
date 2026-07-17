import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { setImpersonateSession, getUserRoles } from '../lib/roleUtils'
import { UserManagement } from './UserManagement'
import '../pages/SuperAdminDashboard.css'

interface MarketStats {
  id: number
  name: string
  code: string
  city: string
  stallCount: number
  transactionCount: number
  totalRevenue: number
  status: string
}

interface MarketHeadUser {
  id: string
  email: string
  marketName?: string
}

export function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview')
  const [markets, setMarkets] = useState<MarketStats[]>([])
  const [marketHeads, setMarketHeads] = useState<MarketHeadUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showImpersonate, setShowImpersonate] = useState(false)
  const [impersonateError, setImpersonateError] = useState('')
  const [totalStats, setTotalStats] = useState({
    marketCount: 0,
    stallCount: 0,
    transactionCount: 0,
    totalRevenue: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Get all markets with stats
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('id, name, code, city, status')
        .order('name')

      if (marketsError) throw marketsError

      // Get stats for each market
      const marketStats = await Promise.all(
        (marketsData || []).map(async (market) => {
          // Count stalls
          const { count: stallCount } = await supabase
            .from('stalls')
            .select('*', { count: 'exact' })
            .eq('market_id', market.id)

          // Count transactions
          const { count: transactionCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('stall_id', `(SELECT id FROM stalls WHERE market_id = ${market.id})`)

          // Get total revenue
          const { data: revenueData } = await supabase
            .from('transactions')
            .select('amount_paid')
            .eq('stall_id', `(SELECT id FROM stalls WHERE market_id = ${market.id})`)

          const totalRevenue = (revenueData || []).reduce(
            (sum, t: any) => sum + (parseFloat(t.amount_paid) || 0),
            0
          )

          return {
            ...market,
            stallCount: stallCount || 0,
            transactionCount: transactionCount || 0,
            totalRevenue
          }
        })
      )

      setMarkets(marketStats)

      // Calculate totals
      const totals = {
        marketCount: marketStats.length,
        stallCount: marketStats.reduce((sum, m) => sum + m.stallCount, 0),
        transactionCount: marketStats.reduce((sum, m) => sum + m.transactionCount, 0),
        totalRevenue: marketStats.reduce((sum, m) => sum + m.totalRevenue, 0)
      }

      setTotalStats(totals)

      // Load market head users
      const { data: marketHeadRoles, error: mhError } = await supabase
        .from('user_roles')
        .select('user_id, markets (name)')
        .eq('role_id', 2) // MARKET_HEAD role

      if (mhError) throw mhError

      const userIds = marketHeadRoles?.map((r: any) => r.user_id) || []
      
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
        if (usersError) throw usersError

        const marketHeadUsers = (users?.users || [])
          .filter(u => userIds.includes(u.id))
          .map((u) => {
            const assignment = marketHeadRoles?.find((r: any) => r.user_id === u.id)
            const markets: any = assignment?.markets
            const marketName = Array.isArray(markets)
              ? markets[0]?.name
              : markets?.name
            return {
              id: u.id,
              email: u.email || '',
              marketName: marketName || 'Belum ditentukan'
            }
          })

        setMarketHeads(marketHeadUsers)
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImpersonate = async (userId: string) => {
    try {
      setImpersonateError('')
      const roles = await getUserRoles(userId)
      
      if (roles.length === 0) {
        setImpersonateError('User tidak memiliki role')
        return
      }

      const targetRole = roles.find((r) => r.role_name === 'MARKET_HEAD') || roles[0]
      const currentUser = (await supabase.auth.getSession()).data.session?.user
      
      if (currentUser) {
        setImpersonateSession(currentUser.id, userId, targetRole)
        // Reload page to see impersonated dashboard
        window.location.reload()
      }
    } catch (err: any) {
      setImpersonateError(err.message || 'Error impersonating user')
    }
  }

  if (loading) {
    return <div className="loading">Memuat data...</div>
  }

  return (
    <div className="superadmin-dashboard">
      <div className="dashboard-header-content">
        <h2>📊 Dashboard Superadmin</h2>
        <p>Overview Sistem SiAga</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Manajemen User
        </button>
        <button
          className="tab-button impersonate-btn"
          onClick={() => setShowImpersonate(!showImpersonate)}
          title="Impersonate sebagai Admin Pasar"
        >
          🔀 Impersonate
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📍</div>
              <div className="stat-content">
                <div className="stat-label">Total Pasar</div>
                <div className="stat-value">{totalStats.marketCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏪</div>
              <div className="stat-content">
                <div className="stat-label">Total Lapak</div>
                <div className="stat-value">{totalStats.stallCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-label">Total Transaksi</div>
                <div className="stat-value">{totalStats.transactionCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💵</div>
              <div className="stat-content">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value">Rp {totalStats.totalRevenue.toLocaleString('id-ID')}</div>
              </div>
            </div>
          </div>

          {/* Markets Table */}
          <div className="section">
            <h3>📋 Data Pasar</h3>
            <div className="table-wrapper">
              <table className="markets-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Pasar</th>
                    <th>Kota</th>
                    <th>Lapak</th>
                    <th>Transaksi</th>
                    <th>Revenue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((market) => (
                    <tr key={market.id}>
                      <td>{market.code}</td>
                      <td>{market.name}</td>
                      <td>{market.city}</td>
                      <td>{market.stallCount}</td>
                      <td>{market.transactionCount}</td>
                      <td>Rp {market.totalRevenue.toLocaleString('id-ID')}</td>
                      <td>
                        <span className={`status-badge status-${market.status.toLowerCase()}`}>
                          {market.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && <UserManagement />}

      {/* Impersonate Panel */}
      {showImpersonate && (
        <div className="impersonate-panel">
          <div className="impersonate-header">
            <h3>🔀 Impersonate Admin Pasar</h3>
            <button onClick={() => setShowImpersonate(false)} className="close-btn">✕</button>
          </div>

          {impersonateError && (
            <div className="error-message">{impersonateError}</div>
          )}

          <div className="market-heads-list">
            {marketHeads.length === 0 ? (
              <p>Tidak ada Admin Pasar</p>
            ) : (
              marketHeads.map((user) => (
                <div key={user.id} className="market-head-card">
                  <div>
                    <h4>{user.email}</h4>
                    <p className="market-assignment">{user.marketName}</p>
                  </div>
                  <button
                    onClick={() => handleImpersonate(user.id)}
                    className="btn-impersonate"
                  >
                    Login sebagai
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
