import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Sync users from Supabase Auth to public.users table
 * Call this to ensure all auth users have corresponding entries in users table
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) throw authError

    // Prepare users for insertion
    const usersToInsert = (authUsers?.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      raw_user_meta_data: u.user_metadata || u.raw_user_meta_data,
      created_at: u.created_at
    }))

    // Insert/update users
    if (usersToInsert.length > 0) {
      const { data: insertedUsers, error: insertError } = await supabase
        .from('users')
        .upsert(usersToInsert, { onConflict: 'id' })
        .select()

      if (insertError) throw insertError
      return res.json({ 
        message: `Synced ${usersToInsert.length} users to public.users table`,
        users: insertedUsers 
      })
    }

    return res.json({ message: 'No users to sync', users: [] })
  } catch (err: any) {
    console.error('Error syncing users:', err)
    return res.status(500).json({ error: err.message || 'Failed to sync users' })
  }
}