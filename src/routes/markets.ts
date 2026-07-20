import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get all markets
router.get('/', async (req, res) => {
  try {
    const { data: marketsData, error } = await supabaseAdmin
      .from('markets')
      .select('*')
      .order('name')

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Get roles to find MARKET_HEAD role ID
    const { data: rolesData } = await supabaseAdmin.from('roles').select('id, name')
    const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))
    
    // Get all users from auth
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    
    // Get all user_roles to find MARKET_HEAD assignments
    const { data: allUserRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, market_id, role_id')

    // Create a map of market_id -> head user info
    const marketHeadMap = new Map<number, { head_user_id: string, head_name: string }>()
    
    // Find MARKET_HEAD role ID
    const marketHeadRoleId = (rolesData || []).find((r: any) => 
      r.name.toUpperCase() === 'MARKET_HEAD'
    )?.id

    if (marketHeadRoleId && allUserRoles) {
      // Build map of market head users
      const headAssignments = (allUserRoles || []).filter(
        (ur: any) => ur.role_id === marketHeadRoleId
      )
      
      // Get head user details
      headAssignments.forEach((assignment: any) => {
        const user = (authUsers?.users || []).find((u: any) => u.id === assignment.user_id)
        if (user) {
          marketHeadMap.set(assignment.market_id, {
            head_user_id: assignment.user_id,
            head_name: user.user_metadata?.full_name || user.email || '-'
          })
        }
      })
    }

    // Combine market data with head info
    const data = (marketsData || []).map((m: any) => {
      const headInfo = m.id ? marketHeadMap.get(m.id) : undefined
      return {
        ...m,
        head_user_id: headInfo?.head_user_id || '',
        head_name: headInfo?.head_name || '-',
        officer_name: headInfo?.head_name || '-'
      }
    })

    res.json(data)
  } catch (error) {
    console.error('Error fetching markets:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get market by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data: marketData, error } = await supabaseAdmin
      .from('markets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return res.status(404).json({ error: 'Market not found' })
    }

    // Get roles to find MARKET_HEAD role ID
    const { data: rolesData } = await supabaseAdmin.from('roles').select('id, name')
    const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))
    
    // Find MARKET_HEAD role ID
    const marketHeadRoleId = (rolesData || []).find((r: any) => 
      r.name.toUpperCase() === 'MARKET_HEAD'
    )?.id

    // Get head user from user_roles
    let head_user_id = ''
    if (marketHeadRoleId) {
      const { data: userRole } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('market_id', parseInt(id))
        .eq('role_id', marketHeadRoleId)
        .single()
      head_user_id = userRole?.user_id || ''
    }

    // Transform data for frontend
    const transformedData = {
      ...marketData,
      head_user_id
    }

    res.json(transformedData)
  } catch (error) {
    console.error('Error fetching market:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create market
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      code, 
      city, 
      address, 
      status,
      description,
      theme_color,
      logo_url,
      photo_url,
      head_photo_url,
      head_user_id
    } = req.body

    // Validation
    if (!name || !code || !city) {
      return res.status(400).json({ error: 'Name, code, and city are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('markets')
      .insert([{ 
        name, 
        code, 
        city, 
        address, 
        status,
        description,
        theme_color,
        logo_url,
        photo_url,
        head_photo_url
      }])
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // If head_user_id provided, update user_roles
    if (head_user_id) {
      const { data: userRoles } = await supabaseAdmin
        .from('user_roles')
        .select('id, role_id')
        .eq('user_id', head_user_id)
      
      const { data: rolesData } = await supabaseAdmin
        .from('roles')
        .select('id, name')
      const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))
      
      const marketHeadRoleId = (userRoles || []).find((ur: any) => 
        (roleMap.get(ur.role_id) || '').toUpperCase() === 'MARKET_HEAD'
      )?.role_id
      
      if (marketHeadRoleId) {
        await supabaseAdmin.from('user_roles')
          .update({ market_id: data.id })
          .eq('user_id', head_user_id)
          .eq('role_id', marketHeadRoleId)
      }
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating market:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update market
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { 
      name, 
      code, 
      city, 
      address, 
      status,
      description,
      theme_color,
      logo_url,
      photo_url,
      head_photo_url,
      head_user_id
    } = req.body

    const { data, error } = await supabaseAdmin
      .from('markets')
      .update({ 
        name, 
        code, 
        city, 
        address, 
        status,
        description,
        theme_color,
        logo_url,
        photo_url,
        head_photo_url
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Handle head assignment - update user_roles market_id
    if (head_user_id) {
      const { data: userRoles } = await supabaseAdmin
        .from('user_roles')
        .select('id, role_id')
        .eq('user_id', head_user_id)
      
      const { data: rolesData } = await supabaseAdmin
        .from('roles')
        .select('id, name')
      const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))
      
      const marketHeadRoleId = (userRoles || []).find((ur: any) => 
        (roleMap.get(ur.role_id) || '').toUpperCase() === 'MARKET_HEAD'
      )?.role_id
      
      if (marketHeadRoleId) {
        // Clear previous head's market_id
        const { data: prevHeadData } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('market_id', parseInt(id))
          .eq('role_id', marketHeadRoleId)
          .single()
        
        const prevHeadUserId = prevHeadData?.user_id
        if (prevHeadUserId && prevHeadUserId !== head_user_id) {
          await supabaseAdmin.from('user_roles')
            .update({ market_id: null })
            .eq('user_id', prevHeadUserId)
            .eq('role_id', marketHeadRoleId)
        }
        
        // Set new head's market_id
        await supabaseAdmin.from('user_roles')
          .update({ market_id: parseInt(id) })
          .eq('user_id', head_user_id)
          .eq('role_id', marketHeadRoleId)
      }
    }

    res.json(data)
  } catch (error) {
    console.error('Error updating market:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete market
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // First clear user_roles market_id for head
    const { data: rolesData } = await supabaseAdmin.from('roles').select('id, name')
    const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))
    
    const marketHeadRoleId = (rolesData || []).find((r: any) => 
      r.name.toUpperCase() === 'MARKET_HEAD'
    )?.id

    if (marketHeadRoleId) {
      const { data: prevHeadData } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('market_id', parseInt(id))
        .eq('role_id', marketHeadRoleId)
        .single()

      const prevHeadUserId = prevHeadData?.user_id
      if (prevHeadUserId) {
        await supabaseAdmin.from('user_roles')
          .update({ market_id: null })
          .eq('user_id', prevHeadUserId)
          .eq('role_id', marketHeadRoleId)
      }
    }
    
    const { error } = await supabaseAdmin
      .from('markets')
      .delete()
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting market:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router