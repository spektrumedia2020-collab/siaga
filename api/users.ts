import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']

let adminClient: SupabaseClient | null = null

function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return adminClient
}

function isOriginAllowed(req: any, origin: string) {
  if (LOCAL_ORIGINS.includes(origin) || origin === process.env.FRONTEND_URL) return true
  try {
    return new URL(origin).host === String(req.headers?.host || '')
  } catch {
    return false
  }
}

function applyCors(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json')

  const origin = req.headers?.origin as string | undefined
  if (origin) {
    if (!isOriginAllowed(req, origin)) {
      res.status(403).json({ error: 'Origin not allowed' })
      return false
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return true
}

const relatedRoleName = (related: any) =>
  Array.isArray(related) ? related[0]?.name : related?.name

async function requireAdmin(req: any, res: any) {
  const header = String(req.headers?.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!token) {
    res.status(401).json({ error: 'Access token required' })
    return false
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi')
    res.status(500).json({ error: 'Server configuration error' })
    return false
  }

  try {
    const supabaseAdmin = getAdminClient()
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return false
    }

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)

    if (roleError) {
      console.error('Role lookup failed:', roleError.message)
      res.status(500).json({ error: 'Authorization error' })
      return false
    }

    const hasAdminRole = (roleRows || []).some(
      (row: any) => String(relatedRoleName(row.roles) || '').toUpperCase() === 'ADMIN'
    )
    if (hasAdminRole) return true

    // Fallback skema lama: peran disimpan di users.id_role
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id_role')
      .eq('auth_uid', user.id)
      .maybeSingle()

    const legacyRoleId = (profile as any)?.id_role
    if (legacyRoleId == null) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return false
    }

    const { data: roleRow } = await supabaseAdmin
      .from('roles')
      .select('name')
      .eq('id', legacyRoleId)
      .maybeSingle()

    if (String((roleRow as any)?.name || '').toUpperCase() !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' })
      return false
    }

    return true
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(500).json({ error: 'Authentication error' })
    return false
  }
}

export default async function handler(req: any, res: any) {
  if (!applyCors(req, res)) return

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Semua operasi manajemen user memakai service role: wajib ADMIN terverifikasi.
  if (!(await requireAdmin(req, res))) return

  const supabaseAdmin = getAdminClient()

  // Create user (POST)
  if (req.method === 'POST') {
    const { email, password, fullName, phone, roleId, marketId } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password required' })
    }

    try {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || email }
      })

      if (authError) {
        return res.status(400).json({ error: authError.message })
      }

      if (!authUser?.user?.id) {
        return res.status(400).json({ error: 'Failed to create user - no ID returned' })
      }

      if (roleId) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert([{
            user_id: authUser.user.id,
            role_id: Number(roleId),
            market_id: marketId ? Number(marketId) : null
          }])

        if (roleError) {
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
          return res.status(400).json({ error: `Role assignment failed: ${roleError.message}` })
        }
      }

      // Insert juga ke tabel public.users agar tampil di dashboard
      const { error: usersTableError } = await supabaseAdmin
        .from('users')
        .insert([{
          nama: fullName || email,
          username: email.split('@')[0],
          email,
          no_hp: phone || '',
          status: 'AKTIF',
          akses_global: false,
          id_role: roleId ? Number(roleId) : null,
          market_id: marketId ? Number(marketId) : null,
          auth_uid: authUser.user.id
        }])

      if (usersTableError) {
        console.error('Insert public.users failed:', usersTableError.message)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return res.status(400).json({ error: `Gagal menyimpan data user: ${usersTableError.message}` })
      }

      return res.status(201).json({ success: true, user: authUser.user })
    } catch (err: any) {
      console.error('Create user error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // Get all users (GET)
  if (req.method === 'GET') {
    try {
      const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers()

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      const usersWithRoles = await Promise.all(
        (authUsers.users || []).map(async (user) => {
          const { data: roles } = await supabaseAdmin
            .from('user_roles')
            .select('id, role_id, market_id, roles(name), markets(name)')
            .eq('user_id', user.id)

          return {
            id: user.id,
            email: user.email || 'Email belum tersedia',
            full_name: user.user_metadata?.full_name || user.email,
            created_at: user.created_at,
            roles: roles || []
          }
        })
      )

      return res.json(usersWithRoles)
    } catch (err: any) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // Delete user (DELETE)
  if (req.method === 'DELETE') {
    const { id } = req.query || {}

    if (!id) {
      return res.status(400).json({ error: 'User ID required' })
    }

    try {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', id)
      await supabaseAdmin.from('users').delete().eq('auth_uid', id)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id as string)

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      return res.json({ success: true })
    } catch (err: any) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
