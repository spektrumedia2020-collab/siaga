type SupabaseClientLike = {
  auth?: {
    updateUser: (params: { data: Record<string, any> }) => Promise<{ error?: any }>
  }
}

export interface UserProfilePayload {
  email?: string
  full_name?: string
  photo_url?: string
}

export async function getUserProfileFromUsersTable(_supabase: SupabaseClientLike, _userId: string, _email: string) {
  return { exists: false, data: null, skipped: true }
}

export async function saveUserProfileToUsersTable(supabase: SupabaseClientLike, _userId: string, payload: UserProfilePayload) {
  if (!supabase?.auth?.updateUser) {
    return { success: false, skipped: true, reason: 'unsupported-auth-client' }
  }

  const normalizedName = (payload.full_name || '').trim() || 'User'
  const normalizedPhoto = (payload.photo_url || '').trim()

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: normalizedName,
      name: normalizedName,
      avatar_url: normalizedPhoto,
      updated_at: new Date().toISOString()
    }
  })

  if (error) {
    return { success: false, skipped: true, reason: 'auth-update-failed', error }
  }

  return { success: true, skipped: false, reason: 'auth-metadata' }
}
