import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { data: roles } = await supabase.from('roles').select('id, name')
    const marketHeadRoleId = (roles || []).find((r: any) => 
      r.name?.toUpperCase() === 'MARKET_HEAD'
    )?.id

    if (!marketHeadRoleId) {
      return res.json([])
    }

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', marketHeadRoleId)

    if (!userRoles || userRoles.length === 0) {
      return res.json([])
    }

    const userIds = (userRoles || []).map((ur: any) => ur.user_id)
    const { data: authUsers, error } = await supabase.auth.admin.listUsers()

    if (error) throw error

    const marketHeadUsers = (authUsers.users || [])
      .filter((user: any) => userIds.includes(user.id))
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email
      }))

    return res.json(marketHeadUsers)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}