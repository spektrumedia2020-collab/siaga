import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { Loading } from '../components/Loading'
import { EmptyState } from '../components/EmptyState'
import './MarketBillsPage.css'

const PAGE_SIZE = 1000

async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = (data || []) as T[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

interface MarketBillsPageProps {
  marketId: number
  readOnly?: boolean
}

interface AnnualType {
  id: number
  code: string | null
  name: string
  allow_installment: boolean | null
}

interface BillRow {
  id: number
  stall_id: number
  types_id: number
  period_year: number
  amount_due: number
  amount_paid: number
  outstanding: number
  status: string
  is_open: boolean
  due_date: string | null
}

interface StallRow {
  id: number
  code: string | null
  number: string | null
  owner_id: number | null
}

interface StallSummary {
  stallId: number
  code: string
  ownerName: string
  bills: BillRow[]
  currentDue: number
  currentPaid: number
  currentOutstanding: number
  arrears: number
  arrearsYears: number[]
  totalPaid: number
  totalOutstanding: number
  openBills: BillRow[]
  status: 'LUNAS' | 'CICILAN' | 'BELUM_LUNAS'
}

const formatRupiah = (value: number) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`

const normalizeStatus = (status: string | null | undefined) => String(status || '').toUpperCase()

export function MarketBillsPage({ marketId, readOnly = false }: MarketBillsPageProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'paid' | 'arrears'>('all')
  const [types, setTypes] = useState<AnnualType[]>([])
  const [bills, setBills] = useState<BillRow[]>([])
  const [stalls, setStalls] = useState<StallRow[]>([])
  const [owners, setOwners] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupMissing, setSetupMissing] = useState(false)
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1)

  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateYear, setGenerateYear] = useState(String(currentYear))
  const [generateType, setGenerateType] = useState<'all' | string>('all')
  const [generateDue, setGenerateDue] = useState(`${currentYear}-03-31`)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')

  const [payTarget, setPayTarget] = useState<StallSummary | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Tunai')
  const [payName, setPayName] = useState('')
  const [payNote, setPayNote] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    setSetupMissing(false)
    try {
      const client = getSupabaseClient()

      const typeRows = await fetchAllRows<AnnualType>((from, to) =>
        client
          .from('retribution_types')
          .select('id, code, name, allow_installment')
          .eq('market_id', marketId)
          .eq('billing_period', 'TAHUNAN')
          .order('name')
          .range(from, to)
      )

      const billRows = await fetchAllRows<BillRow>((from, to) =>
        client
          .from('retribution_bill_balances')
          .select('id, stall_id, types_id, period_year, amount_due, amount_paid, outstanding, status, is_open, due_date')
          .eq('market_id', marketId)
          .order('stall_id')
          .order('period_year')
          .range(from, to)
      )

      const stallRows = await fetchAllRows<StallRow>((from, to) =>
        client
          .from('stalls')
          .select('id, code, number, owner_id')
          .eq('market_id', marketId)
          .order('number')
          .range(from, to)
      )

      const ownerIds = [...new Set(stallRows.map((stall) => stall.owner_id).filter((id): id is number => id != null))]
      const ownerMap = new Map<number, string>()
      for (let index = 0; index < ownerIds.length; index += 200) {
        const chunk = ownerIds.slice(index, index + 200)
        if (chunk.length === 0) continue
        const { data, error: ownerError } = await client
          .from('stall_owners')
          .select('id, name')
          .in('id', chunk)
        if (ownerError) throw ownerError
        for (const owner of (data || []) as Array<{ id: number; name: string | null }>) {
          ownerMap.set(owner.id, owner.name || '')
        }
      }

      setTypes(typeRows)
      setBills(
        billRows.map((bill) => ({
          ...bill,
          amount_due: Number(bill.amount_due || 0),
          amount_paid: Number(bill.amount_paid || 0),
          outstanding: Number(bill.outstanding || 0),
          is_open: Boolean(bill.is_open)
        }))
      )
      setStalls(stallRows)
      setOwners(ownerMap)
    } catch (err: any) {
      const message = String(err?.message || err || 'Gagal memuat tagihan')
      if (/billing_period|retribution_bill_balances|does not exist|schema cache/i.test(message)) {
        setSetupMissing(true)
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [marketId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setPage(1)
  }, [year, typeFilter, search, statusFilter])

  const stallById = useMemo(() => new Map(stalls.map((stall) => [stall.id, stall])), [stalls])

  const summaries = useMemo<StallSummary[]>(() => {
    const byStall = new Map<number, BillRow[]>()
    for (const bill of bills) {
      if (typeFilter !== 'all' && bill.types_id !== Number(typeFilter)) continue
      if (normalizeStatus(bill.status) === 'DIBATALKAN') continue
      const list = byStall.get(bill.stall_id) || []
      list.push(bill)
      byStall.set(bill.stall_id, list)
    }

    const rows: StallSummary[] = []
    byStall.forEach((list, stallId) => {
      const stall = stallById.get(stallId)
      const currentBills = list.filter((bill) => bill.period_year === year)
      const olderBills = list.filter((bill) => bill.period_year < year && bill.outstanding > 0)
      const openBills = list
        .filter((bill) => bill.is_open && bill.outstanding > 0)
        .sort((a, b) => a.period_year - b.period_year || a.id - b.id)

      const totalPaid = list.reduce((sum, bill) => sum + bill.amount_paid, 0)
      const totalOutstanding = list.reduce((sum, bill) => sum + bill.outstanding, 0)
      const currentDue = currentBills.reduce((sum, bill) => sum + bill.amount_due, 0)
      const currentPaid = currentBills.reduce((sum, bill) => sum + bill.amount_paid, 0)
      const currentOutstanding = currentBills.reduce((sum, bill) => sum + bill.outstanding, 0)

      rows.push({
        stallId,
        code: stall?.code || stall?.number || `Lapak #${stallId}`,
        ownerName: stall?.owner_id ? owners.get(stall.owner_id) || '-' : '-',
        bills: list,
        currentDue,
        currentPaid,
        currentOutstanding,
        arrears: olderBills.reduce((sum, bill) => sum + bill.outstanding, 0),
        arrearsYears: [...new Set(olderBills.map((bill) => bill.period_year))].sort((a, b) => a - b),
        totalPaid,
        totalOutstanding,
        openBills,
        status: totalOutstanding <= 0 ? 'LUNAS' : totalPaid > 0 ? 'CICILAN' : 'BELUM_LUNAS'
      })
    })

    return rows.sort((a, b) => a.code.localeCompare(b.code, 'id', { numeric: true }))
  }, [bills, typeFilter, year, stallById, owners])

  const visibleRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return summaries.filter((row) => {
      if (keyword && !`${row.code} ${row.ownerName}`.toLowerCase().includes(keyword)) return false
      if (statusFilter === 'open' && row.totalOutstanding <= 0) return false
      if (statusFilter === 'paid' && row.totalOutstanding > 0) return false
      if (statusFilter === 'arrears' && row.arrears <= 0) return false
      return true
    })
  }, [summaries, search, statusFilter])

  const totals = useMemo(() => {
    let due = 0
    let paid = 0
    let outstanding = 0
    let arrears = 0
    let arrearsStalls = 0
    for (const row of summaries) {
      due += row.currentDue
      paid += row.currentPaid
      outstanding += row.currentOutstanding
      if (row.arrears > 0) {
        arrears += row.arrears
        arrearsStalls += 1
      }
    }
    return { due, paid, outstanding, arrears, arrearsStalls, total: summaries.length }
  }, [summaries])

  const pageSize = 25
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = visibleRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const openGenerateDialog = () => {
    setGenerateYear(String(year))
    setGenerateType(typeFilter)
    setGenerateDue(`${year}-03-31`)
    setGenerateError('')
    setGenerateOpen(true)
  }

  const handleGenerate = async () => {
    const parsedYear = Number(generateYear)
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      setGenerateError('Tahun tagihan tidak valid')
      return
    }
    try {
      setGenerating(true)
      setGenerateError('')
      const { data, error: rpcError } = await getSupabaseClient().rpc('generate_retribution_bills', {
        p_market_id: marketId,
        p_year: parsedYear,
        p_types_id: generateType === 'all' ? null : Number(generateType),
        p_due_date: generateDue || null
      })
      if (rpcError) throw rpcError
      setGenerateOpen(false)
      setYear(parsedYear)
      setNotice(`Tagihan tahun ${parsedYear} diterbitkan: ${Number(data) || 0} baris baru.`)
      await loadData()
    } catch (err: any) {
      setGenerateError(err?.message || 'Gagal menerbitkan tagihan')
    } finally {
      setGenerating(false)
    }
  }

  const openPayDialog = (row: StallSummary) => {
    setPayTarget(row)
    setPayAmount('')
    setPayMethod('Tunai')
    setPayName(row.ownerName !== '-' ? row.ownerName : '')
    setPayNote('')
    setPayError('')
  }

  const handlePay = async () => {
    if (!payTarget) return
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError('Jumlah pembayaran harus lebih dari 0')
      return
    }
    try {
      setPaying(true)
      setPayError('')
      const { data, error: rpcError } = await getSupabaseClient().rpc('pay_retribution_bills', {
        p_stall_id: payTarget.stallId,
        p_amount: amount,
        p_types_id: typeFilter === 'all' ? null : Number(typeFilter),
        p_payment_method: payMethod,
        p_payer_name: payName.trim() || null,
        p_note: payNote.trim() || null
      })
      if (rpcError) throw rpcError

      const parts = ((data || []) as Array<{ bill_id: number; period_year: number; amount: number }>)
        .map((row) => `${row.period_year} ${formatRupiah(Number(row.amount))}`)
      setPayTarget(null)
      setNotice(`Pembayaran ${formatRupiah(amount)} untuk ${payTarget.code} tercatat: ${parts.join(' · ') || '-'}.`)
      await loadData()
    } catch (err: any) {
      setPayError(err?.message || 'Gagal menyimpan pembayaran')
    } finally {
      setPaying(false)
    }
  }

  const payTotal = payTarget ? payTarget.openBills.reduce((sum, bill) => sum + bill.outstanding, 0) : 0

  if (setupMissing) {
    return (
      <div className="page-card">
        <h2>📄 Tagihan Tahunan</h2>
        <div className="bills-setup-box">
          <strong>Fitur tagihan tahunan belum aktif di database.</strong>
          <p>Jalankan <code>migrations/020_retribution_annual_bills.sql</code> di SQL Editor Supabase, lalu muat ulang halaman ini.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-card bills-page">
      <header className="bills-header">
        <div>
          <h2>📄 Tagihan Tahunan</h2>
          <p>Retribusi tahunan (mis. Jaspro) dapat dicicil. Pembayaran dilunasi dari tunggakan terlama lebih dulu.</p>
        </div>
        {!readOnly && (
          <button type="button" className="btn-primary" onClick={openGenerateDialog}>
            Terbitkan Tagihan
          </button>
        )}
      </header>

      {error && <div className="bills-error">{error}</div>}
      {notice && <div className="bills-notice">{notice}</div>}

      <div className="bills-card-grid">
        <div className="bills-card">
          <span>Tagihan {year}</span>
          <strong>{formatRupiah(totals.due)}</strong>
          <small>{totals.total} lapak bertagihan</small>
        </div>
        <div className="bills-card">
          <span>Dibayar {year}</span>
          <strong>{formatRupiah(totals.paid)}</strong>
          <small>Sisa {formatRupiah(totals.outstanding)}</small>
        </div>
        <div className="bills-card alert">
          <span>Tunggakan tahun lalu</span>
          <strong>{formatRupiah(totals.arrears)}</strong>
          <small>{totals.arrearsStalls} lapak menunggak</small>
        </div>
      </div>

      <div className="bills-toolbar">
        <label>
          Tahun
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {Array.from({ length: 6 }, (_, index) => currentYear + 1 - index).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Jenis
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">Semua jenis tahunan</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}{type.code ? ` (${type.code})` : ''}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">Semua</option>
            <option value="open">Belum lunas</option>
            <option value="arrears">Ada tunggakan</option>
            <option value="paid">Lunas</option>
          </select>
        </label>
        <label className="bills-search">
          Cari lapak / pemilik
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="NGD-0001" />
        </label>
      </div>

      {types.length === 0 && !loading && (
        <div className="bills-hint">
          Belum ada jenis retribusi tahunan untuk pasar ini. Tambahkan jenis dengan periode TAHUNAN di halaman Retribusi.
        </div>
      )}

      {loading ? (
        <Loading label="Memuat tagihan..." fullHeight={false} />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          icon="📄"
          title="Belum ada tagihan"
          subtitle={readOnly ? 'Tagihan belum diterbitkan untuk filter ini.' : 'Gunakan tombol Terbitkan Tagihan untuk membuat tagihan tahunan dari tarif per lapak.'}
        />
      ) : (
        <>
          <div className="bills-table-wrap">
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Lapak</th>
                  <th>Pemilik</th>
                  <th className="num">Tagihan {year}</th>
                  <th className="num">Dibayar {year}</th>
                  <th className="num">Tunggakan lama</th>
                  <th className="num">Total sisa</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.stallId}>
                    <td><strong>{row.code}</strong></td>
                    <td>{row.ownerName}</td>
                    <td className="num">{formatRupiah(row.currentDue)}</td>
                    <td className="num">{formatRupiah(row.currentPaid)}</td>
                    <td className={`num ${row.arrears > 0 ? 'danger' : ''}`}>
                      {row.arrears > 0 ? `${formatRupiah(row.arrears)} (${row.arrearsYears.join(', ')})` : '-'}
                    </td>
                    <td className="num"><strong>{formatRupiah(row.totalOutstanding)}</strong></td>
                    <td>
                      <span className={`bills-badge ${row.status.toLowerCase()}`}>
                        {row.status === 'LUNAS' ? 'Lunas' : row.status === 'CICILAN' ? 'Dicicil' : 'Belum bayar'}
                      </span>
                    </td>
                    <td>
                      {row.totalOutstanding > 0 ? (
                        <button type="button" className="btn-secondary bills-pay-btn" onClick={() => openPayDialog(row)}>
                          {readOnly ? 'Lihat' : 'Bayar'}
                        </button>
                      ) : (
                        <span className="bills-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bills-pagination">
            <span>Menampilkan {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, visibleRows.length)} dari {visibleRows.length} lapak</span>
            <div>
              <button type="button" className="btn-secondary" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Sebelumnya</button>
              <span className="bills-page-indicator">Halaman {safePage}/{totalPages}</span>
              <button type="button" className="btn-secondary" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Selanjutnya →</button>
            </div>
          </div>
        </>
      )}

      {generateOpen && (
        <div className="bills-modal-backdrop" role="presentation" onClick={() => !generating && setGenerateOpen(false)}>
          <div className="bills-modal" role="dialog" aria-modal="true" aria-labelledby="generate-bills-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="generate-bills-title">Terbitkan Tagihan Tahunan</h3>
            <p>Tagihan dibuat dari tarif per lapak yang sudah diisi. Baris yang sudah ada tidak diduplikasi.</p>
            <label>Tahun
              <input type="number" min="2000" max="2100" value={generateYear} onChange={(event) => {
                const next = event.target.value
                setGenerateYear(next)
                if (/^\d{4}$/.test(next)) setGenerateDue(`${next}-03-31`)
              }} />
            </label>
            <label>Jenis
              <select value={generateType} onChange={(event) => setGenerateType(event.target.value)}>
                <option value="all">Semua jenis tahunan</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </label>
            <label>Jatuh tempo
              <input type="date" value={generateDue} onChange={(event) => setGenerateDue(event.target.value)} />
            </label>
            {generateError && <div className="bills-error">{generateError}</div>}
            <div className="bills-modal-actions">
              <button type="button" className="btn-secondary" disabled={generating} onClick={() => setGenerateOpen(false)}>Batal</button>
              <button type="button" className="btn-primary" disabled={generating} onClick={handleGenerate}>
                {generating ? 'Menerbitkan...' : 'Terbitkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {payTarget && (
        <div className="bills-modal-backdrop" role="presentation" onClick={() => !paying && setPayTarget(null)}>
          <div className="bills-modal bills-modal-wide" role="dialog" aria-modal="true" aria-labelledby="pay-bills-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="pay-bills-title">Bayar Tagihan {payTarget.code}</h3>
            <p>Pembayaran dialokasikan otomatis dari tahun terlama lebih dulu.</p>

            <table className="bills-mini-table">
              <thead>
                <tr>
                  <th>Tahun</th>
                  <th className="num">Tagihan</th>
                  <th className="num">Dibayar</th>
                  <th className="num">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {payTarget.openBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.period_year}</td>
                    <td className="num">{formatRupiah(bill.amount_due)}</td>
                    <td className="num">{formatRupiah(bill.amount_paid)}</td>
                    <td className="num"><strong>{formatRupiah(bill.outstanding)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bills-total-row">
              <span>Total tunggakan</span>
              <strong>{formatRupiah(payTotal)}</strong>
            </div>

            {readOnly ? (
              <div className="bills-hint">Akun ini hanya dapat melihat data.</div>
            ) : (
              <>
                <label>Jumlah dibayar
                  <div className="bills-amount-row">
                    <input
                      type="number"
                      min="1"
                      max={payTotal || undefined}
                      value={payAmount}
                      onChange={(event) => setPayAmount(event.target.value)}
                      placeholder="Boleh sebagian (cicilan)"
                    />
                    <button type="button" className="btn-secondary" onClick={() => setPayAmount(String(payTotal))}>Lunasi semua</button>
                  </div>
                </label>
                <div className="bills-field-row">
                  <label>Metode
                    <select value={payMethod} onChange={(event) => setPayMethod(event.target.value)}>
                      <option value="Tunai">Tunai</option>
                      <option value="QRIS">QRIS</option>
                    </select>
                  </label>
                  <label>Pembayar
                    <input value={payName} onChange={(event) => setPayName(event.target.value)} placeholder="Nama pembayar" />
                  </label>
                </div>
                <label>Catatan
                  <input value={payNote} onChange={(event) => setPayNote(event.target.value)} placeholder="Opsional" />
                </label>
                {payError && <div className="bills-error">{payError}</div>}
                <div className="bills-modal-actions">
                  <button type="button" className="btn-secondary" disabled={paying} onClick={() => setPayTarget(null)}>Batal</button>
                  <button type="button" className="btn-primary" disabled={paying} onClick={handlePay}>
                    {paying ? 'Menyimpan...' : 'Simpan Pembayaran'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
