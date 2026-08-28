import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const marketId = Number(req.body?.marketId)
  const stallCode = String(req.body?.code || '').trim()
  const pin = String(req.body?.pin || '')
  const expectedPin = process.env.PUBLIC_STALL_PIN || '1234'
  if (pin !== expectedPin) return res.status(401).json({ error: 'PIN tidak valid' })
  if (!Number.isInteger(marketId) || marketId <= 0 || !stallCode) {
    return res.status(400).json({ error: 'Market ID dan kode lapak wajib diisi' })
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: market, error: marketError } = await supabaseAdmin
      .from('markets')
      .select('id, name, code, city, address, photo_url, status')
      .eq('id', marketId)
      .maybeSingle()

    if (marketError) throw marketError
    if (!market) return res.status(404).json({ error: 'Pasar tidak ditemukan' })

    const { data: stall, error: stallError } = await supabaseAdmin
      .from('stalls')
      .select('id, market_id, code, number, qr_code, status, sector_id, owner_id')
      .eq('market_id', marketId)
      .ilike('code', stallCode)
      .maybeSingle()

    if (stallError) throw stallError
    if (!stall) return res.status(404).json({ error: 'Lapak tidak ditemukan' })

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

    return res.json({
      market,
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
