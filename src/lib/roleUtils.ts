import { getSupabaseClient } from './supabase'

const extractRelatedName = (related: any) => {
  if (Array.isArray(related)) {
    return related[0]?.name
  }
  return related?.name
}

export interface UserRole {
  id: number
  user_id: string
  role_id: number
  role_name: string
  market_id: number | null
  market_name?: string
}

/**
 * Get user's primary role and market assignment
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const supabase = getSupabaseClient()

    // 1) Coba dari tabel user_roles dulu
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        role_id,
        market_id,
        roles (name),
        markets (name)
      `)
      .eq('user_id', userId)
      .limit(1)

    if (!error && Array.isArray(data) && data.length > 0) {
      const row = data[0]
      return {
        id: row.id,
        user_id: row.user_id,
        role_id: row.role_id,
        role_name: extractRelatedName(row.roles) || 'UNKNOWN',
        market_id: row.market_id,
        market_name: extractRelatedName(row.markets) || undefined
      }
    }

    // 2) Fallback: baca kolom id_role + market_id dari tabel users
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id_user, id_role, market_id, auth_uid')
      .eq('auth_uid', userId)
      .maybeSingle()

    if (userError || !userRow) {
      console.error('Error fetching user fallback:', userError)
      return null
    }

    const roleId = userRow.id_role ?? null

    let roleName = 'UNKNOWN'
    if (roleId != null) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', roleId)
        .maybeSingle()
      roleName = roleData?.name || 'UNKNOWN'
    }

    return {
      id: 0,
      user_id: userId,
      role_id: roleId ?? 0,
      role_name: (roleName || 'UNKNOWN').toString().toUpperCase(),
      market_id: userRow.market_id ?? null
    }
  } catch (err) {
    console.error('Error in getUserRole:', err)
    return null
  }
}

/**
 * Get all roles for a user (if multiple)
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        role_id,
        market_id,
        roles (name),
        markets (name)
      `)
      .eq('user_id', userId)

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        role_id: d.role_id,
        role_name: extractRelatedName(d.roles) || 'UNKNOWN',
        market_id: d.market_id,
        market_name: extractRelatedName(d.markets) || undefined
      }))
    }

    // Fallback schema: role stored in users.id_role
    const { data: userRow } = await supabase
      .from('users')
      .select('id_user, id_role, market_id, auth_uid')
      .eq('auth_uid', userId)
      .maybeSingle()

    if (!userRow || userRow.id_role == null) return []

    const { data: roleData } = await supabase
      .from('roles')
      .select('name')
      .eq('id', userRow.id_role)
      .maybeSingle()

    return [{
      id: 0,
      user_id: userId,
      role_id: userRow.id_role ?? 0,
      role_name: (roleData?.name || 'UNKNOWN').toString().toUpperCase(),
      market_id: userRow.market_id ?? null
    }]
  } catch (err) {
    console.error('Error in getUserRoles:', err)
    return []
  }
}

/**
 * Check if user has specific role
 */
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user_roles')
      .select('id, role_id, roles(name)')
      .eq('user_id', userId)
      .limit(1)

    if (!error && Array.isArray(data) && data.length > 0) {
      const found = data.some((r: any) => (r.roles?.name || '').toUpperCase() === roleName.toUpperCase())
      if (found) return true
    }

    // Fallback: cek dari users.id_role
    const { data: userRow } = await supabase
      .from('users')
      .select('id_role, auth_uid')
      .eq('auth_uid', userId)
      .maybeSingle()

    if (userRow?.id_role == null) return false

    const { data: roleData } = await supabase
      .from('roles')
      .select('name')
      .eq('id', userRow.id_role)
      .maybeSingle()

    return (roleData?.name || '').toUpperCase() === roleName.toUpperCase()
  } catch (err) {
    console.error('Error in hasRole:', err)
    return false
  }
}

/**
 * Check if user is superadmin (ADMIN role)
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role?.role_name === 'ADMIN'
}

/**
 * Check if user is market admin (MARKET_HEAD role)
 */
export async function isMarketAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role?.role_name === 'MARKET_HEAD'
}

/**
 * Get user's assigned market (for MARKET_HEAD role)
 */
export async function getUserMarket(userId: string): Promise<any | null> {
  try {
    const supabase = getSupabaseClient()

    const { data: userRoleRows, error: roleRowsError } = await supabase
      .from('user_roles')
      .select('market_id, role_id')
      .eq('user_id', userId)

    if (!roleRowsError && Array.isArray(userRoleRows) && userRoleRows.length > 0) {
      const roleIds = [...new Set(userRoleRows.filter((r: any) => r.role_id).map((r: any) => r.role_id))]
      let roleNameMap = new Map<number, string>()

      if (roleIds.length > 0) {
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id, name')
          .in('id', roleIds)
        if (rolesData) {
          roleNameMap = new Map((rolesData || []).map((r: any) => [r.id, r.name]))
        }
      }

      const assignedRow = userRoleRows.find((row: any) => {
        const roleName = (roleNameMap.get(row.role_id) || '').toUpperCase()
        const hasMarket = row.market_id != null && row.market_id !== ''
        return hasMarket && (
          roleName === 'MARKET_HEAD' ||
          roleName === 'ADMIN_PASAR' ||
          roleName === 'PASAR_ADMIN' ||
          roleName === 'MARKET_ADMIN' ||
          roleName === 'ADMIN' ||
          roleName === 'TREASURER' ||
          roleName === 'OFFICER'
        )
      }) || userRoleRows.find((row: any) => row.market_id != null && row.market_id !== '') || userRoleRows[0]

      if (assignedRow?.market_id) {
        const { data: marketData, error: marketError } = await supabase
          .from('markets')
          .select('id, code, name, address, street, street_number, kecamatan, city, province, postal_code, status')
          .eq('id', assignedRow.market_id)
          .single()
        if (!marketError) return marketData
      }
    }

    // Fallback schema: role + market stored in users table
    const { data: userRow } = await supabase
      .from('users')
      .select('market_id, id_role, auth_uid')
      .eq('auth_uid', userId)
      .maybeSingle()

    if (!userRow?.market_id) return null

    const { data: marketData, error: marketError } = await supabase
      .from('markets')
      .select('id, code, name, address, street, street_number, kecamatan, city, province, postal_code, status')
      .eq('id', userRow.market_id)
      .single()

    if (marketError) throw marketError
    return marketData
  } catch (err) {
    console.error('Error in getUserMarket:', err)
    return null
  }
}

/**
 * Get all markets for superadmin
 */
export async function getAllMarkets(): Promise<any[]> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching markets:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getAllMarkets:', err)
    return []
  }
}

/**
 * Get role name by ID
 */
export function getRoleDisplayName(roleName: string): string {
  const roleMap: Record<string, string> = {
    ADMIN: '🔐 Superadmin',
    MARKET_HEAD: '📍 Admin Pasar',
    OFFICER: '👮 Petugas',
    TREASURER: '💰 Bendahara',
    MERCHANT: '🏪 Pedagang'
  }
  return roleMap[roleName] || roleName
}

/**
 * Store impersonate session in localStorage
 */
export function setImpersonateSession(originalUserId: string, targetUserId: string, targetRole: UserRole) {
  localStorage.setItem('impersonate_original_user_id', originalUserId)
  localStorage.setItem('impersonate_target_user_id', targetUserId)
  localStorage.setItem('impersonate_target_role', JSON.stringify(targetRole))
}

/**
 * Get impersonate session from localStorage
 */
export function getImpersonateSession(): { originalUserId: string; targetUserId: string; targetRole: UserRole } | null {
  const originalUserId = localStorage.getItem('impersonate_original_user_id')
  const targetUserId = localStorage.getItem('impersonate_target_user_id')
  const targetRole = localStorage.getItem('impersonate_target_role')

  if (!originalUserId || !targetUserId || !targetRole) return null

  return {
    originalUserId,
    targetUserId,
    targetRole: JSON.parse(targetRole)
  }
}

/**
 * Clear impersonate session
 */
export function clearImpersonateSession() {
  localStorage.removeItem('impersonate_original_user_id')
  localStorage.removeItem('impersonate_target_user_id')
  localStorage.removeItem('impersonate_target_role')
}

/**
 * Check if user is currently impersonating another user
 */
export function isImpersonating(): boolean {
  return !!getImpersonateSession()
}
