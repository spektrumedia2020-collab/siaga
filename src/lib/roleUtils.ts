import { supabase } from './supabase'

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

    if (error) {
      console.error('Error fetching user role:', error)
      return null
    }

    if (!Array.isArray(data) || data.length === 0) {
      return null
    }

    const row = data[0]

    return {
      id: row.id,
      user_id: row.user_id,
      role_id: row.role_id,
      role_name: extractRelatedName(row.roles) || 'UNKNOWN',
      market_id: row.market_id,
      market_name: extractRelatedName(row.markets) || undefined
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

    if (error) {
      console.error('Error fetching user roles:', error)
      return []
    }

    if (!data) return []

    return data.map((d: any) => ({
      id: d.id,
      user_id: d.user_id,
      role_id: d.role_id,
      role_name: extractRelatedName(d.roles) || 'UNKNOWN',
      market_id: d.market_id,
      market_name: extractRelatedName(d.markets) || undefined
    }))
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
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('roles.name', roleName)
      .limit(1)

    if (error) {
      console.error('Error fetching role check:', error)
      return false
    }

    return Array.isArray(data) && data.length > 0
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
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        market_id,
        markets (
          id,
          code,
          name,
          address,
          city,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('roles.name', 'MARKET_HEAD')
      .limit(1)

    if (error || !Array.isArray(data) || data.length === 0) return null
    const market = data[0].markets
    return Array.isArray(market) ? market[0] : market
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
