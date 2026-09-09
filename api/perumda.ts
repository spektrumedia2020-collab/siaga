import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const TOKEN_TTL = '1h'

type DailyTrend = {
  date: string
  transactions: number
  revenue: number
}

type MarketRow = {
  id: string | number
  name?: string
  status?: string | null
}

type StallRow = {
  id: string | number
  market_id?: string | number | null
  status?: string | null
}

type TransactionRow = {
  id?: string | number
  market_id?: string | number | null
  stall_id?: string | number | null
  amount?: number | string | null
  status?: string | null
  transaction_date?: string | null
  created_at?: string | null
}

type DepositRow = {
  id?: string | number
  market_id?: string | number | null
  total_amount?: number | string | null
  status?: string | null
  created_at?: string | null
}

function getSecret() {
  return process.env.PERUMDA_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function cleanEnvironmentValue(value?: string) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '')
}

function getToken(req: any) {
  const header = String(req.headers?.authorization || '')
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

function verifyToken(req: any) {
  const secret = getSecret()
  if (!secret) throw new Error('PERUMDA_JWT_SECRET belum dikonfigurasi')
  return jwt.verify(getToken(req), secret)
}

function numberValue(value: unknown) {
  return Number(value || 0)
}

function normalizeDate(value: unknown) {
  return String(value || '').slice(0, 10)
}

async function fetchRangeRows<T>(
  supabaseAdmin: any,
  table: string,
  select: string,
  dateField: string,
  from: string,
  to: string
): Promise<T[]> {
  const query = supabaseAdmin.from(table).select(select)
  const { data, error } = await query.gte(dateField, from).lte(dateField, to)
  if (error) throw error
  return (data || []) as T[]
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function getPreviousPeriodRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const rangeLength = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
  const previousEnd = addDays(from, -1)
  const previousStart = addDays(previousEnd, -(rangeLength - 1))

  return { from: previousStart, to: previousEnd }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })

  const secret = getSecret()
  if (!secret) return res.status(500).json({ error: 'Konfigurasi keamanan Perumda belum tersedia' })

  if (req.method === 'POST') {
    const submittedPin = String(req.body?.pin || '')
    const configuredPin = cleanEnvironmentValue(process.env.PERUMDA_PIN)
    const configuredPinHash = cleanEnvironmentValue(process.env.PERUMDA_PIN_HASH)
    const validPin = configuredPin
      ? submittedPin === configuredPin
      : configuredPinHash
        ? await bcrypt.compare(submittedPin, configuredPinHash)
        : false
    if ((!configuredPin && !configuredPinHash) || !/^\d{6}$/.test(submittedPin) || !validPin) {
      return res.status(401).json({ error: 'PIN tidak valid' })
    }

    const token = jwt.sign({ scope: 'perumda-report' }, secret, { expiresIn: TOKEN_TTL })
    return res.json({ token, expiresIn: 3600 })
  }

  try {
    verifyToken(req)
    const from = String(req.query?.from || '')
    const to = String(req.query?.to || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'Periode laporan tidak valid' })
    }
    if (from > to) return res.status(400).json({ error: 'Tanggal mulai melebihi tanggal akhir' })

    const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const previousPeriod = getPreviousPeriodRange(from, to)

    const [marketsResult, stallsResult, currentTransactions, previousTransactions, currentDeposits] = await Promise.all([
      supabaseAdmin.from('markets').select('id, name, status'),
      supabaseAdmin.from('stalls').select('id, market_id, status'),
      fetchRangeRows<TransactionRow>(supabaseAdmin, 'transactions', 'id, market_id, stall_id, amount, status, transaction_date, created_at', 'transaction_date', from, to),
      fetchRangeRows<TransactionRow>(supabaseAdmin, 'transactions', 'id, market_id, stall_id, amount, status, transaction_date, created_at', 'transaction_date', previousPeriod.from, previousPeriod.to),
      fetchRangeRows<DepositRow>(supabaseAdmin, 'setoran', 'id, market_id, total_amount, status, created_at', 'created_at', `${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`)
    ])

    const markets: MarketRow[] = (marketsResult.data || []) as MarketRow[]
    const stalls: StallRow[] = (stallsResult.data || []) as StallRow[]

    if (marketsResult.error) throw marketsResult.error
    if (stallsResult.error) throw stallsResult.error

    const paidTransactions = currentTransactions.filter((transaction) => String(transaction.status).toLowerCase() === 'paid')
    const paidPreviousTransactions = previousTransactions.filter((transaction) => String(transaction.status).toLowerCase() === 'paid')

    const dailyTrendMap = new Map<string, DailyTrend>()
    paidTransactions.forEach((transaction) => {
      const date = normalizeDate(transaction.transaction_date || transaction.created_at)
      if (!date) return
      const current = dailyTrendMap.get(date) || { date, transactions: 0, revenue: 0 }
      current.transactions += 1
      current.revenue += numberValue(transaction.amount)
      dailyTrendMap.set(date, current)
    })

    const totalRevenue = paidTransactions.reduce((sum, transaction) => sum + numberValue(transaction.amount), 0)
    const previousRevenue = paidPreviousTransactions.reduce((sum, transaction) => sum + numberValue(transaction.amount), 0)
    const approvedDeposits = currentDeposits
      .filter((deposit) => String(deposit.status).toLowerCase() === 'approved')
      .reduce((sum, deposit) => sum + numberValue(deposit.total_amount), 0)

    const activeStalls = stalls.filter((stall) => String(stall.status).toLowerCase() === 'active')
    const activeStallCount = activeStalls.length
    const touchedStallIds = new Set(
      paidTransactions
        .map((transaction) => transaction.stall_id)
        .filter((stallId) => stallId !== null && stallId !== undefined && stallId !== '')
        .map((stallId) => String(stallId))
    )
    const touchedStallCount = touchedStallIds.size
    const collectionCoverage = activeStallCount > 0 ? (touchedStallCount / activeStallCount) * 100 : 0
    const pendingDepositCount = currentDeposits.filter((deposit) => String(deposit.status).toLowerCase() !== 'approved').length
    const unsettledBalance = totalRevenue - approvedDeposits
    const revenueDelta = totalRevenue - previousRevenue
    const revenueDeltaPercent = previousRevenue > 0 ? (revenueDelta / previousRevenue) * 100 : 0

    const marketReports = markets.map((market) => {
      const marketStalls = stalls.filter((stall) => String(stall.market_id) === String(market.id))
      const marketActiveStalls = marketStalls.filter((stall) => String(stall.status).toLowerCase() === 'active')
      const marketTransactions = paidTransactions.filter((transaction) => String(transaction.market_id) === String(market.id))
      const marketDeposits = currentDeposits.filter((deposit) => String(deposit.market_id) === String(market.id))
      const revenue = marketTransactions.reduce((sum, transaction) => sum + numberValue(transaction.amount), 0)
      const deposited = marketDeposits
        .filter((deposit) => String(deposit.status).toLowerCase() === 'approved')
        .reduce((sum, deposit) => sum + numberValue(deposit.total_amount), 0)
      const touchedStallIdsForMarket = new Set(
        marketTransactions
          .map((transaction) => transaction.stall_id)
          .filter((stallId) => stallId !== null && stallId !== undefined && stallId !== '')
          .map((stallId) => String(stallId))
      )

      return {
        id: market.id,
        name: market.name,
        status: market.status,
        stallCount: marketStalls.length,
        activeStallCount: marketActiveStalls.length,
        touchedStallCount: touchedStallIdsForMarket.size,
        transactionCount: marketTransactions.length,
        revenue,
        revenueShare: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        averageTransaction: marketTransactions.length > 0 ? revenue / marketTransactions.length : 0,
        deposited,
        collectionRate: revenue > 0 ? (deposited / revenue) * 100 : 0,
        collectionCoverage: marketActiveStalls.length > 0 ? (touchedStallIdsForMarket.size / marketActiveStalls.length) * 100 : 0,
        unsettledBalance: revenue - deposited,
        pendingDepositCount: marketDeposits.filter((deposit) => String(deposit.status).toLowerCase() !== 'approved').length
      }
    })

    const alerts = [] as Array<{ level: string; title: string; message: string }>
    if (pendingDepositCount > 0) {
      alerts.push({
        level: 'warning',
        title: 'Setoran belum selesai',
        message: `${pendingDepositCount} catatan setoran masih menunggu persetujuan.`
      })
    }
    if (collectionCoverage < 80) {
      alerts.push({
        level: 'info',
        title: 'Cakupan penarikan rendah',
        message: `Hanya ${collectionCoverage.toFixed(1)}% lapak aktif yang tercatat menarik retribusi pada periode ini.`
      })
    }
    if (revenueDeltaPercent < -10) {
      alerts.push({
        level: 'danger',
        title: 'Pendapatan turun signifikan',
        message: `Pendapatan turun ${Math.abs(revenueDeltaPercent).toFixed(1)}% dibanding periode sebelumnya.`
      })
    }
    if (alerts.length === 0) {
      alerts.push({
        level: 'success',
        title: 'Semua indikator sehat',
        message: 'Tidak ada anomali operasional yang terdeteksi pada periode ini.'
      })
    }

    return res.json({
      period: { from, to },
      previousPeriod,
      summary: {
        marketCount: marketReports.length,
        stallCount: stalls.length,
        activeStallCount,
        touchedStallCount,
        transactionCount: paidTransactions.length,
        revenue: totalRevenue,
        averageTransaction: paidTransactions.length > 0 ? totalRevenue / paidTransactions.length : 0,
        deposited: approvedDeposits,
        collectionRate: totalRevenue > 0 ? (approvedDeposits / totalRevenue) * 100 : 0,
        collectionCoverage,
        unsettledBalance,
        pendingDepositCount,
        previousRevenue,
        revenueDelta,
        revenueDeltaPercent,
        alerts
      },
      dailyTrend: Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      markets: marketReports.sort((a, b) => b.revenue - a.revenue)
    })
  } catch (error: any) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesi Perumda sudah berakhir' })
    }
    console.error('Perumda report failed:', error)
    return res.status(500).json({ error: 'Gagal memuat laporan Perumda' })
  }
}
