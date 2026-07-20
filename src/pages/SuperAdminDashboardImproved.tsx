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
      const { data: marketsData } = await supabase
        .from('markets')
        .select('id, name, code, city, address, status')
        .order('name')

      if (marketsData) {
        const marketStats = await Promise.all(
          marketsData.map(async (market: any) => {
            const { count: stallCount } = await supabase
              .from('stalls')
              .select('*', { count: 'exact' })
              .eq('market_id', market.id)

            const { count: officerCount } = await supabase
              .from('officers')
              .select('*', { count: 'exact' })
              .eq('market_id', market.id)

            const { data: stallRows } = await supabase
              .from('stalls')
              .select('id')
              .eq('market_id', market.id)

            const stallIds = stallRows?.map(s => s.id) || []
            
            let transactionCount = 0
            let totalRevenue = 0

            if (stallIds.length > 0) {
              const { count } = await supabase
                .from('transactions')
                .select('*', { count: 'exact' })
                .in('stall_id', stallIds)

              const { data: revenueData } = await supabase
                .from('transactions')
                .select('amount')
                .in('stall_id', stallIds)

              transactionCount = count || 0
              totalRevenue = (revenueData || []).reduce(
                (sum: number, t: any) => sum + (parseFloat(t.amount) || 0),
                0
              )
            }

            return {
              ...market,
              stallCount: stallCount || 0,
              officerCount: officerCount || 0,
              transactionCount,
              totalRevenue
            }
          })
        )

        setMarkets(marketStats)
        setTotalStats({
          marketCount: marketStats.length,
          stallCount: marketStats.reduce((sum, m) => sum + m.stallCount, 0),
          officerCount: marketStats.reduce((sum, m) => sum + m.officerCount, 0),
          transactionCount: marketStats.reduce((sum, m) => sum + m.transactionCount, 0),
          totalRevenue: marketStats.reduce((sum, m) => sum + m.totalRevenue, 0)
        })
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const dailyRevenueData = [
    { day: 'Sen', revenue: totalStats.totalRevenue * 0.12, transactions: Math.round(totalStats.transactionCount * 0.1) },
    { day: 'Sel', revenue: totalStats.totalRevenue * 0.15, transactions: Math.round(totalStats.transactionCount * 0.12) },
    { day: 'Rab', revenue: totalStats.totalRevenue * 0.18, transactions: Math.round(totalStats.transactionCount * 0.15) },
    { day: 'Kam', revenue: totalStats.totalRevenue * 0.22, transactions: Math.round(totalStats.transactionCount * 0.18) },
    { day: 'Jum', revenue: totalStats.totalRevenue * 0.2, transactions: Math.round(totalStats.transactionCount * 0.2) },
    { day: 'Sab', revenue: totalStats.totalRevenue * 0.13, transactions: Math.round(totalStats.transactionCount * 0.14) },
    { day: 'Min', revenue: totalStats.totalRevenue * 0.1, transactions: Math.round(totalStats.transactionCount * 0.11) }
  ]

  const statusData = [
    { name: 'Aktif', value: markets.filter(m => m.status === 'AKTIF').length },
    { name: 'Non-Aktif', value: markets.filter(m => m.status !== 'AKTIF').length }
  ]

  const transactionsTrend = dailyRevenueData.map(d => ({
    day: d.day,
    count: d.transactions
  }))

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
                  <LineChart data={dailyRevenueData}>
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
                  <BarChart data={transactionsTrend}>
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
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} fill="#8884d8" dataKey="value" label>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
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