import { createClient } from '@supabase/supabase-js'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 60
const hits = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: any) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || String(req.socket?.remoteAddress || 'unknown')
}

function isRateLimited(ip: string) {
  const now = Date.now()
  if (hits.size > 5000) hits.clear()
  const current = hits.get(ip)
  if (!current || current.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > MAX_REQUESTS
}

const PAGE_SIZE = 1000

async function fetchAllPaidTransactions(supabaseAdmin: any, stallId: number) {
  const rows: any[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('amount, payment_method, created_at, transaction_date, status, bill_id, period_year, rate_id')
      .eq('stall_id', stallId)
      .in('status', ['paid', 'PAID', 'LUNAS', 'lunas'])
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })

  if (isRateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan, coba lagi nanti' })
  }

  const token = String(req.query?.token || req.body?.token || '').trim()
  const marketId = Number(req.query?.marketId ?? req.body?.marketId)
  const stallCode = String(req.query?.code || req.body?.code || '').trim()
  const pin = String(req.query?.pin ?? req.body?.pin ?? '').trim()

  const usingToken = Boolean(token)
  if (usingToken && !/^[a-f0-9]{32}$/i.test(token)) {
    return res.status(400).json({ error: 'Token lapak tidak valid' })
  }
  if (!usingToken && (!Number.isInteger(marketId) || marketId <= 0 || !stallCode)) {
    return res.status(400).json({ error: 'Token lapak atau pasangan pasar+kode wajib diisi' })
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let stallQuery = supabaseAdmin
      .from('stalls')
      .select('id, market_id, code, number, qr_code, status, sector_id, owner_id')

    stallQuery = usingToken
      ? stallQuery.eq('public_token', token)
      : stallQuery.eq('market_id', marketId).ilike('code', stallCode)

    const { data: stall, error: stallError } = await stallQuery.maybeSingle()

    if (stallError) throw stallError
    if (!stall) return res.status(404).json({ error: 'Lapak tidak ditemukan' })

    if (!pin) return res.status(401).json({ error: 'PIN lapak wajib diisi' })

    const { data: pinOk, error: pinError } = await supabaseAdmin.rpc('verify_stall_pin', {
      p_stall_id: stall.id,
      p_pin: pin
    })

    if (pinError) {
      const message = String(pinError.message || '')
      if (/does not exist|could not find the function|schema cache/i.test(message)) {
        return res.status(503).json({ error: 'Fitur PIN lapak belum aktif di server' })
      }
      throw pinError
    }
    if (!pinOk) return res.status(401).json({ error: 'PIN salah' })

    const { data: market, error: marketError } = await supabaseAdmin
      .from('markets')
      .select('id, name, code, city, address, street, street_number, kecamatan, province, postal_code, photo_url, status')
      .eq('id', stall.market_id)
      .maybeSingle()

    if (marketError) throw marketError
    if (!market) return res.status(404).json({ error: 'Pasar tidak ditemukan' })

    const [{ data: sector }, { data: owner }, { data: rates, error: ratesError }] = await Promise.all([
      stall.sector_id
        ? supabaseAdmin.from('market_sectors').select('name').eq('id', stall.sector_id).maybeSingle()
        : Promise.resolve({ data: null }),
      stall.owner_id
        ? supabaseAdmin.from('stall_owners').select('name').eq('id', stall.owner_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from('retribution_rates')
        .select('id, amount, types_id, retribution_types(name, unit)')
        .eq('stall_id', stall.id)
        .order('id')
    ])

    if (ratesError) throw ratesError

    const paidTransactions = await fetchAllPaidTransactions(supabaseAdmin, stall.id)

    let billRows: any[] = []
    const { data: billData, error: billsError } = await supabaseAdmin
      .from('retribution_bill_balances')
      .select('id, types_id, period_year, amount_due, amount_paid, outstanding, status, due_date, is_open')
      .eq('stall_id', stall.id)
      .order('period_year', { ascending: true })

    if (billsError) {
      const message = String(billsError.message || '')
      if (!/does not exist|could not find|schema cache/i.test(message)) throw billsError
    } else {
      billRows = billData || []
    }

    const typeIds = Array.from(new Set([
      ...(rates || []).map((rate: any) => Number(rate.types_id)).filter(Boolean),
      ...billRows.map((bill: any) => Number(bill.types_id)).filter(Boolean)
    ]))
    let typeRows: any[] = []
    if (typeIds.length > 0) {
      const { data: typeData, error: typeError } = await supabaseAdmin
        .from('retribution_types')
        .select('id, name, unit, billing_period')
        .in('id', typeIds)
      if (typeError) throw typeError
      typeRows = typeData || []
    }
    const typeById = new Map(typeRows.map((type: any) => [Number(type.id), type]))

    const rateUnit = (rate: any) => {
      const embedded = Array.isArray(rate.retribution_types) ? rate.retribution_types[0] : rate.retribution_types
      return String(embedded?.unit || typeById.get(Number(rate.types_id))?.unit || '').toUpperCase()
    }

    const timeOf = (value: string | null | undefined) => (value ? new Date(value).getTime() : 0)
    const paidSorted = [...paidTransactions].sort(
      (a, b) => timeOf(b.transaction_date || b.created_at) - timeOf(a.transaction_date || a.created_at)
    )
    const totalPaid = paidSorted.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const lastPaidAt = paidSorted.length ? (paidSorted[0].transaction_date || paidSorted[0].created_at) : null

    const witaNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const witaStartMs = Date.UTC(witaNow.getUTCFullYear(), witaNow.getUTCMonth(), witaNow.getUTCDate()) - 8 * 60 * 60 * 1000
    const witaEndMs = witaStartMs + 24 * 60 * 60 * 1000
    const witaDate = witaNow.toISOString().slice(0, 10)

    const todayTransactions = paidSorted.filter((tx) => {
      const time = timeOf(tx.transaction_date || tx.created_at)
      return time >= witaStartMs && time < witaEndMs
    })
    const todayAmount = todayTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

    const dailyRates = (rates || []).filter((rate: any) => rateUnit(rate) === 'HARI')
    const dailyDue = dailyRates.reduce((sum: number, rate: any) => sum + Number(rate.amount || 0), 0)
    const dailyRateIds = new Set(dailyRates.map((rate: any) => Number(rate.id)).filter(Boolean))
    const dailyPaidToday = todayTransactions.some(
      (tx) =>
        (tx.rate_id != null && dailyRateIds.has(Number(tx.rate_id))) ||
        (dailyDue > 0 && Number(tx.amount || 0) >= dailyDue)
    )
    const todayStatus = dailyRates.length === 0 ? 'TIDAK_ADA_TARIF' : dailyPaidToday ? 'SUDAH' : 'BELUM'

    const installmentsByBill = new Map<number, any[]>()
    for (const tx of paidSorted) {
      if (tx.bill_id == null) continue
      const billId = Number(tx.bill_id)
      const list = installmentsByBill.get(billId) || []
      list.push({
        amount: Number(tx.amount || 0),
        payment_method: tx.payment_method || null,
        date: tx.transaction_date || tx.created_at
      })
      installmentsByBill.set(billId, list)
    }

    const bills = billRows.map((bill: any) => ({
      bill_id: Number(bill.id),
      period_year: Number(bill.period_year),
      type_name: typeById.get(Number(bill.types_id))?.name || 'Tagihan tahunan',
      amount_due: Number(bill.amount_due || 0),
      amount_paid: Number(bill.amount_paid || 0),
      outstanding: Number(bill.outstanding || 0),
      status: bill.status,
      due_date: bill.due_date,
      installments: (installmentsByBill.get(Number(bill.id)) || []).sort((a, b) => timeOf(a.date) - timeOf(b.date))
    }))
    const billsOutstanding = bills.reduce(
      (sum, bill) => sum + (bill.status === 'DIBATALKAN' ? 0 : bill.outstanding),
      0
    )

    const publicAddress = market.address?.startsWith('Belum ditemukan data lokasi') ? null : market.address
    const cleanPart = (value: string | null) => value?.trim().replace(/^[,\s]+|[,\s]+$/g, '') || null
    const structuredAddress = [
      [cleanPart(market.street), cleanPart(market.street_number)].filter(Boolean).join(' '),
      cleanPart(market.kecamatan) ? `Kecamatan ${cleanPart(market.kecamatan)}` : null,
      cleanPart(market.city),
      cleanPart(market.province),
      cleanPart(market.postal_code)
    ].filter(Boolean).join(', ')

    return res.json({
      market: { ...market, address: structuredAddress || publicAddress },
      stall: {
        code: stall.code,
        number: stall.number,
        status: stall.status,
        sector_name: sector?.name || null,
        owner_name: owner?.name || null,
        rates: (rates || []).map((rate: any) => ({
          amount: rate.amount,
          name: Array.isArray(rate.retribution_types) ? rate.retribution_types[0]?.name : rate.retribution_types?.name,
          unit: Array.isArray(rate.retribution_types) ? rate.retribution_types[0]?.unit : rate.retribution_types?.unit
        })),
        transactions: paidSorted.slice(0, 50).map((tx: any) => ({
          amount: tx.amount,
          payment_method: tx.payment_method,
          created_at: tx.created_at,
          transaction_date: tx.transaction_date,
          status: tx.status,
          bill_id: tx.bill_id,
          period_year: tx.period_year
        }))
      },
      summary: {
        total_paid: totalPaid,
        paid_count: paidSorted.length,
        last_paid_at: lastPaidAt,
        today: {
          date: witaDate,
          amount: todayAmount,
          count: todayTransactions.length,
          daily_due: dailyDue,
          status: todayStatus
        },
        bills_outstanding: billsOutstanding,
        bills_count: bills.length
      },
      bills
    })
  } catch (error) {
    console.error('Public stall lookup failed:', error)
    return res.status(500).json({ error: 'Gagal memuat data lapak' })
  }
}
