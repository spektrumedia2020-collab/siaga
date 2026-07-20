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

  // GET - List all markets or get single market
  if (req.method === 'GET') {
    const marketId = req.query?.id
    
    if (marketId) {
      // Get single market
      try {
        const { data: market, error } = await supabase
          .from('markets')
          .select('*')
          .eq('id', marketId)
          .single()
        
        if (error) throw error
        return res.json(market || null)
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Market not found' })
      }
    }
    
    // Get all markets
    try {
      const { data: markets, error } = await supabase
        .from('markets')
        .select('*')
        .order('name')
      
      if (error) throw error
      return res.json(markets || [])
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal server error' })
    }
  }

  // GET with path param /api/markets/16
  if (req.method === 'GET' && req.query?.marketId) {
    try {
      const { data: market, error } = await supabase
        .from('markets')
        .select('*')
        .eq('id', req.query.marketId)
        .single()
      
      if (error) throw error
      return res.json(market || null)
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Market not found' })
    }
  }

  // POST - Create market
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

  // PUT - Update market
  if (req.method === 'PUT') {
    const marketId = req.query?.id || req.query?.marketId
    const { name, code, city, address, photo_url, head_photo_url, status } = req.body || {}
    
    try {
      const { data, error } = await supabase
        .from('markets')
        .update({ name, code, city, address, photo_url, head_photo_url, status })
        .eq('id', marketId)
        .select()
      if (error) throw error
      return res.json(data?.[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update market' })
    }
  }

  // DELETE - Delete market
  if (req.method === 'DELETE') {
    const marketId = req.query?.id || req.query?.marketId
    
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