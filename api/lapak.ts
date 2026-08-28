import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const marketId = Number(req.query?.marketId)
  const stallCode = String(req.query?.code || '').trim()
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

    const [{ data: sector }, { data: owner }] = await Promise.all([
      stall.sector_id
        ? supabaseAdmin.from('market_sectors').select('name').eq('id', stall.sector_id).maybeSingle()
        : Promise.resolve({ data: null }),
      stall.owner_id
        ? supabaseAdmin.from('stall_owners').select('name').eq('id', stall.owner_id).maybeSingle()
        : Promise.resolve({ data: null })
    ])

    return res.json({
      market,
      stall: {
        code: stall.code,
        number: stall.number,
        status: stall.status,
        sector_name: sector?.name || null,
        owner_name: owner?.name || null
      }
    })
  } catch (error) {
    console.error('Public stall lookup failed:', error)
    return res.status(500).json({ error: 'Gagal memuat data lapak' })
  }
}
