import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getUserMarket } from '../lib/roleUtils'
import { OfficersPage } from './OfficersPage'
import { StallsPage } from './StallsPage'
import '../pages/MarketDashboard.css'

interface MarketStats {
  market: any
  stallCount: number
  officerCount: number
  transactionCount: number
  totalRevenue: number
}

interface Props {
  userId: string
  impersonating?: boolean
  onStopImpersonation?: () => void
}

type PageType = 'overview' | 'officers' | 'stalls'

export function MarketDashboard({ userId, impersonating = false, onStopImpersonation }: Props) {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<PageType>('overview')

  useEffect(() => {
    loadMarketStats()
  }, [userId])

  const loadMarketStats = async () => {
    try {
      // Get user's market
      const market = await getUserMarket(userId)
      if (!market) {
        console.error('No market assigned')
        setLoading(false)
        return
      }

      // Count stalls in this market
      const { count: stallCount } = await supabase
        .from('stalls')
        .select('*', { count: 'exact' })
        .eq('market_id', market.id)

      // Count officers in this market
      const { count: officerCount } = await supabase
        .from('officers')
        .select('*', { count: 'exact' })
        .eq('market_id', market.id)

      // Get transactions for stalls in this market
      const { data: stallsData } = await supabase
        .from('stalls')
        .select('id')
        .eq('market_id', market.id)

      const stallIds = stallsData?.map(s => s.id) || []

      let transactionCount = 0
      let totalRevenue = 0

      if (stallIds.length > 0) {
        const { count, data: transactionData } = await supabase
          .from('transactions')
          .select('amount_paid', { count: 'exact' })
          .in('stall_id', stallIds)

        transactionCount = count || 0
        totalRevenue = (transactionData || []).reduce(
          (sum, t: any) => sum + (parseFloat(t.amount_paid) || 0),
          0
        )
      }

      setStats({
        market,
        stallCount: stallCount || 0,
        officerCount: officerCount || 0,
        transactionCount,
        totalRevenue
      })
    } catch (err) {
      console.error('Error loading market stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Memuat data pasar...</div>
  }

  if (!stats) {
    return (
      <div className="error-message">
        <h2>❌ Tidak Ada Pasar</h2>
        <p>Anda belum di-assign ke pasar manapun.</p>
      </div>
    )
  }

  const { market, stallCount, officerCount, transactionCount, totalRevenue } = stats

  // Render pages based on currentPage
  if (currentPage === 'officers' && stats) {
    return (
      <div>
        <button onClick={() => setCurrentPage('overview')} className="back-button">
          ← Kembali ke Overview
        </button>
        <OfficersPage marketId={stats.market.id} />
      </div>
    )
  }

  if (currentPage === 'stalls' && stats) {
    return (
      <div>
        <button onClick={() => setCurrentPage('overview')} className="back-button">
          ← Kembali ke Overview
        </button>
        <StallsPage marketId={stats.market.id} />
      </div>
    )
  }

  return (
    <div className="market-dashboard">
      {impersonating && (
        <div className="impersonation-banner">
          <span>🔐 Sedang impersonate sebagai Admin Pasar</span>
          {onStopImpersonation && (
            <button onClick={onStopImpersonation} className="btn-stop-impersonation">
              Kembali ke Superadmin
            </button>
          )}
        </div>
      )}
      <div className="market-header">
        <div>
          <h2>📍 {market.name}</h2>
          <p>{market.address}, {market.city}</p>
          <p className="market-code">Kode: <strong>{market.code}</strong></p>
        </div>
        <div className="market-status">
          <span className={`status-badge status-${market.status.toLowerCase()}`}>
            {market.status}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏪</div>
          <div className="stat-content">
            <div className="stat-label">Total Lapak</div>
            <div className="stat-value">{stallCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👮</div>
          <div className="stat-content">
            <div className="stat-label">Petugas</div>
            <div className="stat-value">{officerCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Transaksi</div>
            <div className="stat-value">{transactionCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">Rp {totalRevenue.toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>📌 Aksi Cepat</h3>
        <div className="quick-actions">
          <button onClick={() => setCurrentPage('stalls')} className="action-card">
            <span className="icon">🏪</span>
            <span className="label">Manajemen Lapak</span>
          </button>
          <button onClick={() => setCurrentPage('officers')} className="action-card">
            <span className="icon">👮</span>
            <span className="label">Manajemen Petugas</span>
          </button>
          <a href="#transaksi" className="action-card">
            <span className="icon">💰</span>
            <span className="label">Transaksi</span>
          </a>
          <a href="#laporan" className="action-card">
            <span className="icon">📊</span>
            <span className="label">Laporan</span>
          </a>
        </div>
      </div>
    </div>
  )
}
