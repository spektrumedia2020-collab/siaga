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

interface TypeRow {
  id: number
  code: string | null
  name: string
  unit: string | null
  allow_installment: boolean | null
  billing_period: string | null
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
  note?: string | null
  period_kind?: string | null
  period_start?: string | null
  period_end?: string | null
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

interface PayTarget {
  stallId: number
  code: string
  ownerName: string
  openBills: BillRow[]
  typesId: number | null
}

const formatRupiah = (value: number) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const periodLabel = (bill: BillRow) =>
  (bill.period_kind || 'TAHUNAN') === 'TAHUNAN'
    ? String(bill.period_year)
    : bill.period_start || bill.period_end
      ? `${formatDate(bill.period_start)} – ${formatDate(bill.period_end)}`
      : String(bill.period_year)

const periodKindLabel = (kind?: string | null) => {
  switch (kind) {
    case 'MINGGUAN':
      return 'Mingguan'
    case 'BULANAN':
      return 'Bulanan'
    case 'HARIAN':
      return 'Harian'
    case 'TAHUNAN':
      return 'Tahunan'
    default:
      return 'Rentang'
  }
}

const witaToday = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const normalizeStatus = (status: string | null | undefined) => String(status || '').toUpperCase()

export function MarketBillsPage({ marketId, readOnly = false }: MarketBillsPageProps) {
  const currentYear = new Date().getFullYear()
  const [tab, setTab] = useState<'annual' | 'period'>('annual')
  const [year, setYear] = useState(currentYear)
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'paid' | 'arrears'>('all')
  const [types, setTypes] = useState<TypeRow[]>([])
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

  const [periodTypeFilter, setPeriodTypeFilter] = useState<'all' | string>('all')
  const [periodStatusFilter, setPeriodStatusFilter] = useState<'all' | 'open' | 'paid' | 'cancelled'>('open')
  const [periodSearch, setPeriodSearch] = useState('')
  const [periodPage, setPeriodPage] = useState(1)

  const [issueOpen, setIssueOpen] = useState(false)
  const [issueMode, setIssueMode] = useState<'current' | 'range'>('current')
  const [issueType, setIssueType] = useState('')
  const [issueStart, setIssueStart] = useState(witaToday())
  const [issueEnd, setIssueEnd] = useState(addDays(witaToday(), 6))
  const [issueDue, setIssueDue] = useState('')
  const [issueStall, setIssueStall] = useState('')
  const [issueNote, setIssueNote] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState('')

  const [payTarget, setPayTarget] = useState<PayTarget | null>(null)
  const [cancelTarget, setCancelTarget] = useState<{ bill: BillRow; code: string } | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
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

      const typeRows = await fetchAllRows<TypeRow>((from, to) =>
        client
          .from('retribution_types')
          .select('id, code, name, unit, allow_installment, billing_period')
          .eq('market_id', marketId)
          .order('name')
          .range(from, to)
      )

      const billRows = await fetchAllRows<BillRow>((from, to) =>
        client
          .from('retribution_bill_balances')
          .select('id, stall_id, types_id, period_year, amount_due, amount_paid, outstanding, status, is_open, due_date, note, period_kind, period_start, period_end')
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

  useEffect(() => {
    setPeriodPage(1)
  }, [periodTypeFilter, periodStatusFilter, periodSearch])

  const stallById = useMemo(() => new Map(stalls.map((stall) => [stall.id, stall])), [stalls])
  const typeById = useMemo(() => new Map(types.map((type) => [type.id, type])), [types])
  const annualTypes = useMemo(() => types.filter((type) => type.billing_period === 'TAHUNAN'), [types])
  const periodTypes = useMemo(() => types.filter((type) => type.billing_period !== 'TAHUNAN'), [types])
  const annualTypeIds = useMemo(() => new Set(annualTypes.map((type) => type.id)), [annualTypes])
  const periodTypeIds = useMemo(() => new Set(periodTypes.map((type) => type.id)), [periodTypes])

  const summaries = useMemo<StallSummary[]>(() => {
    const byStall = new Map<number, BillRow[]>()
    for (const bill of bills) {
      if (!annualTypeIds.has(bill.types_id)) continue
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
  }, [bills, annualTypeIds, typeFilter, year, stallById, owners])

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

  const periodRows = useMemo(() => {
    const keyword = periodSearch.trim().toLowerCase()
    return bills
      .filter((bill) => periodTypeIds.has(bill.types_id))
      .filter((bill) => periodTypeFilter === 'all' || bill.types_id === Number(periodTypeFilter))
      .filter((bill) => {
        const cancelled = normalizeStatus(bill.status) === 'DIBATALKAN'
        if (periodStatusFilter === 'cancelled') return cancelled
        if (cancelled) return false
        if (periodStatusFilter === 'open' && !(bill.is_open && bill.outstanding > 0)) return false
        if (periodStatusFilter === 'paid' && bill.outstanding > 0) return false
        return true
      })
      .filter((bill) => {
        if (!keyword) return true
        const stall = stallById.get(bill.stall_id)
        const owner = stall?.owner_id ? owners.get(stall.owner_id) || '' : ''
        const typeName = typeById.get(bill.types_id)?.name || ''
        return `${stall?.code || ''} ${stall?.number || ''} ${owner} ${typeName}`.toLowerCase().includes(keyword)
      })
      .sort((a, b) => `${b.period_start || ''}`.localeCompare(`${a.period_start || ''}`) || b.id - a.id)
  }, [bills, periodTypeIds, periodTypeFilter, periodStatusFilter, periodSearch, stallById, owners, typeById])

  const periodTotals = useMemo(() => {
    let due = 0
    let paid = 0
    let outstanding = 0
    const stallIds = new Set<number>()
    for (const bill of periodRows) {
      if (normalizeStatus(bill.status) === 'DIBATALKAN') continue
      due += bill.amount_due
      paid += bill.amount_paid
      outstanding += bill.outstanding
      stallIds.add(bill.stall_id)
    }
    return { due, paid, outstanding, stalls: stallIds.size, count: periodRows.length }
  }, [periodRows])

  const periodPageSize = 25
  const periodTotalPages = Math.max(1, Math.ceil(periodRows.length / periodPageSize))
  const safePeriodPage = Math.min(periodPage, periodTotalPages)
  const periodPageRows = periodRows.slice((safePeriodPage - 1) * periodPageSize, safePeriodPage * periodPageSize)

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

  const openIssueDialog = () => {
    const fallbackType = periodTypes[0] ? String(periodTypes[0].id) : ''
    setIssueMode('current')
    setIssueType(periodTypeFilter === 'all' ? fallbackType : periodTypeFilter)
    const today = witaToday()
    setIssueStart(today)
    setIssueEnd(addDays(today, 6))
    setIssueDue('')
    setIssueStall('')
    setIssueNote('')
    setIssueError('')
    setIssueOpen(true)
  }

  const handleIssue = async () => {
    if (!issueType) {
      setIssueError('Pilih jenis retribusi')
      return
    }
    if (issueMode === 'range') {
      if (!issueStart || !issueEnd) {
        setIssueError('Tanggal mulai dan akhir wajib diisi')
        return
      }
      const days = Math.round((Date.parse(`${issueEnd}T00:00:00Z`) - Date.parse(`${issueStart}T00:00:00Z`)) / 86400000) + 1
      if (!Number.isFinite(days) || days < 1) {
        setIssueError('Tanggal akhir tidak boleh sebelum tanggal mulai')
        return
      }
      if (days > 31) {
        setIssueError(`Periode maksimal 31 hari (diminta ${days})`)
        return
      }
    }

    try {
      setIssuing(true)
      setIssueError('')
      const client = getSupabaseClient()
      if (issueMode === 'current') {
        const { data, error: rpcError } = await client.rpc('generate_current_period_bills', {
          p_market_id: marketId,
          p_types_id: Number(issueType),
          p_stall_id: null
        })
        if (rpcError) throw rpcError
        setIssueOpen(false)
        setNotice(`Tagihan periode berjalan tersedia untuk ${Number(data) || 0} lapak berirama mingguan/bulanan.`)
      } else {
        const keyword = issueStall.trim().toLowerCase()
        let stallId: number | null = null
        if (keyword) {
          const stall = stalls.find(
            (item) =>
              String(item.code || '').toLowerCase() === keyword ||
              String(item.number || '').toLowerCase() === keyword
          )
          if (!stall) {
            setIssueError('Kode lapak tidak ditemukan di pasar ini')
            return
          }
          stallId = stall.id
        }
        const { data, error: rpcError } = await client.rpc('generate_period_bills', {
          p_market_id: marketId,
          p_types_id: Number(issueType),
          p_period_start: issueStart,
          p_period_end: issueEnd,
          p_stall_id: stallId,
          p_due_date: issueDue || issueEnd,
          p_note: issueNote.trim() || null,
          p_period_kind: 'CUSTOM'
        })
        if (rpcError) throw rpcError
        setIssueOpen(false)
        setNotice(
          `${Number(data) || 0} tagihan periode ${formatDate(issueStart)} – ${formatDate(issueEnd)} diterbitkan` +
          `${stallId ? ' untuk lapak yang dipilih' : ' untuk semua lapak bertarif'}.`
        )
      }
      setTab('period')
      await loadData()
    } catch (err: any) {
      setIssueError(err?.message || 'Gagal menerbitkan tagihan periode')
    } finally {
      setIssuing(false)
    }
  }

  const openPayDialog = (target: PayTarget) => {
    setPayTarget(target)
    setPayAmount('')
    setPayMethod('Tunai')
    setPayName(target.ownerName !== '-' ? target.ownerName : '')
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
        p_types_id: payTarget.typesId,
        p_payment_method: payMethod,
        p_payer_name: payName.trim() || null,
        p_note: payNote.trim() || null
      })
      if (rpcError) throw rpcError

      const parts = ((data || []) as Array<{ bill_id: number; period_year: number; amount: number }>)
        .map((row) => {
          const bill = bills.find((item) => item.id === row.bill_id)
          const label = bill ? periodLabel(bill) : String(row.period_year)
          return `${label} ${formatRupiah(Number(row.amount))}`
        })
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

  const annualPayTypesId = typeFilter !== 'all'
    ? Number(typeFilter)
    : annualTypes.length === 1 ? annualTypes[0].id : null

  const billStatus = (bill: BillRow) =>
    bill.outstanding <= 0 ? 'LUNAS' : bill.amount_paid > 0 ? 'CICILAN' : 'BELUM_LUNAS'

  const isPeriodCurrent = (bill: BillRow) => {
    if ((bill.period_kind || 'TAHUNAN') === 'TAHUNAN') return false
    if (!bill.period_start || !bill.period_end) return false
    const today = witaToday()
    return bill.period_start <= today && today <= bill.period_end
  }

  const cancelBlockReason = (bill: BillRow): string | null => {
    if (normalizeStatus(bill.status) === 'DIBATALKAN') return 'Tagihan sudah dibatalkan'
    if (bill.amount_paid > 0) return 'Tagihan sudah memiliki pembayaran'
    if (!bill.is_open) return 'Tagihan sudah lunas'
    if (isPeriodCurrent(bill)) {
      return 'Periode berjalan akan diterbitkan ulang oleh cron. Ubah irama tarif ke Harian dulu bila tagihan ini keliru.'
    }
    return null
  }

  const canCancelBill = (bill: BillRow) => !readOnly && cancelBlockReason(bill) === null

  const openCancelDialog = (bill: BillRow) => {
    const stall = stallById.get(bill.stall_id)
    setCancelTarget({
      bill,
      code: stall?.code || stall?.number || `Lapak #${bill.stall_id}`
    })
    setCancelReason('')
    setCancelError('')
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      setCancelling(true)
      setCancelError('')
      const reason = cancelReason.trim()
      const stamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })
      const entry = `Dibatalkan ${stamp}${reason ? `: ${reason}` : ''}`
      const note = cancelTarget.bill.note ? `${cancelTarget.bill.note} | ${entry}` : entry
      const { data, error: updateError } = await getSupabaseClient()
        .from('retribution_bills')
        .update({ status: 'DIBATALKAN', note })
        .eq('id', cancelTarget.bill.id)
        .eq('status', 'AKTIF')
        .select('id')
      if (updateError) throw updateError
      if (!data || data.length === 0) {
        throw new Error('Tagihan sudah berubah (mungkin sudah dibayar atau dibatalkan). Muat ulang halaman.')
      }
      setCancelTarget(null)
      setNotice(`Tagihan ${cancelTarget.code} ${periodLabel(cancelTarget.bill)} dibatalkan.`)
      await loadData()
    } catch (err: any) {
      setCancelError(err?.message || 'Gagal membatalkan tagihan')
    } finally {
      setCancelling(false)
    }
  }

  const annualBillFor = (row: StallSummary): BillRow | null => {
    if (annualPayTypesId == null) return null
    return row.bills.find(
      (bill) =>
        bill.types_id === annualPayTypesId &&
        bill.period_year === year &&
        normalizeStatus(bill.status) !== 'DIBATALKAN'
    ) || null
  }

  const openPeriodPayDialog = (bill: BillRow) => {
    const stall = stallById.get(bill.stall_id)
    const openBills = bills
      .filter(
        (item) =>
          item.stall_id === bill.stall_id &&
          item.types_id === bill.types_id &&
          normalizeStatus(item.status) !== 'DIBATALKAN' &&
          item.outstanding > 0
      )
      .sort((a, b) => `${a.period_start || ''}`.localeCompare(`${b.period_start || ''}`) || a.id - b.id)
    openPayDialog({
      stallId: bill.stall_id,
      code: stall?.code || stall?.number || `Lapak #${bill.stall_id}`,
      ownerName: stall?.owner_id ? owners.get(stall.owner_id) || '-' : '-',
      openBills,
      typesId: bill.types_id
    })
  }

  if (setupMissing) {
    return (
      <div className="page-card">
        <h2>📄 Tagihan</h2>
        <div className="bills-setup-box">
          <strong>Fitur tagihan belum aktif di database.</strong>
          <p>Jalankan <code>migrations/020_retribution_annual_bills.sql</code> lalu <code>migrations/025_retribution_period_bills.sql</code> di SQL Editor Supabase, kemudian muat ulang halaman ini.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-card bills-page">
      <header className="bills-header">
        <div>
          <h2>📄 Tagihan</h2>
          <p>
            {tab === 'annual'
              ? 'Tagihan tahunan (mis. Jaspro) dapat dicicil. Pembayaran dilunasi dari tunggakan terlama lebih dulu.'
              : 'Retribusi harian yang ditagih mingguan atau bulanan per lapak. Pembayaran tetap FIFO dari periode terlama.'}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            className="btn-primary"
            onClick={tab === 'annual' ? openGenerateDialog : openIssueDialog}
          >
            {tab === 'annual' ? 'Terbitkan Tagihan' : 'Terbitkan Periode'}
          </button>
        )}
      </header>

      {error && <div className="bills-error">{error}</div>}
      {notice && <div className="bills-notice">{notice}</div>}

      <div className="bills-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'annual'}
          className={tab === 'annual' ? 'active' : ''}
          onClick={() => setTab('annual')}
        >
          Tahunan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'period'}
          className={tab === 'period' ? 'active' : ''}
          onClick={() => setTab('period')}
        >
          Mingguan / Bulanan
        </button>
      </div>

      {tab === 'annual' ? (
        <>
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
            {annualTypes.map((type) => (
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

      {annualTypes.length === 0 && !loading && (
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
                      <div className="bills-row-actions">
                        {row.totalOutstanding > 0 ? (
                          annualPayTypesId == null && annualTypes.length > 1 ? (
                            <span className="bills-muted" title="Pilih salah satu jenis tahunan di filter Jenis untuk membayar">Pilih jenis</span>
                          ) : (
                            <button type="button" className="btn-secondary bills-pay-btn" onClick={() => openPayDialog({ ...row, typesId: annualPayTypesId })}>
                              {readOnly ? 'Lihat' : 'Bayar'}
                            </button>
                          )
                        ) : (
                          <span className="bills-muted">—</span>
                        )}
                        {(() => {
                          const bill = annualBillFor(row)
                          if (!bill || readOnly) return null
                          const allowed = canCancelBill(bill)
                          return (
                            <button
                              type="button"
                              className="btn-secondary bills-cancel-btn"
                              disabled={!allowed}
                              title={allowed ? 'Batalkan tagihan tahun ini' : cancelBlockReason(bill) || ''}
                              onClick={() => openCancelDialog(bill)}
                            >
                              Batalkan
                            </button>
                          )
                        })()}
                      </div>
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
        </>
      ) : (
        <>
          <div className="bills-card-grid">
            <div className="bills-card">
              <span>Tagihan periode</span>
              <strong>{formatRupiah(periodTotals.due)}</strong>
              <small>{periodTotals.count} tagihan · {periodTotals.stalls} lapak</small>
            </div>
            <div className="bills-card">
              <span>Dibayar</span>
              <strong>{formatRupiah(periodTotals.paid)}</strong>
              <small>Sisa {formatRupiah(periodTotals.outstanding)}</small>
            </div>
            <div className="bills-card alert">
              <span>Belum dibayar</span>
              <strong>{formatRupiah(periodTotals.outstanding)}</strong>
              <small>FIFO dari periode terlama</small>
            </div>
          </div>

          <div className="bills-toolbar">
            <label>
              Jenis
              <select value={periodTypeFilter} onChange={(event) => setPeriodTypeFilter(event.target.value)}>
                <option value="all">Semua jenis periode</option>
                {periodTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}{type.code ? ` (${type.code})` : ''}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={periodStatusFilter} onChange={(event) => setPeriodStatusFilter(event.target.value as typeof periodStatusFilter)}>
                <option value="open">Belum lunas</option>
                <option value="paid">Lunas</option>
                <option value="all">Semua</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </label>
            <label className="bills-search">
              Cari lapak / pemilik
              <input value={periodSearch} onChange={(event) => setPeriodSearch(event.target.value)} placeholder="NGD-0001" />
            </label>
          </div>

          {periodTypes.length === 0 && !loading && (
            <div className="bills-hint">
              Belum ada jenis retribusi non-tahunan untuk pasar ini.
            </div>
          )}

          {loading ? (
            <Loading label="Memuat tagihan periode..." fullHeight={false} />
          ) : periodRows.length === 0 ? (
            <EmptyState
              icon="📅"
              title="Belum ada tagihan periode"
              subtitle={readOnly ? 'Belum ada tagihan untuk filter ini.' : 'Gunakan Terbitkan Periode. Untuk mingguan/bulanan, set irama penagihan pada tarif lapak lebih dulu.'}
            />
          ) : (
            <>
              <div className="bills-table-wrap">
                <table className="bills-table">
                  <thead>
                    <tr>
                      <th>Lapak</th>
                      <th>Pemilik</th>
                      <th>Jenis</th>
                      <th>Periode</th>
                      <th>Jatuh tempo</th>
                      <th className="num">Tagihan</th>
                      <th className="num">Dibayar</th>
                      <th className="num">Sisa</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodPageRows.map((bill) => {
                      const stall = stallById.get(bill.stall_id)
                      const cancelled = normalizeStatus(bill.status) === 'DIBATALKAN'
                      const status = cancelled ? 'DIBATALKAN' : billStatus(bill)
                      return (
                        <tr key={bill.id} className={cancelled ? 'bills-row-cancelled' : undefined}>
                          <td><strong>{stall?.code || stall?.number || `Lapak #${bill.stall_id}`}</strong></td>
                          <td>{stall?.owner_id ? owners.get(stall.owner_id) || '-' : '-'}</td>
                          <td>
                            {typeById.get(bill.types_id)?.name || `Jenis #${bill.types_id}`}
                            <div className="bills-muted">{periodKindLabel(bill.period_kind)}</div>
                          </td>
                          <td>{periodLabel(bill)}</td>
                          <td>{formatDate(bill.due_date)}</td>
                          <td className="num">{formatRupiah(bill.amount_due)}</td>
                          <td className="num">{formatRupiah(bill.amount_paid)}</td>
                          <td className="num"><strong>{formatRupiah(bill.outstanding)}</strong></td>
                          <td>
                            <span className={`bills-badge ${status.toLowerCase()}`}>
                              {status === 'LUNAS' ? 'Lunas' : status === 'CICILAN' ? 'Dicicil' : status === 'DIBATALKAN' ? 'Dibatalkan' : 'Belum bayar'}
                            </span>
                          </td>
                          <td>
                            {cancelled ? (
                              <span className="bills-muted">—</span>
                            ) : (
                              <div className="bills-row-actions">
                                {bill.outstanding > 0 ? (
                                  <button type="button" className="btn-secondary bills-pay-btn" onClick={() => openPeriodPayDialog(bill)}>
                                    {readOnly ? 'Lihat' : 'Bayar'}
                                  </button>
                                ) : (
                                  <span className="bills-muted">—</span>
                                )}
                                {!readOnly && (
                                  <button
                                    type="button"
                                    className="btn-secondary bills-cancel-btn"
                                    disabled={!canCancelBill(bill)}
                                    title={canCancelBill(bill) ? 'Batalkan tagihan periode ini' : cancelBlockReason(bill) || ''}
                                    onClick={() => openCancelDialog(bill)}
                                  >
                                    Batalkan
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bills-pagination">
                <span>Menampilkan {(safePeriodPage - 1) * periodPageSize + 1}-{Math.min(safePeriodPage * periodPageSize, periodRows.length)} dari {periodRows.length} tagihan</span>
                <div>
                  <button type="button" className="btn-secondary" disabled={safePeriodPage === 1} onClick={() => setPeriodPage((value) => Math.max(1, value - 1))}>← Sebelumnya</button>
                  <span className="bills-page-indicator">Halaman {safePeriodPage}/{periodTotalPages}</span>
                  <button type="button" className="btn-secondary" disabled={safePeriodPage === periodTotalPages} onClick={() => setPeriodPage((value) => Math.min(periodTotalPages, value + 1))}>Selanjutnya →</button>
                </div>
              </div>
            </>
          )}
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
                {annualTypes.map((type) => (
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

      {issueOpen && (
        <div className="bills-modal-backdrop" role="presentation" onClick={() => !issuing && setIssueOpen(false)}>
          <div className="bills-modal" role="dialog" aria-modal="true" aria-labelledby="issue-bills-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="issue-bills-title">Terbitkan Tagihan Periode</h3>
            <p>Irama penagihan diambil dari tarif tiap lapak. Periode yang sudah tertagih tidak diduplikasi.</p>
            <label>Jenis
              <select value={issueType} onChange={(event) => setIssueType(event.target.value)} disabled={periodTypes.length === 0}>
                <option value="">-- Pilih jenis --</option>
                {periodTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}{type.code ? ` (${type.code})` : ''}</option>
                ))}
              </select>
            </label>
            <label>Mode
              <select value={issueMode} onChange={(event) => setIssueMode(event.target.value as 'current' | 'range')}>
                <option value="current">Periode berjalan (mingguan/bulanan)</option>
                <option value="range">Rentang tanggal tertentu</option>
              </select>
            </label>
            {issueMode === 'current' ? (
              <div className="bills-hint">
                Hanya lapak yang tarifnya diset Mingguan atau Bulanan. Hari/bulan mulai mengikuti anchor
                masing-masing lapak.
              </div>
            ) : (
              <>
                <div className="bills-field-row">
                  <label>Mulai
                    <input type="date" value={issueStart} onChange={(event) => setIssueStart(event.target.value)} />
                  </label>
                  <label>Akhir
                    <input type="date" value={issueEnd} onChange={(event) => setIssueEnd(event.target.value)} />
                  </label>
                </div>
                <label>Kode lapak (opsional)
                  <input value={issueStall} onChange={(event) => setIssueStall(event.target.value)} placeholder="Kosongkan untuk semua lapak" />
                </label>
                <div className="bills-field-row">
                  <label>Jatuh tempo
                    <input type="date" value={issueDue} onChange={(event) => setIssueDue(event.target.value)} />
                  </label>
                  <label>Catatan
                    <input value={issueNote} onChange={(event) => setIssueNote(event.target.value)} placeholder="Opsional" />
                  </label>
                </div>
                <div className="bills-hint">
                  Maksimal 31 hari. Bila kode lapak dikosongkan, semua lapak aktif yang punya tarif jenis
                  ini ditagih — termasuk yang iramanya harian.
                </div>
              </>
            )}
            {issueError && <div className="bills-error">{issueError}</div>}
            <div className="bills-modal-actions">
              <button type="button" className="btn-secondary" disabled={issuing} onClick={() => setIssueOpen(false)}>Batal</button>
              <button type="button" className="btn-primary" disabled={issuing || periodTypes.length === 0} onClick={handleIssue}>
                {issuing ? 'Menerbitkan...' : 'Terbitkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="bills-modal-backdrop" role="presentation" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="bills-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-bill-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="cancel-bill-title">Batalkan Tagihan</h3>
            <p>
              Tagihan <strong>{cancelTarget.code}</strong> · {periodLabel(cancelTarget.bill)} ·{' '}
              {formatRupiah(cancelTarget.bill.amount_due)}
            </p>
            <div className="bills-cancel-summary">
              <div>
                <span>Jenis</span>
                <strong>{typeById.get(cancelTarget.bill.types_id)?.name || `Jenis #${cancelTarget.bill.types_id}`}</strong>
              </div>
              <div>
                <span>Jatuh tempo</span>
                <strong>{formatDate(cancelTarget.bill.due_date)}</strong>
              </div>
              <div>
                <span>Dibayar</span>
                <strong>{formatRupiah(cancelTarget.bill.amount_paid)}</strong>
              </div>
            </div>
            <label>Alasan (opsional)
              <input
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Mis. salah periode / dobel dengan tagihan sebelumnya"
                maxLength={160}
              />
            </label>
            <div className="bills-hint">
              Tagihan yang dibatalkan tidak dihitung sebagai tunggakan dan tidak menghalangi penerbitan
              periode baru. Hanya tagihan tanpa pembayaran yang bisa dibatalkan, dan tagihan periode
              berjalan dikecualikan karena akan diterbitkan ulang otomatis oleh cron — ubah irama tarif
              ke Harian lebih dulu bila tagihan itu memang keliru.
            </div>
            {cancelError && <div className="bills-error">{cancelError}</div>}
            <div className="bills-modal-actions">
              <button type="button" className="btn-secondary" disabled={cancelling} onClick={() => setCancelTarget(null)}>Batal</button>
              <button type="button" className="btn-primary bills-confirm-cancel" disabled={cancelling} onClick={handleCancel}>
                {cancelling ? 'Membatalkan...' : 'Batalkan Tagihan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {payTarget && (
        <div className="bills-modal-backdrop" role="presentation" onClick={() => !paying && setPayTarget(null)}>
          <div className="bills-modal bills-modal-wide" role="dialog" aria-modal="true" aria-labelledby="pay-bills-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="pay-bills-title">Bayar Tagihan {payTarget.code}</h3>
            <p>Pembayaran dialokasikan otomatis dari tagihan terlama lebih dulu (berdasarkan periode).</p>

            <table className="bills-mini-table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th className="num">Tagihan</th>
                  <th className="num">Dibayar</th>
                  <th className="num">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {payTarget.openBills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{periodLabel(bill)}</td>
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
