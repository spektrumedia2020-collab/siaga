import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // GET - List all markets
  if (req.method === 'GET') {
    try {
      const { data: markets, error } = await supabase
        .from('markets')
        .select('*, officers(id, name, user_id, photo_url)')
        .order('name')
      
      if (error) throw error
      
      // Process head info
      const processedMarkets = (markets || []).map((m: any) => ({
        ...m,
        head_user_id: m.officers?.[0]?.user_id || null,
        head_name: m.officers?.[0]?.name || null,
        head_photo_url: m.officers?.[0]?.photo_url || null
      }))
      
      return res.json(processedMarkets)
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal server error' })
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
    const { id } = req.query || {}
    const { name, code, city, address, photo_url, head_photo_url, status } = req.body || {}
    
    try {
      const { data, error } = await supabase
        .from('markets')
        .update({ name, code, city, address, photo_url, head_photo_url, status })
        .eq('id', id)
        .select()
      
      if (error) throw error
      return res.json(data?.[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update market' })
    }
  }

  // DELETE - Delete market
  if (req.method === 'DELETE') {
    const { id } = req.query || {}
    
    try {
      const { error } = await supabase.from('markets').delete().eq('id', id)
      if (error) throw error
      return res.json({ success: true })
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete market' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}