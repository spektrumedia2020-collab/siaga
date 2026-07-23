import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const { data: market, error } = await supabase
        .from('markets')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return res.json(market || null)
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Market not found' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { data, error } = await supabase
        .from('markets')
        .update(req.body)
        .eq('id', id)
        .select()
      if (error) throw error
      return res.json(data?.[0])
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update market' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}