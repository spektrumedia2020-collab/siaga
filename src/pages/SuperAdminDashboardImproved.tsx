import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { UserRole } from '../lib/roleUtils'
import '../pages/SuperAdminDashboardImproved.css'
import '../styles/layout.css'
import { MarketsManagement } from './MarketsManagement'
import { UserManagement } from './UserManagement'
import { RetribusiPage } from './RetribusiPage'
import { ThemeManagement } from './ThemeManagement'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'

interface MarketStats {
  id: number
  name: string
  code: string
  city: string
  address?: string
  stallCount: number
  officerCount: number
  transactionCount: number
  totalRevenue: number
  status: string
}

const CHART_COLORS = ['#1f7a1f', '#f4c300', '#3d5224', '#ff6b6b', '#4ecdc4', '#45b7d1']

interface Props {
  onImpersonate?: (userId: string, role: UserRole) => void
}

export function SuperAdminDashboardImproved({ onImpersonate }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'markets' | 'analytics' | 'users' | 'retribusi' | 'themes' | 'settings' | 'backup'>('overview')
  const [markets, setMarkets] = useState<MarketStats[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [showProfile, setShowProfile] = useState(false)
  const [totalStats, setTotalStats] = useState({
    marketCount: 0,
    stallCount: 0,
    officerCount: 0,
    transactionCount: 0,
    totalRevenue: 0
  })
  const [analytics, setAnalytics] = useState({
    dailyRevenueData: [] as Array<{ day: string; revenue: number; transactions: number }>,
    transactionsTrend: [] as Array<{ day: string; count: number }>,
    statusData: [] as Array<{ name: string; value: number }>,
    topMarkets: [] as Array<{ name: string; revenue: number; transactions: number }>,
    topStalls: [] as Array<{ name: string; revenue: number; transactions: number }>,
    topOfficers: [] as Array<{ name: string; revenue: number; transactions: number }>
  })

  useEffect(() => {
    loadStats()
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || 'admin@siaga.id')
    } catch (err) {
      setUserEmail('admin@siaga.id')
    }
  }

  const loadStats = async () => {
    try {
      const supabase = getSupabaseClient()

      const [marketsResult, stallsResult, usersResult, transactionsResult] = await Promise.all([
        supabase
          .from('markets')
          .select('id, name, code, city, address, status')
          .order('name'),
        supabase
          .from('stalls')
          .select('id, market_id, name, code, number')
          .order('id'),
        supabase
          .from('users')
          .select('id, market_id, email, display_name, full_name')
          .order('id'),
        supabase
          .from('transactions')
          .select('id, amount, stall_id, officer_id, created_at, transaction_date')
          .order('created_at', { ascending: false })
      ])

      const marketsData = marketsResult.data || []
      const stallsData = stallsResult.data || []
      const usersData = usersResult.data || []
      const transactionsData = transactionsResult.data || []

      const stallsByMarket = new Map<number, any[]>()
      const usersByMarket = new Map<number, any[]>()
      const stallLookup = new Map<number, any>()
      const officerLookup = new Map<string, any>()

      stallsData.forEach((stall: any) => {
        stallLookup.set(stall.id, stall)
        const existing = stallsByMarket.get(stall.market_id) || []
        existing.push(stall)
        stallsByMarket.set(stall.market_id, existing)
      })

      usersData.forEach((user: any) => {
        officerLookup.set(String(user.id), user)
        const existing = usersByMarket.get(user.market_id) || []
        existing.push(user)
        usersByMarket.set(user.market_id, existing)
      })

      const marketStats = marketsData.map((market: any) => {
        const stallList = stallsByMarket.get(market.id) || []
        const officerList = usersByMarket.get(market.id) || []
        const stallIds = stallList.map((stall: any) => stall.id)

        const marketTransactions = transactionsData.filter((transaction: any) =>
          stallIds.includes(transaction.stall_id)
        )

        const totalRevenue = marketTransactions.reduce(
          (sum: number, transaction: any) => sum + (Number(transaction.amount) || 0),
          0
        )

        return {
          ...market,
          status: market.status || 'NONAKTIF',
          stallCount: stallList.length,
          officerCount: officerList.length,
          transactionCount: marketTransactions.length,
          totalRevenue
        }
      })

      setMarkets(marketStats)

      const totalRevenue = marketStats.reduce((sum, market) => sum + market.totalRevenue, 0)
      setTotalStats({
        marketCount: marketStats.length,
        stallCount: marketStats.reduce((sum, m) => sum + m.stallCount, 0),
        officerCount: marketStats.reduce((sum, m) => sum + m.officerCount, 0),
        transactionCount: marketStats.reduce((sum, m) => sum + m.transactionCount, 0),
        totalRevenue
      })

      const now = new Date()
      const startDate = new Date(now)
      startDate.setDate(now.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)

      const last7Days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + index)
        return {
          key: date.toISOString().split('T')[0],
          shortLabel: date.toLocaleDateString('id-ID', { weekday: 'short' }),
          fullLabel: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        }
      })

      const revenueByDay = new Map<string, { revenue: number; transactions: number }>()
      last7Days.forEach((day) => {
        revenueByDay.set(day.key, { revenue: 0, transactions: 0 })
      })

      transactionsData.forEach((transaction: any) => {
        const rawDate = transaction.transaction_date || transaction.created_at
        if (!rawDate) return

        const txDate = new Date(rawDate)
        if (Number.isNaN(txDate.getTime())) return

        const key = txDate.toISOString().split('T')[0]
        if (!revenueByDay.has(key)) return

        const current = revenueByDay.get(key) || { revenue: 0, transactions: 0 }
        current.revenue += Number(transaction.amount) || 0
        current.transactions += 1
        revenueByDay.set(key, current)
      })

      const dailyRevenueData = last7Days.map((day) => {
        const current = revenueByDay.get(day.key) || { revenue: 0, transactions: 0 }

        return {
          day: day.shortLabel,
          revenue: current.revenue,
          transactions: current.transactions
        }
      })

      const statusData = [
        {
          name: 'Aktif',
          value: marketStats.filter((market) => (market.status || '').toUpperCase() === 'AKTIF').length
        },
        {
          name: 'Non-Aktif',
          value: marketStats.filter((market) => (market.status || '').toUpperCase() !== 'AKTIF').length
        }
      ]

      const stallRevenueMap = new Map<number, { name: string; revenue: number; transactions: number }>()
      stallsData.forEach((stall: any) => {
        stallRevenueMap.set(stall.id, {
          name: stall.name || stall.code || `Lapak ${stall.number || stall.id}`,
          revenue: 0,
          transactions: 0
        })
      })

      transactionsData.forEach((transaction: any) => {
        const stallId = Number(transaction.stall_id)
        if (!stallId || !stallRevenueMap.has(stallId)) return

        const current = stallRevenueMap.get(stallId) || { name: 'Lapak', revenue: 0, transactions: 0 }
        current.revenue += Number(transaction.amount) || 0
        current.transactions += 1
        stallRevenueMap.set(stallId, current)
      })

      const topStalls = Array.from(stallRevenueMap.values())
        .filter((item) => item.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      const officerRevenueMap = new Map<string, { name: string; revenue: number; transactions: number }>()
      transactionsData.forEach((transaction: any) => {
        const officerId = transaction.officer_id
        if (!officerId) return

        const officer = officerLookup.get(String(officerId))
        const officerName = officer?.display_name || officer?.full_name || officer?.email || `Petugas ${officerId}`
        const current = officerRevenueMap.get(String(officerId)) || {
          name: officerName,
          revenue: 0,
          transactions: 0
        }

        current.revenue += Number(transaction.amount) || 0
        current.transactions += 1
        officerRevenueMap.set(String(officerId), current)
      })

      const topOfficers = Array.from(officerRevenueMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      const topMarkets = marketStats
        .map((market) => ({
          name: market.name,
          revenue: market.totalRevenue,
          transactions: market.transactionCount
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      setAnalytics({
        dailyRevenueData,
        transactionsTrend: dailyRevenueData.map((item) => ({ day: item.day, count: item.transactions })),
        statusData,
        topMarkets,
        topStalls,
        topOfficers
      })
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="siaga-loading">
        <div>Memuat data dashboard...</div>
      </div>
    )
  }

  return (
    <div className="superadmin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">🔧</div>
          <h3>Superadmin</h3>
        </div>
        
        <nav className="sidebar-nav">
          {/* Group 1: Dashboard */}
          <div className="sidebar-group">
            <div className="sidebar-group-label">DASHBOARD</div>
            <button className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              📊 Overview
            </button>
            <button className={`sidebar-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              📈 Analytics
            </button>
          </div>

          {/* Group 2: Data Master */}
          <div className="sidebar-group">
            <div className="sidebar-group-label">DATA MASTER</div>
            <button className={`sidebar-item ${activeTab === 'markets' ? 'active' : ''}`} onClick={() => setActiveTab('markets')}>
              🏪 Manajemen Pasar
            </button>
            <button className={`sidebar-item ${activeTab === 'retribusi' ? 'active' : ''}`} onClick={() => setActiveTab('retribusi')}>
              💰 Retribusi
            </button>
            <button className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              👥 Manajemen User
            </button>
          </div>

          {/* Group 3: Sistem */}
          <div className="sidebar-group">
            <div className="sidebar-group-label">SISTEM</div>
            <button className={`sidebar-item ${activeTab === 'themes' ? 'active' : ''}`} onClick={() => setActiveTab('themes')}>
              🎨 Tema Pasar
            </button>
            <button className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              ⚙️ Pengaturan
            </button>
            <button className={`sidebar-item ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
              📥 Backup Data
            </button>
          </div>
        </nav>
        
        <div className="sidebar-footer">
          <button className="siaga-btn siaga-btn-outline profile-btn" onClick={() => setShowProfile(!showProfile)}>
            👤 {userEmail.split('@')[0]}
          </button>
        </div>
      </aside>

      {showProfile && (
        <div className="profile-dropdown">
          <div className="profile-info">
            <div className="profile-email">{userEmail}</div>
            <div className="profile-role">🔐 Superadmin</div>
            <button className="siaga-btn siaga-btn-primary logout-action" onClick={async () => {
              const supabase = getSupabaseClient()
              await supabase.auth.signOut()
              window.location.reload()
            }}>Logout</button>
          </div>
        </div>
      )}

      <main className="admin-main">
        {activeTab === 'overview' && (
          <section className="overview-section">
            <div className="section-header">
              <h2>📊 Dashboard Superadmin SIAGA</h2>
              <p>Analytics & Manajemen Sistem Pasar Makassar</p>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📍</div>
                <div className="stat-content">
                  <div className="stat-label">Total Pasar</div>
                  <div className="stat-value">{totalStats.marketCount}</div>
                  <div className="stat-change positive">+12% dari bulan lalu</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🏪</div>
                <div className="stat-content">
                  <div className="stat-label">Total Lapak</div>
                  <div className="stat-value">{totalStats.stallCount}</div>
                  <div className="stat-change positive">+8% dari bulan lalu</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👮</div>
                <div className="stat-content">
                  <div className="stat-label">Total Petugas</div>
                  <div className="stat-value">{totalStats.officerCount}</div>
                  <div className="stat-change">Stabil</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💵</div>
                <div className="stat-content">
                  <div className="stat-label">Total Revenue</div>
                  <div className="stat-value">Rp {totalStats.totalRevenue.toLocaleString('id-ID')}</div>
                  <div className="stat-change positive">+15% dari bulan lalu</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="analytics-section">
            <div className="section-header">
              <h2>📈 Analytics Dashboard</h2>
            </div>
            <div className="charts-container">
              <div className="chart-card">
                <h3 className="chart-title">📈 Trend Pendapatan Harian</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.dailyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(v: number) => `Rp ${(v / 1000000).toFixed(1)}jt`} />
                    <Tooltip formatter={(value) => [`Rp ${Number(value || 0).toLocaleString('id-ID')}`, 'Pendapatan']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#1f7a1f" strokeWidth={3} name="Pendapatan (Rp)" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">🧾 Trend Transaksi Harian</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.transactionsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f4c300" name="Jumlah Transaksi" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3 className="chart-title">🎯 Status Pasar</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={analytics.statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} fill="#8884d8" dataKey="value" label>
                      {analytics.statusData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="charts-container" style={{ paddingTop: 0 }}>
              <div className="chart-card">
                <h3 className="chart-title">🏆 Top Pasar</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {analytics.topMarkets.length === 0 ? (
                    <p style={{ margin: 0, color: '#64748b' }}>Belum ada data pasar.</p>
                  ) : (
                    analytics.topMarkets.map((market, index) => (
                      <div key={market.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: index < analytics.topMarkets.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: index < analytics.topMarkets.length - 1 ? 8 : 0 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{index + 1}. {market.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{market.transactions} transaksi</div>
                        </div>
                        <strong>Rp {market.revenue.toLocaleString('id-ID')}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">🏪 Top Lapak</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {analytics.topStalls.length === 0 ? (
                    <p style={{ margin: 0, color: '#64748b' }}>Belum ada data lapak.</p>
                  ) : (
                    analytics.topStalls.map((stall, index) => (
                      <div key={stall.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: index < analytics.topStalls.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: index < analytics.topStalls.length - 1 ? 8 : 0 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{index + 1}. {stall.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{stall.transactions} transaksi</div>
                        </div>
                        <strong>Rp {stall.revenue.toLocaleString('id-ID')}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="chart-card">
                <h3 className="chart-title">👮 Top Petugas</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {analytics.topOfficers.length === 0 ? (
                    <p style={{ margin: 0, color: '#64748b' }}>Belum ada data petugas.</p>
                  ) : (
                    analytics.topOfficers.map((officer, index) => (
                      <div key={officer.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: index < analytics.topOfficers.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: index < analytics.topOfficers.length - 1 ? 8 : 0 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{index + 1}. {officer.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{officer.transactions} transaksi</div>
                        </div>
                        <strong>Rp {officer.revenue.toLocaleString('id-ID')}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'markets' && (
          <section className="markets-section">
            <div className="section-header">
              <h2>🏪 Manajemen Pasar</h2>
            </div>
            <MarketsManagement onImpersonate={onImpersonate} />
          </section>
        )}

        {activeTab === 'users' && (
          <section className="users-section">
            <div className="section-header">
              <h2>👥 Manajemen User</h2>
            </div>
            <UserManagement />
          </section>
        )}

        {activeTab === 'retribusi' && (
          <section className="retribusi-section">
            <RetribusiPage />
          </section>
        )}

        {activeTab === 'themes' && (
          <section className="themes-section">
            <div className="section-header">
              <h2>🎨 Manajemen Tema Pasar</h2>
              <p>Buat dan kelola tema untuk setiap pasar</p>
            </div>
            <ThemeManagement />
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="settings-section">
            <div className="section-header">
              <h2>⚙️ Pengaturan Sistem</h2>
            </div>
            <div className="siaga-card" style={{ padding: 24, marginTop: 24 }}>
              <p style={{ color: '#64748b', marginBottom: 24 }}>Pengaturan umum sistem SIAGA</p>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Nama Sistem</label>
                  <input type="text" className="siaga-input" defaultValue="SIAGA - Sistem Informasi Administrasi Pasar" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Email Notifikasi</label>
                  <input type="email" className="siaga-input" defaultValue="admin@siaga.id" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Masa Retribusi (hari)</label>
                  <input type="number" className="siaga-input" defaultValue="30" />
                </div>
                <button className="siaga-btn siaga-btn-primary">Simpan Pengaturan</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'backup' && (
          <section className="backup-section">
            <div className="section-header">
              <h2>📥 Backup & Restore Data</h2>
            </div>
            <div className="siaga-card" style={{ padding: 24, marginTop: 24 }}>
              <p style={{ color: '#64748b', marginBottom: 24 }}>Backup data sistem untuk keamanan</p>
              <div style={{ display: 'grid', gap: 16 }}>
                <button className="siaga-btn siaga-btn-primary" style={{ width: 'fit-content' }}>
                  📥 Backup Semua Data (JSON)
                </button>
                <button className="siaga-btn siaga-btn-primary" style={{ width: 'fit-content' }}>
                  📊 Backup Laporan Excel
                </button>
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Upload File Backup</label>
                  <input type="file" accept=".json,.xlsx,.csv" className="siaga-input" />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}