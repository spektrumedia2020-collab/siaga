import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { Loading } from '../components/Loading'
import { EmptyState } from '../components/EmptyState'
import { formatCurrency } from '../lib/exportUtils'
import './MarketReportsPage.css'

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

interface MarketReportsPageProps {
  marketId: number
}

interface TypeRow {
  id: number
  code: string | null
  name: string
  billing_period: string | null
}

interface BillRow {
  id: number
  stall_id: number
  types_id: number
  amount_due: number
  amount_paid: number
  outstanding: number
  status: string | null
  is_open: boolean | null
  due_date: string | null
  period_kind: string | null
  period_start: string | null
  period_end: string | null
}

interface TransactionRow {
  id: number
  amount: number
  bill_id: number | null
  rate_id: number | null
}

interface StallRow {
  id: number
  code: string | null
  number: string | null
}

interface AgingBucket {
  label: string
  count: number
  outstanding: number
}

const WITA_OFFSET = '+08:00'

const monthLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  )
}

const monthRange = (value: string) => {
  const [year, month] = value.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  const toIso = (date: Date) => date.toISOString().slice(0, 10)
  return {
    start: `${toIso(start)}T00:00:00${WITA_OFFSET}`,
    end: `${toIso(end)}T00:00:00${WITA_OFFSET}`,
    startDate: toIso(start),
    endDate: toIso(end)
  }
}

const todayKey = () => {
  const now = new Date()
  const wita = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return wita.toISOString().slice(0, 10)
}

const dayDiff = (fromKey: string, toKey: string) => {
  const from = new Date(`${fromKey}T00:00:00Z`).getTime()
  const to = new Date(`${toKey}T00:00:00Z`).getTime()
  return Math.floor((to - from) / (24 * 60 * 60 * 1000))
}

const percentText = (value: number | null) => {
  if (value == null) return '—'
  if (value > 0 && value < 0.1) return '<0.1%'
  return `${value.toFixed(1)}%`
}

export function MarketReportsPage({ marketId }: MarketReportsPageProps) {
  const [month, setMonth] = useState(() => todayKey().slice(0, 7))
  const [types, setTypes] = useState<TypeRow[]>([])
  const [bills, setBills] = useState<BillRow[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [rateTypeIds, setRateTypeIds] = useState<Map<number, number>>(new Map())
  const [stalls, setStalls] = useState<StallRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMaster = useCallback(async () => {
    try {
      const client = getSupabaseClient()
      const [typeRows, billRows, rateRows, stallRows] = await Promise.all([
        fetchAllRows<TypeRow>((from, to) =>
          client
            .from('retribution_types')
            .select('id, code, name, billing_period')
            .eq('market_id', marketId)
            .order('id')
            .range(from, to)
        ),
        fetchAllRows<BillRow>((from, to) =>
          client
            .from('retribution_bill_balances')
            .select('id, stall_id, types_id, amount_due, amount_paid, outstanding, status, is_open, due_date, period_kind, period_start, period_end')
            .eq('market_id', marketId)
            .order('id')
            .range(from, to)
        ),
        fetchAllRows<{ id: number; types_id: number }>((from, to) =>
          client
            .from('retribution_rates')
            .select('id, types_id')
            .eq('market_id', marketId)
            .order('id')
            .range(from, to)
        ),
        fetchAllRows<StallRow>((from, to) =>
          client
            .from('stalls')
            .select('id, code, number')
            .eq('market_id', marketId)
            .order('id')
            .range(from, to)
        )
      ])

      setTypes(typeRows)
      setBills(
        billRows.map((bill) => ({
          ...bill,
          amount_due: Number(bill.amount_due || 0),
          amount_paid: Number(bill.amount_paid || 0),
          outstanding: Number(bill.outstanding || 0)
        }))
      )
      setRateTypeIds(new Map(rateRows.map((rate) => [rate.id, rate.types_id])))
      setStalls(stallRows)
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data laporan')
    }
  }, [marketId])

  const loadTransactions = useCallback(async () => {
    try {
      const client = getSupabaseClient()
      const { start, end } = monthRange(month)
      const rows = await fetchAllRows<TransactionRow>((from, to) =>
        client
          .from('transactions')
          .select('id, amount, bill_id, rate_id')
          .eq('market_id', marketId)
          .gte('created_at', start)
          .lt('created_at', end)
          .order('id')
          .range(from, to)
      )
      setTransactions(rows.map((row) => ({ ...row, amount: Number(row.amount || 0) })))
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat transaksi bulan ini')
    }
  }, [marketId, month])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([loadMaster(), loadTransactions()]).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [loadMaster, loadTransactions])

  const billById = useMemo(() => new Map(bills.map((bill) => [bill.id, bill])), [bills])
  const stallById = useMemo(() => new Map(stalls.map((stall) => [stall.id, stall])), [stalls])

  const typeIdOfTransaction = useCallback(
    (tx: TransactionRow) => {
      if (tx.bill_id != null) return billById.get(tx.bill_id)?.types_id ?? null
      if (tx.rate_id != null) return rateTypeIds.get(tx.rate_id) ?? null
      return null
    },
    [billById, rateTypeIds]
  )

  const monthBounds = useMemo(() => monthRange(month), [month])

  const targetByType = useMemo(() => {
    const map = new Map<number, { amount: number; count: number }>()
    for (const bill of bills) {
      if (String(bill.status || '').toUpperCase() === 'DIBATALKAN') continue
      if (!bill.due_date) continue
      const dueKey = bill.due_date.slice(0, 10)
      if (dueKey < monthBounds.startDate || dueKey >= monthBounds.endDate) continue
      const current = map.get(bill.types_id) || { amount: 0, count: 0 }
      map.set(bill.types_id, { amount: current.amount + bill.amount_due, count: current.count + 1 })
    }
    return map
  }, [bills, monthBounds])

  const realizationByType = useMemo(() => {
    const map = new Map<number, number>()
    for (const tx of transactions) {
      const typeId = typeIdOfTransaction(tx)
      if (typeId == null) continue
      map.set(typeId, (map.get(typeId) || 0) + tx.amount)
    }
    return map
  }, [transactions, typeIdOfTransaction])

  const totals = useMemo(() => {
    const target = [...targetByType.values()].reduce((sum, value) => sum + value.amount, 0)
    const realization = transactions.reduce((sum, tx) => sum + tx.amount, 0)
    const outstanding = bills
      .filter((bill) => String(bill.status || '').toUpperCase() !== 'DIBATALKAN')
      .reduce((sum, bill) => sum + bill.outstanding, 0)
    return {
      target,
      realization,
      outstanding,
      percent: target > 0 ? (realization / target) * 100 : null
    }
  }, [targetByType, transactions, bills])

  const typeRows = useMemo(() => {
    return types
      .map((type) => {
        const entry = targetByType.get(type.id)
        const target = entry?.amount || 0
        const billCount = entry?.count || 0
        const realization = realizationByType.get(type.id) || 0
        return { type, target, billCount, realization }
      })
      .filter((row) => row.target > 0 || row.realization > 0)
      .sort((a, b) => b.realization - a.realization)
  }, [types, targetByType, realizationByType])

  const aging = useMemo<AgingBucket[]>(() => {
    const buckets: AgingBucket[] = [
      { label: 'Belum jatuh tempo', count: 0, outstanding: 0 },
      { label: '1–30 hari', count: 0, outstanding: 0 },
      { label: '31–60 hari', count: 0, outstanding: 0 },
      { label: '61–90 hari', count: 0, outstanding: 0 },
      { label: 'Lebih dari 90 hari', count: 0, outstanding: 0 }
    ]
    const today = todayKey()
    for (const bill of bills) {
      if (bill.outstanding <= 0) continue
      if (String(bill.status || '').toUpperCase() === 'DIBATALKAN') continue
      const dueKey = bill.due_date ? bill.due_date.slice(0, 10) : today
      const daysLate = dayDiff(dueKey, today)
      const index = daysLate <= 0 ? 0 : daysLate <= 30 ? 1 : daysLate <= 60 ? 2 : daysLate <= 90 ? 3 : 4
      buckets[index].count += 1
      buckets[index].outstanding += bill.outstanding
    }
    return buckets
  }, [bills])

  const topStalls = useMemo(() => {
    const byStall = new Map<number, number>()
    for (const bill of bills) {
      if (bill.outstanding <= 0) continue
      if (String(bill.status || '').toUpperCase() === 'DIBATALKAN') continue
      byStall.set(bill.stall_id, (byStall.get(bill.stall_id) || 0) + bill.outstanding)
    }
    return [...byStall.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([stallId, outstanding]) => {
        const stall = stallById.get(stallId)
        const label = stall?.code || stall?.number || `Lapak #${stallId}`
        return { stallId, label, outstanding }
      })
  }, [bills, stallById])

  const totalAging = aging.reduce((sum, bucket) => sum + bucket.outstanding, 0)

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h2>📊 Laporan</h2>
          <p>Realisasi penerimaan dibanding tagihan jatuh tempo, plus umur tunggakan.</p>
        </div>
        <label className="reports-month">
          <span>Bulan</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value || month)} />
        </label>
      </div>

      {error && <div className="reports-error">{error}</div>}

      {loading ? (
        <Loading label="Memuat laporan..." />
      ) : (
        <>
          <div className="reports-cards">
            <div className="reports-card">
              <span>Target tagihan</span>
              <strong>{formatCurrency(totals.target)}</strong>
              <small>Jatuh tempo {monthLabel(month)}</small>
            </div>
            <div className="reports-card">
              <span>Realisasi</span>
              <strong>{formatCurrency(totals.realization)}</strong>
              <small>{transactions.length.toLocaleString('id-ID')} transaksi diterima</small>
            </div>
            <div className="reports-card">
              <span>Selisih</span>
              <strong className={totals.target - totals.realization > 0 ? 'negative' : 'positive'}>
                {formatCurrency(totals.realization - totals.target)}
              </strong>
              <small>{totals.percent == null ? 'Tanpa tagihan jatuh tempo' : `${percentText(totals.percent)} dari target`}</small>
            </div>
            <div className="reports-card">
              <span>Total tunggakan</span>
              <strong>{formatCurrency(totals.outstanding)}</strong>
              <small>Semua tagihan terbuka</small>
            </div>
          </div>

          <div className="reports-note">
            Target dihitung dari tagihan yang <strong>jatuh tempo</strong> pada bulan terpilih; realisasi dihitung dari
            pembayaran yang <strong>diterima</strong> pada bulan yang sama. Jenis tanpa tagihan (mis. sewa harian)
            hanya menampilkan realisasi.
          </div>

          <section className="reports-section">
            <h3>Realisasi per jenis</h3>
            {typeRows.length === 0 ? (
              <EmptyState icon="📊" title="Belum ada data" subtitle="Tidak ada tagihan atau pembayaran pada bulan ini." />
            ) : (
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Jenis</th>
                      <th className="num">Tagihan</th>
                      <th className="num">Target</th>
                      <th className="num">Realisasi</th>
                      <th className="num">Selisih</th>
                      <th className="num">Capaian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeRows.map(({ type, target, billCount, realization }) => {
                      const diff = realization - target
                      const percent = target > 0 ? (realization / target) * 100 : null
                      return (
                        <tr key={type.id}>
                          <td>
                            <strong>{type.name}</strong>
                            {type.code && <div className="reports-muted">{type.code}</div>}
                          </td>
                          <td className="num">{billCount > 0 ? billCount.toLocaleString('id-ID') : '—'}</td>
                          <td className="num">{target > 0 ? formatCurrency(target) : '—'}</td>
                          <td className="num">{formatCurrency(realization)}</td>
                          <td className={`num ${diff < 0 ? 'negative' : diff > 0 ? 'positive' : ''}`}>
                            {target > 0 ? formatCurrency(diff) : '—'}
                          </td>
                          <td className="num">{percentText(percent)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="reports-section">
            <h3>Umur tunggakan</h3>
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Kelompok</th>
                    <th className="num">Tagihan</th>
                    <th className="num">Nilai</th>
                    <th className="num">Porsi</th>
                  </tr>
                </thead>
                <tbody>
                  {aging.map((bucket) => (
                    <tr key={bucket.label}>
                      <td>{bucket.label}</td>
                      <td className="num">{bucket.count.toLocaleString('id-ID')}</td>
                      <td className="num">{formatCurrency(bucket.outstanding)}</td>
                      <td className="num">{percentText(totalAging > 0 ? (bucket.outstanding / totalAging) * 100 : null)}</td>
                    </tr>
                  ))}
                  <tr className="reports-total-row">
                    <td>Total</td>
                    <td className="num">{aging.reduce((sum, bucket) => sum + bucket.count, 0).toLocaleString('id-ID')}</td>
                    <td className="num">{formatCurrency(totalAging)}</td>
                    <td className="num">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="reports-section">
            <h3>10 lapak dengan tunggakan terbesar</h3>
            {topStalls.length === 0 ? (
              <EmptyState icon="✅" title="Tidak ada tunggakan" subtitle="Semua tagihan sudah lunas." />
            ) : (
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Lapak</th>
                      <th className="num">Tunggakan</th>
                      <th className="num">Porsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStalls.map((row) => (
                      <tr key={row.stallId}>
                        <td>{row.label}</td>
                        <td className="num">{formatCurrency(row.outstanding)}</td>
                        <td className="num">{percentText(totals.outstanding > 0 ? (row.outstanding / totals.outstanding) * 100 : null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
