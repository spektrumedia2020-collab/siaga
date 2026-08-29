import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { DateRangePicker } from '../components/DateRangePicker'

interface SetoranPageProps {
  marketId?: number | string
}

interface Setoran {
  id: string
  officer_id: string
  market_id: number
  total_amount: number
  transaction_count: number
  note: string | null
  proof_image_url: string | null
  status: string
  rejection_reason: string | null
  approved_by_treasurer: string | null
  approved_by_head: string | null
  approved_at_treasurer: string | null
  approved_at_head: string | null
  created_at: string
  updated_at: string
}

interface OfficerSummary {
  officer_id: string
  officer_name: string
  total_setoran: number
  total_collected: number
  transaction_count: number
  pending_count: number
  approved_count: number
  rejected_count: number
}

export function SetoranPage({ marketId }: SetoranPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [officerSummaries, setOfficerSummaries] = useState<OfficerSummary[]>([])
  const [officerNameMap, setOfficerNameMap] = useState<Map<string, string>>(new Map())
  const [setorans, setSetorans] = useState<Setoran[]>([])
  const [selectedOfficer, setSelectedOfficer] = useState<string>('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary')
  const [summaryPage, setSummaryPage] = useState(1)
  const [detailPage, setDetailPage] = useState(1)
  const pageSize = 8

  const marketIdNum = Number(marketId) || 0

  useEffect(() => {
    if (marketIdNum > 0) {
      loadData()
    }
  }, [marketIdNum])

  useEffect(() => {
    setSummaryPage(1)
    setDetailPage(1)
  }, [selectedOfficer, statusFilter, dateFrom, dateTo, marketIdNum, viewMode])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const supabase = getSupabaseClient()

      // Get all users in this market
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('market_id', marketIdNum)
        .order('nama')

      if (usersError) throw usersError

      // Get roles for mapping
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name')

      const roleMap = new Map((rolesData || []).map((r: any) => [r.id, r.name]))

      // Build a map from auth_uid to nama for display
      const nameMap = new Map((usersData || []).map((u: any) => [String(u.auth_uid), u.nama || u.email || 'Unknown']))
      setOfficerNameMap(nameMap)

      // Build summaries from users with OFFICER role
      const { data: setoranData, error: setoranErr } = await supabase
        .from('setoran')
        .select('*')
        .eq('market_id', marketIdNum)
        .order('created_at', { ascending: false })

      if (setoranErr) throw setoranErr
      setSetorans(setoranData || [])

      const officerUsers = (usersData || []).filter((u: any) => {
        const roleName = roleMap.get(u.id_role) || ''
        return roleName === 'OFFICER'
      })

      // Build officer summaries
      const summaries: OfficerSummary[] = officerUsers.map((user: any) => {
        const officerSetoran = (setoranData || []).filter(s => String(s.officer_id) === String(user.id_user))
        const totalSetoran = officerSetoran.reduce((sum, s) => sum + Number(s.total_amount), 0)
        const pendingCount = officerSetoran.filter(s => s.status === 'pending_treasurer' || s.status === 'pending_head').length
        const approvedCount = officerSetoran.filter(s => s.status === 'approved').length
        const rejectedCount = officerSetoran.filter(s => s.status === 'rejected').length

        return {
          officer_id: String(user.auth_uid),
          officer_name: user.nama || user.email || 'Unknown',
          total_setoran: totalSetoran,
          total_collected: 0,
          transaction_count: 0,
          pending_count: pendingCount,
          approved_count: approvedCount,
          rejected_count: rejectedCount
        }
      })

      setOfficerSummaries(summaries)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data setoran')
    } finally {
      setLoading(false)
    }
  }

  // Filter setoran based on criteria
  const filteredSetoran = setorans.filter(s => {
    if (selectedOfficer && s.officer_id !== selectedOfficer) return false
    if (statusFilter && s.status !== statusFilter) return false
    if (dateFrom && s.created_at < `${dateFrom}T00:00:00`) return false
    if (dateTo && s.created_at > `${dateTo}T23:59:59`) return false
    return true
  })

  const summaryTotalPages = Math.max(1, Math.ceil(officerSummaries.length / pageSize))
  const detailTotalPages = Math.max(1, Math.ceil(filteredSetoran.length / pageSize))
  const safeSummaryPage = Math.min(summaryPage, summaryTotalPages)
  const safeDetailPage = Math.min(detailPage, detailTotalPages)
  const paginatedSummary = officerSummaries.slice((safeSummaryPage - 1) * pageSize, safeSummaryPage * pageSize)
  const paginatedDetail = filteredSetoran.slice((safeDetailPage - 1) * pageSize, safeDetailPage * pageSize)

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_treasurer: 'Menunggu Bendahara',
      pending_head: 'Menunggu Kepala Pasar',
      approved: 'Disetujui',
      rejected: 'Ditolak'
    }
    return labels[status] || status
  }

  const statusColor = (status: string) => {
    if (status === 'approved') return { bg: '#C8E6C9', color: '#2D5016' }
    if (status === 'rejected') return { bg: '#FFCCBC', color: '#D84315' }
    return { bg: '#FFF9C4', color: '#F57F17' }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOfficerName = (officerId: string) => {
    const officer = officerSummaries.find(o => o.officer_id === officerId)
    return officer?.officer_name || officerNameMap.get(officerId) || officerId
  }

  if (!marketId || marketIdNum === 0) {
    return (
      <div className="page-card">
        <h2>📤 Setoran</h2>
        <p style={{ color: '#b91c1c' }}>Pilih pasar terlebih dahulu.</p>
      </div>
    )
  }

  return (
    <div className="page-card">
      <h2>📤 Setoran Petugas</h2>
      <p>Monitoring setoran yang dilakukan oleh petugas ke bendahara/kepala pasar.</p>

      {/* Tab switches */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setViewMode('summary')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            background: viewMode === 'summary' ? '#2D5016' : '#e0e0e0',
            color: viewMode === 'summary' ? '#FFD700' : '#333'
          }}
        >
          Ringkasan Petugas
        </button>
        <button
          onClick={() => setViewMode('detail')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            background: viewMode === 'detail' ? '#2D5016' : '#e0e0e0',
            color: viewMode === 'detail' ? '#FFD700' : '#333'
          }}
        >
          Detail Setoran
        </button>
      </div>

      {error && <div style={{ marginTop: 12, color: '#b91c1c', padding: 8, background: '#fee', borderRadius: 6 }}>{error}</div>}

      {/* Filters */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        {viewMode === 'detail' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#555' }}>Petugas</label>
              <select
                value={selectedOfficer}
                onChange={(e) => setSelectedOfficer(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 180 }}
              >
                <option value="">Semua Petugas</option>
                {officerSummaries.map((o) => (
                  <option key={o.officer_id} value={o.officer_id}>{o.officer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#555' }}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
              >
                <option value="">Semua Status</option>
                <option value="pending_treasurer">Menunggu Bendahara</option>
                <option value="pending_head">Menunggu Kepala Pasar</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </>
        )}
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <button onClick={loadData} className="btn-secondary" style={{ padding: '6px 16px' }}>
          ↻ Muat Ulang
        </button>
      </div>

      <div style={{ marginTop: 20, overflowX: 'auto' }}>
        {loading ? (
          <p>Memuat data setoran...</p>
        ) : viewMode === 'summary' ? (
          /* Summary View */
          officerSummaries.length === 0 ? (
            <p style={{ color: '#6b7280', padding: '20px 0' }}>Belum ada petugas terdaftar di pasar ini.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #2D5016' }}>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Petugas</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right' }}>Total Setoran (Rp)</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>Menunggu</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>Disetujui</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>Ditolak</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSummary.map((o) => (
                  <tr key={o.officer_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', fontWeight: 600 }}>{o.officer_name}</td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>
                      Rp {o.total_setoran.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <span style={{ color: '#F57F17', fontWeight: 600 }}>{o.pending_count}</span>
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <span style={{ color: '#2D5016', fontWeight: 600 }}>{o.approved_count}</span>
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <span style={{ color: '#D84315', fontWeight: 600 }}>{o.rejected_count}</span>
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <button
                        onClick={() => { setSelectedOfficer(o.officer_id); setViewMode('detail') }}
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: 13 }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          /* Detail View */
          filteredSetoran.length === 0 ? (
            <p style={{ color: '#6b7280', padding: '20px 0' }}>Belum ada data setoran untuk filter ini.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #2D5016' }}>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Petugas</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right' }}>Jumlah (Rp)</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>Transaksi</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Catatan</th>
                  <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDetail.map((s) => {
                  const sc = statusColor(s.status)
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 10, border: '1px solid #e5e7eb', fontWeight: 600 }}>
                        {getOfficerName(s.officer_id)}
                      </td>
                      <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>
                        Rp {Number(s.total_amount).toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {s.transaction_count}
                      </td>
                      <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 4,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: sc.bg,
                          color: sc.color
                        }}>
                          {statusLabel(s.status)}
                        </span>
                        {s.status === 'rejected' && s.rejection_reason && (
                          <div style={{ fontSize: 12, color: '#D84315', marginTop: 4 }}>
                            {s.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 10, border: '1px solid #e5e7eb', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.note || '-'}
                      </td>
                      <td style={{ padding: 10, border: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#6b7280' }}>
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        )}
      </div>

      {viewMode === 'summary' && officerSummaries.length > pageSize && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, color: '#475569' }}>
            Menampilkan {Math.min((safeSummaryPage - 1) * pageSize + 1, officerSummaries.length)}-{Math.min(safeSummaryPage * pageSize, officerSummaries.length)} dari {officerSummaries.length} petugas
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" disabled={safeSummaryPage === 1} onClick={() => setSummaryPage((page) => Math.max(1, page - 1))} style={{ opacity: safeSummaryPage === 1 ? 0.5 : 1 }}>
              Sebelumnya
            </button>
            <span style={{ fontSize: 14, color: '#475569', minWidth: 90, textAlign: 'center' }}>
              Halaman {safeSummaryPage}/{summaryTotalPages}
            </span>
            <button type="button" className="btn-secondary" disabled={safeSummaryPage === summaryTotalPages} onClick={() => setSummaryPage((page) => Math.min(summaryTotalPages, page + 1))} style={{ opacity: safeSummaryPage === summaryTotalPages ? 0.5 : 1 }}>
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {viewMode === 'detail' && filteredSetoran.length > pageSize && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, color: '#475569' }}>
            Menampilkan {Math.min((safeDetailPage - 1) * pageSize + 1, filteredSetoran.length)}-{Math.min(safeDetailPage * pageSize, filteredSetoran.length)} dari {filteredSetoran.length} data
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" disabled={safeDetailPage === 1} onClick={() => setDetailPage((page) => Math.max(1, page - 1))} style={{ opacity: safeDetailPage === 1 ? 0.5 : 1 }}>
              Sebelumnya
            </button>
            <span style={{ fontSize: 14, color: '#475569', minWidth: 90, textAlign: 'center' }}>
              Halaman {safeDetailPage}/{detailTotalPages}
            </span>
            <button type="button" className="btn-secondary" disabled={safeDetailPage === detailTotalPages} onClick={() => setDetailPage((page) => Math.min(detailTotalPages, page + 1))} style={{ opacity: safeDetailPage === detailTotalPages ? 0.5 : 1 }}>
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}