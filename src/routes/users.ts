import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Create user with auto-confirm email
router.post('/create', async (req, res) => {
  const { email, password, fullName, roleId, marketId } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password required' })
  }

  try {
    console.log('Creating user:', { email, roleId, marketId })

    // Create user di Supabase Auth dengan auto-confirm
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm email
      user_metadata: {
        full_name: fullName || email
      }
    })

    console.log('Auth user result:', { authUser, authError })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    if (!authUser?.user?.id) {
      return res.status(400).json({ error: 'Failed to create user - no ID returned' })
    }

    // Assign role ke user - pastikan tipe data sesuai
    if (roleId) {
      const roleData = {
        user_id: authUser.user.id, // UUID string from auth.users
        role_id: Number(roleId), // Pastikan integer
        market_id: marketId ? Number(marketId) : null
      }

      console.log('Inserting role data:', roleData)

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert([roleData])

      if (roleError) {
        console.error('Role assign error:', roleError)
        // Cleanup: delete user if role assignment fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return res.status(400).json({ 
          error: `Role assignment failed: ${roleError.message}`,
          details: roleError.details
        })
      }
    }

    res.status(201).json({ 
      success: true, 
      user: authUser.user,
      message: 'User berhasil dibuat dengan auto-confirm email'
    })
  } catch (err) {
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all users
router.get('/', async (req, res) => {
  try {
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Get roles for each user
    const usersWithRoles = await Promise.all(
      authUsers.users.map(async (authUser) => {
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select(`
            id,
            role_id,
            market_id,
            roles (name),
            markets (name)
          `)
          .eq('user_id', authUser.id)

        return {
          id: authUser.id,
          email: authUser.email || 'Email belum tersedia',
          full_name: authUser.user_metadata?.full_name || authUser.email,
          created_at: authUser.created_at,
          roles: roles || []
        }
      })
    )

    res.json(usersWithRoles)
  } catch (err) {
    console.error('Get users error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all users with MARKET_HEAD role
router.get('/market-heads', async (req, res) => {
  try {
    // Get all roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('roles')
      .select('id, name')

    if (rolesError) {
      return res.status(400).json({ error: rolesError.message })
    }

    // Find MARKET_HEAD role ID
    const marketHeadRole = (roles || []).find(r => 
      r.name.toUpperCase() === 'MARKET_HEAD'
    )

    if (!marketHeadRole) {
      return res.status(400).json({ error: 'MARKET_HEAD role not found' })
    }

    // Get user_roles with MARKET_HEAD role
    const { data: userRoles, error: userRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, market_id')
      .eq('role_id', marketHeadRole.id)

    if (userRolesError) {
      return res.status(400).json({ error: userRolesError.message })
    }

    if (!userRoles || userRoles.length === 0) {
      return res.json([])
    }

    // Get user details
    const userIds = userRoles.map(ur => ur.user_id)
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

    if (usersError) {
      return res.status(400).json({ error: usersError.message })
    }

    // Filter users that have MARKET_HEAD role
    const marketHeadUsers = authUsers.users
      .filter(user => userIds.includes(user.id))
      .map(user => ({
        id: user.id,
        email: user.email || 'Email belum tersedia',
        full_name: user.user_metadata?.full_name || user.email
      }))

    res.json(marketHeadUsers)
  } catch (err) {
    console.error('Get market heads error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  try {
    // Delete user roles first
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', id)

    // Delete user from Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router