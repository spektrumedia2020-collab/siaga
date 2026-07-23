import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get officers by market
router.get('/market/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('market_id', marketId)
      .order('name')

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching officers:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create officer
router.post('/', async (req, res) => {
  try {
    const { code, name, phone, market_id } = req.body

    if (!code || !name || !market_id) {
      return res.status(400).json({ error: 'Code, name, and market_id are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{ code, name, phone, market_id, status: 'AKTIF' }])
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating officer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router