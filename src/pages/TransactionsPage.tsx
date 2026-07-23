import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { DateRangePicker } from '../components/DateRangePicker'

interface TransactionsPageProps {
  marketId?: number | string
}

interface Transaction {
  id: number
  stall_id: number
  amount_paid: number
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount_paid || 0), 0)

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

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <strong>Total Transaksi:</strong> {transactions.length} | <strong>Total Pendapatan:</strong> Rp {totalAmount.toLocaleString('id-ID')}
      </div>

      {error && <div style={{ marginTop: 12, color: '#b91c1c', padding: 8, background: '#fee', borderRadius: 6 }}>{error}</div>}

      {/* Filter Section */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#555' }}>Lapak</label>
          <select
            value={stallFilter}
            onChange={(e) => setStallFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            <option value="">Semua Lapak</option>
            {stalls.map((s) => (
              <option key={s.id} value={s.id}>{s.code || s.number}</option>
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

        <button onClick={() => { setStallFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }} className="btn-secondary" style={{ padding: '6px 16px' }}>
          Reset Filter
        </button>
      </div>

      {/* Transaction Table */}
      <div style={{ marginTop: 20, overflowX: 'auto' }}>
        {loading ? (
          <p>Memuat data transaksi...</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#6b7280', padding: '20px 0' }}>Belum ada transaksi untuk pasar ini.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #2D5016' }}>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Lapak</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Pembayar</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right' }}>Jumlah</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Metode</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Catatan</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>
                    {t.stalls?.code || t.stalls?.number || `ID #${t.stall_id}`}
                  </td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{t.payer_name || '-'}</td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>
                    Rp {Number(t.amount_paid || 0).toLocaleString('id-ID')}
                  </td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{t.payment_method || '-'}</td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 4,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background: t.status === 'LUNAS' ? '#C8E6C9' : t.status === 'BATAL' ? '#FFCCBC' : '#FFF9C4',
                      color: t.status === 'LUNAS' ? '#2D5016' : t.status === 'BATAL' ? '#D84315' : '#F57F17'
                    }}>
                      {t.status || '-'}
                    </span>
                  </td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.note || '-'}
                  </td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#6b7280' }}>
                    {formatDate(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}