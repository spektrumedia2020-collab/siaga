import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const marketId = req.query?.id

  if (req.method === 'GET') {
    try {
      if (marketId && marketId !== 'undefined') {
        const { data: market, error } = await supabase
          .from('markets')
          .select('*')
          .eq('id', marketId)
          .single()
        
        if (error) throw error
        return res.json(market || null)
      }
      
      const { data: markets, error } = await supabase
        .from('markets')
        .select('*')
        .order('name')
      
      if (error) throw error
      return res.json(markets || [])
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error fetching market' })
    }
  }

  if (req.method === 'POST') {
    const { name, code, city, address, photo_url, head_photo_url, status } = req.body || {}
    
    try {
      const { data, error } = await supabase
        .from('markets')
        .insert([{ name, code, city, address, photo_url, head_photo_url, status }])
        .select()
      if (error) throw error
      return res.status(201).json(data?.[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to create market' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { data, error } = await supabase
        .from('markets')
        .update(req.body)
        .eq('id', marketId)
        .select()
      if (error) throw error
      return res.json(data?.[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update market' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase.from('markets').delete().eq('id', marketId)
      if (error) throw error
      return res.json({ success: true })
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete market' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}