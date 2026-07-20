import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get stalls by market
router.get('/market/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params
    const { data, error } = await supabaseAdmin
      .from('stalls')
      .select(`
        *,
        stall_owners (id, name, nik),
        stall_categories (id, name)
      `)
      .eq('market_id', marketId)
      .order('number')

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching stalls:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create stall
router.post('/', async (req, res) => {
  try {
    const { code, number, market_id, sector_id, owner_id, category_id, status } = req.body

    if (!code || !number || !market_id) {
      return res.status(400).json({ error: 'Code, number, and market_id are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('stalls')
      .insert([{ code, number, market_id, sector_id, owner_id, category_id, status }])
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating stall:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router