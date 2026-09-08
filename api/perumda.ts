import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const TOKEN_TTL = '1h'
const PAGE_SIZE = 1000

type QueryBuilder = {
  range: (from: number, to: number) => Promise<{ data: any[] | null; error: any }>
}

function getSecret() {
  return process.env.PERUMDA_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function cleanEnvironmentValue(value?: string) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '')
}

async function fetchAll(
  supabaseAdmin: any,
  table: string,
  select: string,
  configure?: (query: any) => QueryBuilder
) {
  const rows: any[] = []
  let page = 0

  while (true) {
    const baseQuery = supabaseAdmin.from(table).select(select)
    const query = configure ? configure(baseQuery) : baseQuery
    const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) return rows
    page += 1
  }
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
    const validPin = configuredPinHash
      ? await bcrypt.compare(submittedPin, configuredPinHash)
      : Boolean(configuredPin && submittedPin === configuredPin)
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
    const endDate = `${to}T23:59:59.999Z`
    const [markets, stalls, transactions, deposits] = await Promise.all([
      fetchAll(supabaseAdmin, 'markets', 'id, name, status'),
      fetchAll(supabaseAdmin, 'stalls', 'id, market_id, status'),
      fetchAll(supabaseAdmin, 'transactions', 'id, market_id, amount, status, transaction_date, created_at', (query) =>
        query.gte('transaction_date', from).lte('transaction_date', to)
      ),
      fetchAll(supabaseAdmin, 'setoran', 'id, market_id, total_amount, status, created_at', (query) =>
        query.gte('created_at', `${from}T00:00:00.000Z`).lte('created_at', endDate)
      )
    ])

    const paidTransactions = transactions.filter((transaction) => String(transaction.status).toLowerCase() === 'paid')
    const marketReports = markets.map((market) => {
      const marketStalls = stalls.filter((stall) => String(stall.market_id) === String(market.id))
      const marketTransactions = paidTransactions.filter((transaction) => String(transaction.market_id) === String(market.id))
      const marketDeposits = deposits.filter((deposit) => String(deposit.market_id) === String(market.id))
      const revenue = marketTransactions.reduce((sum, transaction) => sum + numberValue(transaction.amount), 0)
      const deposited = marketDeposits
        .filter((deposit) => String(deposit.status).toLowerCase() === 'approved')
        .reduce((sum, deposit) => sum + numberValue(deposit.total_amount), 0)

      return {
        id: market.id,
        name: market.name,
        status: market.status,
        stallCount: marketStalls.length,
        activeStallCount: marketStalls.filter((stall) => String(stall.status).toLowerCase() === 'active').length,
        transactionCount: marketTransactions.length,
        revenue,
        deposited,
        pendingDepositCount: marketDeposits.filter((deposit) => String(deposit.status).toLowerCase() !== 'approved').length
      }
    })

    return res.json({
      period: { from, to },
      summary: {
        marketCount: marketReports.length,
        stallCount: stalls.length,
        transactionCount: paidTransactions.length,
        revenue: paidTransactions.reduce((sum, transaction) => sum + numberValue(transaction.amount), 0),
        deposited: deposits
          .filter((deposit) => String(deposit.status).toLowerCase() === 'approved')
          .reduce((sum, deposit) => sum + numberValue(deposit.total_amount), 0),
        pendingDepositCount: deposits.filter((deposit) => String(deposit.status).toLowerCase() !== 'approved').length
      },
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
