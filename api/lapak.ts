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

    const { data: market, error: marketError } = await supabaseAdmin
      .from('markets')
      .select('id, name, code, city, address, street, street_number, kecamatan, province, postal_code, photo_url, status')
      .eq('id', stall.market_id)
      .maybeSingle()

    if (marketError) throw marketError
    if (!market) return res.status(404).json({ error: 'Pasar tidak ditemukan' })

    const [{ data: sector }, { data: owner }, { data: rates, error: ratesError }, { data: transactions, error: transactionsError }] = await Promise.all([
      stall.sector_id
        ? supabaseAdmin.from('market_sectors').select('name').eq('id', stall.sector_id).maybeSingle()
        : Promise.resolve({ data: null }),
      stall.owner_id
        ? supabaseAdmin.from('stall_owners').select('name').eq('id', stall.owner_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin
        .from('retribution_rates')
        .select('amount, types_id, retribution_types(name, unit)')
        .eq('stall_id', stall.id)
        .order('id'),
      supabaseAdmin
        .from('transactions')
        .select('amount, payment_method, created_at, transaction_date, status')
        .eq('stall_id', stall.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    if (ratesError) throw ratesError
    if (transactionsError) throw transactionsError

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
        transactions: transactions || []
      }
    })
  } catch (error) {
    console.error('Public stall lookup failed:', error)
    return res.status(500).json({ error: 'Gagal memuat data lapak' })
  }
}
