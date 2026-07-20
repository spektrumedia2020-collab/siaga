import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get transactions by market
router.get('/market/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        *,
        stalls (id, code, number, market_id)
      `)
      .eq('stalls.market_id', marketId)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create transaction
router.post('/', async (req, res) => {
  try {
    const { stall_id, payer_name, amount, payment_method, status, note } = req.body

    if (!stall_id || !payer_name || !amount) {
      return res.status(400).json({ error: 'Stall_id, payer_name, and amount are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert([{ stall_id, payer_name, amount, payment_method, status, note }])
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating transaction:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router