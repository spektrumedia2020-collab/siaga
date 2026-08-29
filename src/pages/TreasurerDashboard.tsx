import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import './TreasurerDashboard.css'

interface Setoran {
  id: string
  officer_id: string
  officer_name?: string
  market_id: number
  total_amount: number
  transaction_count: number
  note: string | null
  proof_image_url: string | null
  status: string
  rejection_reason: string | null
  approved_by_treasurer: string | null
  created_at: string
  updated_at: string
}

interface TreasurerStats {
  pending_count: number
  pending_amount: number
  approved_count: number
  approved_amount: number
  rejected_count: number
  total_collected: number
  discrepancy_count: number
}

interface OfficerPerformance {
  officer_name: string
  total_submitted: number
  approved: number
  pending: number
  rejected: number
  approval_rate: number
}

interface DailyRevenue {
  date: string
  amount: number
  transaction_count: number
}

interface Discrepancy {
  stall_code: string
  stall_number: string
  sector_name: string
  owner_name: string
  expected: number
  actual: number
  difference: number
}

interface TreasurerDashboardProps {
  marketId?: number | string
}

export function TreasurerDashboard({ marketId }: TreasurerDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<TreasurerStats | null>(null)
  const [setorans, setSetorans] = useState<Setoran[]>([])
  const [officerPerformance, setOfficerPerformance] = useState<OfficerPerformance[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([])
  const [approvalNote, setApprovalNote] = useState('')
  const [approving, setApproving] = useState('')
  const [rejectingId, setRejectingId] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'performance' | 'discrepancies'>('overview')

  const marketIdNum = Number(marketId) || 0

  useEffect(() => {
    if (marketIdNum > 0) {
      loadData()
    }
  }, [marketIdNum, dateFrom, dateTo])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const supabase = getSupabaseClient()

      // 1. Get all setorans for this market
      const { data: setoranData, error: setoranErr } = await supabase
        .from('setoran')
        .select('*')
        .eq('market_id', marketIdNum)
        .order('created_at', { ascending: false })

      if (setoranErr) throw setoranErr

      // 2. Get user names for officers
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('id_user, auth_uid, nama, email')
        .eq('market_id', marketIdNum)

      if (usersErr) throw usersErr

      const userMap = new Map((usersData || []).map((u: any) => [String(u.auth_uid), u.nama || u.email || 'Unknown']))
      
      // Enrich setoran data with officer names
      const enrichedSetorans = (setoranData || []).map(s => ({
        ...s,
        officer_name: userMap.get(String(s.officer_id)) || 'Unknown Officer'
      }))

      setSetorans(enrichedSetorans)

      // 3. Calculate stats
      const pendingSetorans = enrichedSetorans.filter(s => s.status === 'pending_treasurer' || s.status === 'pending_head')
      const approvedSetorans = enrichedSetorans.filter(s => s.status === 'approved')
      const rejectedSetorans = enrichedSetorans.filter(s => s.status === 'rejected')

      const pendingAmount = pendingSetorans.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
      const approvedAmount = approvedSetorans.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

      // 4. Get transactions for total collected
      const { data: transactionsData, error: txErr } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('market_id', marketIdNum)
        .eq('status', 'paid')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)

      if (txErr) throw txErr

      const totalCollected = (transactionsData || []).reduce((sum, t) => sum + Number(t.amount || 0), 0)

      // 5. Get reconciliation data (discrepancies)
      const { data: stallsData, error: stallsErr } = await supabase
        .from('stalls')
        .select('id, code, number, sector_id, owner_id')
        .eq('market_id', marketIdNum)

      if (stallsErr) throw stallsErr

      const { data: sectorsData } = await supabase
        .from('market_sectors')
        .select('id, name')
        .eq('market_id', marketIdNum)

      const { data: ownersData } = await supabase
        .from('stall_owners')
        .select('id, name')

      const { data: ratesData } = await supabase
        .from('retribution_rates')
        .select('stall_id, amount')
        .in('stall_id', (stallsData || []).map(s => s.id))

      const sectorMap = new Map((sectorsData || []).map(s => [s.id, s.name]))
      const ownerMap = new Map((ownersData || []).map(o => [o.id, o.name]))
      const ratesByStall: Record<number, number> = {}

      for (const rate of ratesData || []) {
        ratesByStall[rate.stall_id] = (ratesByStall[rate.stall_id] || 0) + Number(rate.amount)
      }

      // Group transactions by stall and date
      const actualByStall: Record<number, { total: number; count: number }> = {}
      for (const t of transactionsData || []) {
        if (!actualByStall[t.stall_id]) {
          actualByStall[t.stall_id] = { total: 0, count: 0 }
        }
        actualByStall[t.stall_id].total += Number(t.amount || 0)
        actualByStall[t.stall_id].count += 1
      }

      const discrepancyList: Discrepancy[] = []
      for (const stall of stallsData || []) {
        const expected = ratesByStall[stall.id] || 0
        const actualData = actualByStall[stall.id]
        const actual = actualData?.total || 0
        const diff = Math.abs(expected - actual)

        if (diff > 0) {
          discrepancyList.push({
            stall_code: stall.code || '',
            stall_number: stall.number || '',
            sector_name: sectorMap.get(stall.sector_id) || '-',
            owner_name: ownerMap.get(stall.owner_id) || '-',
            expected,
            actual,
            difference: diff
          })
        }
      }

      setDiscrepancies(discrepancyList)

      // 6. Calculate officer performance
      const performanceMap = new Map<string, OfficerPerformance>()
      for (const setoran of enrichedSetorans) {
        const key = setoran.officer_name
        if (!performanceMap.has(key)) {
          performanceMap.set(key, {
            officer_name: key,
            total_submitted: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            approval_rate: 0
          })
        }
        const perf = performanceMap.get(key)!
        perf.total_submitted += 1
        if (setoran.status === 'approved') perf.approved += 1
        else if (setoran.status === 'pending_treasurer' || setoran.status === 'pending_head') perf.pending += 1
        else if (setoran.status === 'rejected') perf.rejected += 1
        perf.approval_rate = perf.total_submitted > 0 ? (perf.approved / perf.total_submitted) * 100 : 0
      }

      setOfficerPerformance(Array.from(performanceMap.values()).sort((a, b) => b.approval_rate - a.approval_rate))

      // 7. Build daily revenue chart
      const revenueByDay: Record<string, { amount: number; count: number }> = {}
      for (const t of transactionsData || []) {
        const date = new Date(t.created_at).toISOString().split('T')[0]
        if (!revenueByDay[date]) revenueByDay[date] = { amount: 0, count: 0 }
        revenueByDay[date].amount += Number(t.amount || 0)
        revenueByDay[date].count += 1
      }

      const revenue = Object.entries(revenueByDay)
        .map(([date, data]) => ({
          date,
          amount: data.amount,
          transaction_count: data.count
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setDailyRevenue(revenue)

      setStats({
        pending_count: pendingSetorans.length,
        pending_amount: pendingAmount,
        approved_count: approvedSetorans.length,
        approved_amount: approvedAmount,
        rejected_count: rejectedSetorans.length,
        total_collected: totalCollected,
        discrepancy_count: discrepancyList.length
      })
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data bendahara')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const approveSetoran = async (setoranId: string) => {
    try {
      setApproving(setoranId)
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('setoran')
        .update({ status: 'pending_head', approved_by_treasurer: 'approved', approved_at_treasurer: new Date().toISOString() })
        .eq('id', setoranId)

      if (error) throw error
      await loadData()
      setApprovalNote('')
    } catch (err: any) {
      setError(err.message || 'Gagal approve setoran')
    } finally {
      setApproving('')
    }
  }

  const rejectSetoran = async (setoranId: string) => {
    if (!rejectionReason.trim()) {
      setError('Alasan penolakan diperlukan')
      return
    }

    try {
      setRejectingId(setoranId)
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('setoran')
        .update({ status: 'rejected', rejection_reason: rejectionReason })
        .eq('id', setoranId)

      if (error) throw error
      await loadData()
      setRejectionReason('')
    } catch (err: any) {
      setError(err.message || 'Gagal reject setoran')
    } finally {
      setRejectingId('')
    }
  }

  if (loading) {
    return <div className="treasurer-page"><div className="treasurer-loader">Memuat data bendahara...</div></div>
  }

  const pendingSetoran = setorans.filter(s => s.status === 'pending_treasurer' || s.status === 'pending_head').slice(0, 5)
  const treasuryBalance = (stats?.total_collected || 0) - (stats?.pending_amount || 0)
  const approvalRate = (stats && (stats.pending_count + stats.approved_count + stats.rejected_count) > 0)
    ? ((stats.approved_count / (stats.pending_count + stats.approved_count + stats.rejected_count)) * 100)
    : 0

  return (
    <div className="treasurer-page">
      <header className="treasurer-header">
        <div className="treasurer-badge">Premium treasury access</div>
        <h1>Dashboard Bendahara</h1>
        <p>Kelola approval setoran, monitoring kinerja, dan rekonsiliasi keuangan pasar secara real-time.</p>
      </header>

      <section className="treasurer-hero-strip">
        <div className="treasurer-hero-card emphasis">
          <span className="kicker">Saldo kas pasar</span>
          <strong>Rp {(treasuryBalance / 1000000).toFixed(1)}M</strong>
          <small>Setelah menunggu approval</small>
        </div>
        <div className="treasurer-hero-card">
          <span className="kicker">Approval rate</span>
          <strong>{approvalRate.toFixed(1)}%</strong>
          <small>Efisiensi validasi bendahara</small>
        </div>
        <div className="treasurer-hero-card">
          <span className="kicker">Outstanding</span>
          <strong>{stats?.pending_count || 0}</strong>
          <small>Setoran menunggu konfirmasi</small>
        </div>
        <div className="treasurer-hero-card">
          <span className="kicker">Rekonsiliasi</span>
          <strong>{stats?.discrepancy_count || 0}</strong>
          <small>Item perlu perhatian</small>
        </div>
      </section>

      {error && <div className="treasurer-error">{error}</div>}

      {/* TAB NAVIGATION */}
      <div className="treasurer-tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
          📊 Overview
        </button>
        <button className={activeTab === 'approvals' ? 'active' : ''} onClick={() => setActiveTab('approvals')}>
          ✓ Persetujuan ({stats?.pending_count || 0})
        </button>
        <button className={activeTab === 'performance' ? 'active' : ''} onClick={() => setActiveTab('performance')}>
          ⭐ Kinerja
        </button>
        <button className={activeTab === 'discrepancies' ? 'active' : ''} onClick={() => setActiveTab('discrepancies')}>
          ⚠️ Perbedaan ({stats?.discrepancy_count || 0})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="treasurer-content">
          {/* STATS CARDS */}
          <div className="treasurer-stats-grid">
            <div className="treasurer-stat-card pending">
              <span className="stat-icon">⏳</span>
              <div className="stat-content">
                <p className="stat-label">Menunggu Approval</p>
                <strong>{stats?.pending_count || 0}</strong>
                <span className="stat-amount">Rp {((stats?.pending_amount || 0) / 1000000).toFixed(1)}M</span>
              </div>
            </div>

            <div className="treasurer-stat-card approved">
              <span className="stat-icon">✓</span>
              <div className="stat-content">
                <p className="stat-label">Disetujui</p>
                <strong>{stats?.approved_count || 0}</strong>
                <span className="stat-amount">Rp {((stats?.approved_amount || 0) / 1000000).toFixed(1)}M</span>
              </div>
            </div>

            <div className="treasurer-stat-card rejected">
              <span className="stat-icon">✗</span>
              <div className="stat-content">
                <p className="stat-label">Ditolak</p>
                <strong>{stats?.rejected_count || 0}</strong>
              </div>
            </div>

            <div className="treasurer-stat-card collected">
              <span className="stat-icon">💰</span>
              <div className="stat-content">
                <p className="stat-label">Total Terkumpul</p>
                <strong>Rp {((stats?.total_collected || 0) / 1000000).toFixed(1)}M</strong>
                <span className="stat-period">{dateFrom} - {dateTo}</span>
              </div>
            </div>
          </div>

          {/* FINANCIAL SUMMARY CHART */}
          <div className="treasurer-chart-section">
            <h2>Pendapatan Harian</h2>
            <div className="treasurer-chart">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `Rp ${(value / 1000000).toFixed(1)}M`} />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="#2563eb" name="Pendapatan" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RECENT PENDING SETORAN */}
          <div className="treasurer-recent-section">
            <h2>Setoran Terbaru Menunggu Persetujuan</h2>
            {pendingSetoran.length === 0 ? (
              <p className="treasurer-empty">Tidak ada setoran menunggu persetujuan</p>
            ) : (
              <div className="treasurer-list">
                {pendingSetoran.map(s => (
                  <div key={s.id} className="treasurer-list-row">
                    <div className="list-info">
                      <strong>{s.officer_name}</strong>
                      <span className="list-detail">Rp {(s.total_amount / 1000000).toFixed(1)}M • {s.transaction_count} transaksi</span>
                      <span className="list-date">{new Date(s.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    <button className="btn-small btn-approve" onClick={() => approveSetoran(s.id)}>
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="treasurer-content">
          <div className="treasurer-filter-bar">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="Dari tanggal"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="Sampai tanggal"
            />
            <button onClick={loadData} className="btn-primary">Muat Ulang</button>
          </div>

          <div className="treasurer-approval-list">
            {setorans.length === 0 ? (
              <p className="treasurer-empty">Tidak ada data setoran</p>
            ) : (
              setorans.map(setoran => (
                <div key={setoran.id} className={`approval-card status-${setoran.status}`}>
                  <div className="approval-header">
                    <div>
                      <h3>{setoran.officer_name}</h3>
                      <span className={`status-badge status-${setoran.status}`}>
                        {setoran.status === 'pending_treasurer' ? 'Menunggu Bendahara' : 
                         setoran.status === 'pending_head' ? 'Menunggu Kepala' :
                         setoran.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    </div>
                    <div className="approval-amount">
                      <strong>Rp {(setoran.total_amount / 1000000).toFixed(1)}M</strong>
                      <span>{setoran.transaction_count} transaksi</span>
                    </div>
                  </div>

                  {setoran.proof_image_url && (
                    <div className="approval-proof">
                      <a href={setoran.proof_image_url} target="_blank" rel="noopener noreferrer">
                        📎 Lihat bukti pembayaran
                      </a>
                    </div>
                  )}

                  {setoran.note && (
                    <p className="approval-note">📝 {setoran.note}</p>
                  )}

                  {(setoran.status === 'pending_treasurer' || setoran.status === 'pending_head') && (
                    <div className="approval-actions">
                      <button
                        className="btn-approve"
                        onClick={() => approveSetoran(setoran.id)}
                        disabled={approving === setoran.id}
                      >
                        {approving === setoran.id ? 'Menyetujui...' : '✓ Setujui'}
                      </button>
                      {rejectingId === setoran.id && (
                        <div className="rejection-form">
                          <input
                            type="text"
                            placeholder="Alasan penolakan"
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                          />
                          <button
                            className="btn-reject"
                            onClick={() => rejectSetoran(setoran.id)}
                          >
                            Konfirmasi Tolak
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => { setRejectingId(''); setRejectionReason(''); }}
                          >
                            Batal
                          </button>
                        </div>
                      )}
                      {rejectingId !== setoran.id && (
                        <button
                          className="btn-reject"
                          onClick={() => setRejectingId(setoran.id)}
                        >
                          ✗ Tolak
                        </button>
                      )}
                    </div>
                  )}

                  {setoran.status === 'rejected' && setoran.rejection_reason && (
                    <p className="rejection-reason">Alasan: {setoran.rejection_reason}</p>
                  )}

                  <span className="approval-date">{new Date(setoran.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OFFICER PERFORMANCE */}
      {activeTab === 'performance' && (
        <div className="treasurer-content">
          <div className="treasurer-chart-section">
            <h2>Performa Petugas (Approval Rate)</h2>
            <div className="treasurer-chart">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={officerPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="officer_name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="approval_rate" fill="#10b981" name="Approval Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="treasurer-performance-grid">
            {officerPerformance.map((perf, idx) => (
              <div key={idx} className="performance-card">
                <div className="perf-rank">#{idx + 1}</div>
                <h3>{perf.officer_name}</h3>
                <div className="perf-stat">
                  <span className="perf-label">Total Diajukan</span>
                  <strong>{perf.total_submitted}</strong>
                </div>
                <div className="perf-stat">
                  <span className="perf-label">Disetujui</span>
                  <strong style={{ color: '#10b981' }}>{perf.approved}</strong>
                </div>
                <div className="perf-stat">
                  <span className="perf-label">Menunggu</span>
                  <strong style={{ color: '#f59e0b' }}>{perf.pending}</strong>
                </div>
                <div className="perf-stat">
                  <span className="perf-label">Ditolak</span>
                  <strong style={{ color: '#ef4444' }}>{perf.rejected}</strong>
                </div>
                <div className="perf-rate">
                  <span>Approval Rate</span>
                  <strong>{perf.approval_rate.toFixed(1)}%</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DISCREPANCIES */}
      {activeTab === 'discrepancies' && (
        <div className="treasurer-content">
          <div className="treasurer-discrepancy-intro">
            <p>Menunjukkan perbedaan antara tarif yang ditetapkan dengan transaksi yang tercatat</p>
          </div>

          {discrepancies.length === 0 ? (
            <p className="treasurer-empty">Tidak ada perbedaan - semua data selaras!</p>
          ) : (
            <div className="treasurer-discrepancy-table">
              <table>
                <thead>
                  <tr>
                    <th>Kode Lapak</th>
                    <th>No. Lapak</th>
                    <th>Sektor</th>
                    <th>Pemilik</th>
                    <th>Tarif Diharapkan</th>
                    <th>Transaksi Aktual</th>
                    <th>Perbedaan</th>
                  </tr>
                </thead>
                <tbody>
                  {discrepancies.map((disc, idx) => (
                    <tr key={idx} className={disc.difference > 100000 ? 'high-discrepancy' : ''}>
                      <td><strong>{disc.stall_code}</strong></td>
                      <td>{disc.stall_number}</td>
                      <td>{disc.sector_name}</td>
                      <td>{disc.owner_name}</td>
                      <td>Rp {(disc.expected / 1000).toFixed(0)}K</td>
                      <td>Rp {(disc.actual / 1000).toFixed(0)}K</td>
                      <td className="discrepancy-amount">
                        <span className={disc.difference > 0 ? 'negative' : 'positive'}>
                          {disc.difference > 0 ? '+' : '-'}Rp {(disc.difference / 1000).toFixed(0)}K
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
