import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { DateRangePicker } from '../components/DateRangePicker'
import { Loading } from '../components/Loading'
import { EmptyState } from '../components/EmptyState'
import { ExportButtons } from '../components/ExportButtons'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { IconEdit, IconTrash } from '../components/Icons'
import './TransactionsPage.css'

interface TransactionsPageProps {
  marketId?: number | string
}

interface Transaction {
  id: number
  stall_id: number
  amount: number
  rate_id?: number | null
  payment_method: string
  status: string
  payer_name?: string
  note?: string
  created_at: string
  stalls?: {
    code: string
    number: string
  }
  retribution_rates?: {
    types_id: number
    retribution_types?: {
      name: string
    }
  }
}

interface Stall {
  id: number
  code: string
  number: string
}

const getTodayDate = () => new Date().toISOString().split('T')[0]

export function TransactionsPage({ marketId }: TransactionsPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stalls, setStalls] = useState<Stall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stallFilter, setStallFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(getTodayDate)
  const [dateTo, setDateTo] = useState(getTodayDate)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [editForm, setEditForm] = useState({ payer_name: '', amount: '', payment_method: 'Tunai', status: 'paid', note: '' })

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
        .select('*, stalls(code, number)', { count: 'exact' })

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
        setTotalTransactions(0)
        setLoading(false)
        return
      }

      const rangeStart = (currentPage - 1) * pageSize
      query = query
        .in('stall_id', stallIds)
        .range(rangeStart, rangeStart + pageSize - 1)

      const { data, count, error: err } = await query
        .order('created_at', { ascending: false })

      if (err) throw err
      const loadedTransactions = (data || []) as Transaction[]
      const rateIds = [...new Set(loadedTransactions.map((transaction) => transaction.rate_id).filter((rateId): rateId is number => rateId != null))]
      const ratesById = new Map<number, { types_id: number }>()
      const typesById = new Map<number, { name: string }>()

      if (rateIds.length > 0) {
        const { data: rateRows, error: ratesError } = await supabase
          .from('retribution_rates')
          .select('id, types_id')
          .in('id', rateIds)
        if (ratesError) throw ratesError
        for (const rate of rateRows || []) ratesById.set(rate.id, rate)

        const typeIds = [...new Set((rateRows || []).map((rate) => rate.types_id).filter((typeId): typeId is number => typeId != null))]
        if (typeIds.length > 0) {
          const { data: typeRows, error: typesError } = await supabase
            .from('retribution_types')
            .select('id, name')
            .in('id', typeIds)
          if (typesError) throw typesError
          for (const type of typeRows || []) typesById.set(type.id, type)
        }
      }

      setTransactions(loadedTransactions.map((transaction) => {
        const rate = transaction.rate_id == null ? undefined : ratesById.get(transaction.rate_id)
        const type = rate == null ? undefined : typesById.get(rate.types_id)
        return {
          ...transaction,
          retribution_rates: rate == null ? undefined : {
            types_id: rate.types_id,
            retribution_types: type
          }
        }
      }))
      setTotalTransactions(count || 0)
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
  }, [marketIdNum, stallFilter, statusFilter, dateFrom, dateTo, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [stallFilter, statusFilter, dateFrom, dateTo, marketIdNum, pageSize])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      payer_name: transaction.payer_name || '',
      amount: String(transaction.amount ?? ''),
      payment_method: transaction.payment_method || 'Tunai',
      status: transaction.status || 'paid',
      note: transaction.note || ''
    })
  }

  const saveEdit = async () => {
    if (!editingTransaction) return
    const amount = Number(editForm.amount)
    if (!editForm.payer_name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Nama pembayar dan jumlah transaksi wajib diisi dengan benar.')
      return
    }

    try {
      setActionLoading(true)
      setError('')
      const { error: updateError } = await getSupabaseClient()
        .from('transactions')
        .update({
          payer_name: editForm.payer_name.trim(),
          amount,
          payment_method: editForm.payment_method,
          status: editForm.status,
          note: editForm.note.trim()
        })
        .eq('id', editingTransaction.id)
      if (updateError) throw updateError
      setEditingTransaction(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah transaksi')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteTransaction = async () => {
    if (!deleteTarget) return
    try {
      setActionLoading(true)
      setError('')
      const { error: deleteError } = await getSupabaseClient()
        .from('transactions')
        .delete()
        .eq('id', deleteTarget.id)
      if (deleteError) throw deleteError
      setDeleteTarget(null)
      if (transactions.length === 1 && currentPage > 1) setCurrentPage((page) => page - 1)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus transaksi')
    } finally {
      setActionLoading(false)
    }
  }

  const pageAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalPages = Math.max(1, Math.ceil(totalTransactions / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedTransactions = transactions

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
        <strong>Total Transaksi:</strong> {totalTransactions} | <strong>Pendapatan Halaman:</strong> Rp {pageAmount.toLocaleString('id-ID')}
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

        <button onClick={() => { setStallFilter(''); setStatusFilter(''); setDateFrom(getTodayDate()); setDateTo(getTodayDate()) }} className="btn-secondary tx-reset-btn">
          Reset Filter
        </button>

        <ExportButtons
          data={paginatedTransactions.map(t => ({
            'Lapak': t.stalls?.code || t.stalls?.number || `ID #${t.stall_id}`,
            'Pembayar': t.payer_name || '-',
                        'Jenis Retribusi': t.retribution_rates?.retribution_types?.name || '-',
            'Jumlah': t.amount,
            'Metode': t.payment_method,
            'Status': t.status,
            'Catatan': t.note || '-',
            'Tanggal': new Date(t.created_at).toLocaleDateString('id-ID')
          }))}
          filename={`Transaksi_${new Date().toISOString().split('T')[0]}`}
          sheetName="Transaksi"
        />
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
                <th>Jenis Retribusi</th>
                <th>Pembayar</th>
                <th className="tx-amount">Jumlah</th>
                <th>Metode</th>
                <th>Status</th>
                <th className="tx-note">Catatan</th>
                <th className="tx-date">Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((t) => {
                const statusCls = t.status === 'LUNAS' ? 'tx-status-lunas' : t.status === 'BATAL' ? 'tx-status-batal' : 'tx-status-pending'
                return (
                  <tr key={t.id}>
                    <td>{t.stalls?.code || t.stalls?.number || `ID #${t.stall_id}`}</td>
                    <td>{t.retribution_rates?.retribution_types?.name || '-'}</td>
                    <td>{t.payer_name || '-'}</td>
                    <td className="tx-amount">Rp {Number(t.amount || 0).toLocaleString('id-ID')}</td>
                    <td>{t.payment_method || '-'}</td>
                    <td><span className={`tx-status-badge ${statusCls}`}>{t.status || '-'}</span></td>
                    <td className="tx-note">{t.note || '-'}</td>
                    <td className="tx-date">{formatDate(t.created_at)}</td>
                    <td className="tx-actions">
                      <button type="button" className="tx-icon-btn tx-icon-edit" title="Edit transaksi" aria-label="Edit transaksi" onClick={() => openEdit(t)}>
                        <IconEdit size={16} />
                      </button>
                      <button type="button" className="tx-icon-btn tx-icon-delete" title="Hapus transaksi" aria-label="Hapus transaksi" onClick={() => setDeleteTarget(t)}>
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalTransactions > 0 && (
        <div className="tx-pagination">
          <div style={{ fontSize: 14, color: '#475569' }}>
            Menampilkan {Math.min((safeCurrentPage - 1) * pageSize + 1, totalTransactions)}-{Math.min(safeCurrentPage * pageSize, totalTransactions)} dari {totalTransactions} data
          </div>
          <div className="tx-pagination-controls">
            <label className="tx-page-size">
              Per halaman
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="tx-filter-select"
              >
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </label>
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

      {editingTransaction && (
        <div className="tx-modal-backdrop" role="presentation" onClick={() => !actionLoading && setEditingTransaction(null)}>
          <div className="tx-modal" role="dialog" aria-modal="true" aria-labelledby="edit-transaction-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="edit-transaction-title">Edit Transaksi</h3>
            <p className="tx-modal-type">Jenis retribusi: {editingTransaction.retribution_rates?.retribution_types?.name || '-'}</p>
            <label>Pembayar</label>
            <input value={editForm.payer_name} onChange={(event) => setEditForm({ ...editForm, payer_name: event.target.value })} />
            <label>Jumlah</label>
            <input type="number" min="1" value={editForm.amount} onChange={(event) => setEditForm({ ...editForm, amount: event.target.value })} />
            <label>Metode Pembayaran</label>
            <select value={editForm.payment_method} onChange={(event) => setEditForm({ ...editForm, payment_method: event.target.value })}>
              <option value="Tunai">Tunai</option>
              <option value="QRIS">QRIS</option>
            </select>
            <label>Status</label>
            <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
              <option value="paid">paid</option>
              <option value="LUNAS">LUNAS</option>
              <option value="PENDING">PENDING</option>
              <option value="BATAL">BATAL</option>
            </select>
            <label>Catatan</label>
            <textarea rows={3} value={editForm.note} onChange={(event) => setEditForm({ ...editForm, note: event.target.value })} />
            <div className="tx-modal-actions">
              <button type="button" className="tx-modal-cancel" disabled={actionLoading} onClick={() => setEditingTransaction(null)}>Batal</button>
              <button type="button" className="tx-modal-save" disabled={actionLoading} onClick={saveEdit}>{actionLoading ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Transaksi"
        message={`Hapus transaksi ${deleteTarget?.id ?? ''}? Data yang dihapus tidak dapat dikembalikan.`}
        confirmLabel="Hapus"
        danger
        loading={actionLoading}
        onConfirm={deleteTransaction}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}