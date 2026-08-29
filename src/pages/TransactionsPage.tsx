import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { DateRangePicker } from '../components/DateRangePicker'
import { Loading } from '../components/Loading'
import { EmptyState } from '../components/EmptyState'
import './TransactionsPage.css'

interface TransactionsPageProps {
  marketId?: number | string
}

interface Transaction {
  id: number
  stall_id: number
  amount: number
  payment_method: string
  status: string
  payer_name?: string
  note?: string
  created_at: string
  stalls?: {
    code: string
    number: string
  }
}

interface Stall {
  id: number
  code: string
  number: string
}

export function TransactionsPage({ marketId }: TransactionsPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stalls, setStalls] = useState<Stall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stallFilter, setStallFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const marketIdNum = Number(marketId) || 0

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()

      // Load stalls for filter dropdown
      const { data: stallsData } = await supabase
        .from('stalls')
        .select('id, code, number')
        .eq('market_id', marketIdNum)
        .order('number')

      setStalls(stallsData || [])

      // Build query
      let query = supabase
        .from('transactions')
        .select('*, stalls(code, number)')

      // Filter by stall_id if selected
      if (stallFilter) {
        query = query.eq('stall_id', parseInt(stallFilter))
      }

      // Filter by status
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      // Filter by date range
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`)
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`)
      }

      // Join through stalls to filter by market_id
      const { data: marketStalls } = await supabase
        .from('stalls')
        .select('id')
        .eq('market_id', marketIdNum)

      const stallIds = (marketStalls || []).map(s => s.id)

      if (stallIds.length === 0) {
        setTransactions([])
        setLoading(false)
        return
      }

      query = query.in('stall_id', stallIds)

      const { data, error: err } = await query
        .order('created_at', { ascending: false })
        .limit(100)

      if (err) throw err
      setTransactions(data || [])
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data transaksi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (marketIdNum > 0) {
      loadData()
    }
  }, [marketIdNum, stallFilter, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    setCurrentPage(1)
  }, [stallFilter, statusFilter, dateFrom, dateTo, marketIdNum])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedTransactions = transactions.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize)

  if (!marketId || marketIdNum === 0) {
    return (
      <div className="page-card">
        <h2>🧾 Transaksi</h2>
        <p style={{ color: '#b91c1c' }}>Pilih pasar terlebih dahulu untuk melihat transaksi.</p>
      </div>
    )
  }

  return (
    <div className="page-card">
      <h2>🧾 Transaksi</h2>
      <p>Daftar transaksi yang tercatat di pasar ini.</p>

      <div className="tx-summary-box">
        <strong>Total Transaksi:</strong> {transactions.length} | <strong>Total Pendapatan:</strong> Rp {totalAmount.toLocaleString('id-ID')}
      </div>

      {error && <div className="tx-error-box">{error}</div>}

      {/* Filter Section */}
      <div className="tx-filter-section">
        <div className="tx-filter-group">
          <label>Lapak</label>
          <select
            value={stallFilter}
            onChange={(e) => setStallFilter(e.target.value)}
            className="tx-filter-select"
          >
            <option value="">Semua Lapak</option>
            {stalls.map((s) => (
              <option key={s.id} value={s.id}>{s.code || s.number}</option>
            ))}
          </select>
        </div>

        <div className="tx-filter-group">
          <label>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="tx-filter-select"
          >
            <option value="">Semua Status</option>
            <option value="LUNAS">LUNAS</option>
            <option value="PENDING">PENDING</option>
            <option value="BATAL">BATAL</option>
          </select>
        </div>

        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

        <button onClick={() => { setStallFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }} className="btn-secondary tx-reset-btn">
          Reset Filter
        </button>
      </div>

      {/* Transaction Table */}
      <div className="tx-table-wrap">
        {loading ? (
          <Loading label="Memuat data transaksi..." fullHeight={false} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Belum ada transaksi"
            subtitle="Transaksi yang dicatat petugas di pasar ini akan muncul di sini."
          />
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>Lapak</th>
                <th>Pembayar</th>
                <th className="tx-amount">Jumlah</th>
                <th>Metode</th>
                <th>Status</th>
                <th className="tx-note">Catatan</th>
                <th className="tx-date">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((t) => {
                const statusCls = t.status === 'LUNAS' ? 'tx-status-lunas' : t.status === 'BATAL' ? 'tx-status-batal' : 'tx-status-pending'
                return (
                  <tr key={t.id}>
                    <td>{t.stalls?.code || t.stalls?.number || `ID #${t.stall_id}`}</td>
                    <td>{t.payer_name || '-'}</td>
                    <td className="tx-amount">Rp {Number(t.amount || 0).toLocaleString('id-ID')}</td>
                    <td>{t.payment_method || '-'}</td>
                    <td><span className={`tx-status-badge ${statusCls}`}>{t.status || '-'}</span></td>
                    <td className="tx-note">{t.note || '-'}</td>
                    <td className="tx-date">{formatDate(t.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {transactions.length > pageSize && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, color: '#475569' }}>
            Menampilkan {Math.min((safeCurrentPage - 1) * pageSize + 1, transactions.length)}-{Math.min(safeCurrentPage * pageSize, transactions.length)} dari {transactions.length} data
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage === 1 ? 0.5 : 1,
              transition: 'all 0.2s',
              fontSize: '0.9rem'
            }}>
              ← Sebelumnya
            </button>
            <span style={{ fontSize: 14, color: '#475569', minWidth: 90, textAlign: 'center', fontWeight: 600 }}>
              Halaman {safeCurrentPage}/{totalPages}
            </span>
            <button type="button" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage === totalPages ? 0.5 : 1,
              transition: 'all 0.2s',
              fontSize: '0.9rem'
            }}>
              Selanjutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}