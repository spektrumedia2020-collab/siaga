import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import '../pages/UserManagement.css'

interface User {
  id: string
  email?: string | null
  created_at: string
  display_name?: string | null
  user_metadata?: any
}

interface UserRole {
  id: number
  user_id: string
  role_id: number
  role_name: string
  market_id: number | null
  market_name?: string
}

interface Role {
  id: number
  name: string
}

interface Market {
  id: number
  name: string
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({})
  const [roles, setRoles] = useState<Role[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const getUserDisplayName = (user: User) => {
    const sanitizeDisplayName = (value?: string | null) => {
      if (!value || typeof value !== 'string') return ''
      const cleaned = value.trim().replace(/\s+/g, ' ')
      if (!cleaned) return ''
      if (/^[#\s]+$/.test(cleaned) || /^[^a-zA-Z0-9]+$/.test(cleaned)) return ''
      return cleaned
    }

    const rawName = sanitizeDisplayName(user.display_name || user.user_metadata?.full_name || user.user_metadata?.name)
    if (rawName) return rawName

    const email = sanitizeDisplayName(user.email || '')
    if (email) return email.split('@')[0] || 'User'

    const shortId = user.id ? user.id.slice(0, 8) : ''
    return shortId ? `User ${shortId}` : 'User'
  }
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '',
    marketId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const supabase = getSupabaseClient()
      // Load roles
      const { data: rolesData, error: rolesErr } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (rolesErr) throw rolesErr
      setRoles(rolesData || [])

      // Load markets
      const { data: marketsData, error: marketsErr } = await supabase
        .from('markets')
        .select('*')
        .order('name')

      if (marketsErr) throw marketsErr
      setMarkets(marketsData || [])

      // Load user roles first; this works even when admin API is unavailable
      const { data: rolesMapping, error: rolesMappingErr } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role_id,
          market_id,
          roles (name),
          markets (name)
        `)

      if (rolesMappingErr) throw rolesMappingErr

      const rolesByUser: Record<string, UserRole[]> = {}
      rolesMapping?.forEach((rm: any) => {
        if (!rolesByUser[rm.user_id]) {
          rolesByUser[rm.user_id] = []
        }
        rolesByUser[rm.user_id].push({
          id: rm.id,
          user_id: rm.user_id,
          role_id: rm.role_id,
          role_name: rm.roles?.name || 'UNKNOWN',
          market_id: rm.market_id,
          market_name: rm.markets?.name
        })
      })

      setUserRoles(rolesByUser)

      const loadedUsers: User[] = []
      const seenUserIds = new Set<string>()

      try {
        const { data: authData } = await supabase.auth.getUser()
        const currentUser = (authData as any)?.user as any
        if (currentUser?.id) {
          loadedUsers.push({
            id: currentUser.id,
            email: currentUser.email ?? null,
            created_at: currentUser.created_at ?? '',
            display_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || null,
            user_metadata: currentUser.user_metadata || {}
          })
          seenUserIds.add(currentUser.id)
        }
      } catch (e) {
        console.warn('Current user lookup unavailable', e)
      }

      ;(rolesMapping || [])
        .map((rm: any) => rm.user_id)
        .filter(Boolean)
        .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
        .forEach((userId: string) => {
          if (seenUserIds.has(userId)) return
          seenUserIds.add(userId)
          loadedUsers.push({
            id: userId,
            email: null,
            created_at: '',
            display_name: null,
            user_metadata: {}
          })
        })

      setUsers(loadedUsers)
    } catch (err: any) {
      setError(err.message || 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.fullName.trim() || !formData.email || !formData.password || !formData.roleId) {
      setError('Nama lengkap, email, password, dan role wajib diisi')
      return
    }

    try {
      const supabase = getSupabaseClient()
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            name: formData.fullName.trim()
          }
        }
      })

      if (signUpErr) {
        const message = (signUpErr.message || '').toLowerCase()
        if (message.includes('rate limit') || message.includes('too many requests') || message.includes('signup')) {
          throw new Error('Terlalu banyak percobaan pembuatan akun. Tunggu beberapa saat lalu coba lagi.')
        }
        throw signUpErr
      }

      const createdUserId = signUpData.user?.id || signUpData.session?.user?.id

      if (createdUserId) {
        const rolePayload: any = {
          user_id: createdUserId,
          role_id: parseInt(formData.roleId)
        }

        if (formData.marketId) {
          rolePayload.market_id = parseInt(formData.marketId)
        }

        const { error: roleErr } = await supabase.from('user_roles').insert([rolePayload])

        if (roleErr) throw roleErr
      }

      setFormData({ fullName: '', email: '', password: '', roleId: '', marketId: '' })
      setShowForm(false)
      await loadData()
    } catch (err: any) {
      const message = err?.message || 'Error creating user'
      setError(message)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Yakin hapus user ini? Aksi ini tidak bisa dibatalkan.')) return

    try {
      const supabase = getSupabaseClient()
      const { error: roleDeleteErr } = await supabase.from('user_roles').delete().eq('user_id', userId)
      if (roleDeleteErr) throw roleDeleteErr

      setError('Mapping role berhasil dihapus. Penghapusan akun auth dari frontend memerlukan akses server-side.')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error deleting user')
    }
  }

  const handleRemoveRole = async (roleId: number) => {
    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase.from('user_roles').delete().eq('id', roleId)

      if (err) throw err
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error removing role')
    }
  }

  if (loading) {
    return <div className="loading">Memuat data user...</div>
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h2>👥 Manajemen User</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Buat User Baru
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-section">
          <h3>Buat User Baru</h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Nama lengkap user"
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  required
                >
                  <option value="">-- Pilih Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Pasar (opsional)</label>
                <select
                  value={formData.marketId}
                  onChange={(e) => setFormData({ ...formData, marketId: e.target.value })}
                >
                  <option value="">-- Pilih Pasar --</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Buat User
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="section">
        <h3>Daftar User ({users.length})</h3>
        {users.length === 0 ? (
          <p className="no-data">Tidak ada user.</p>
        ) : (
          <div className="users-list">
            {users.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-header">
                  <div>
                    <h4>{getUserDisplayName(user)}</h4>
                    <p className="user-email">{user.email || 'Email belum tersedia'}</p>
                    <p className="user-id">ID: {user.id}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="btn-delete-user"
                    title="Hapus user"
                  >
                    🗑️
                  </button>
                </div>

                <div className="user-roles">
                  <p className="roles-label">Roles:</p>
                  {(userRoles[user.id] || []).length === 0 ? (
                    <span className="no-role">Tidak ada role</span>
                  ) : (
                    <div className="role-badges">
                      {userRoles[user.id].map((userRole) => (
                        <div key={userRole.id} className="role-badge">
                          <span>
                            {userRole.role_name}
                            {userRole.market_name && ` - ${userRole.market_name}`}
                          </span>
                          <button
                            onClick={() => handleRemoveRole(userRole.id)}
                            className="remove-role"
                            title="Hapus role"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="user-meta">
                  <small>Dibuat: {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : 'Tidak diketahui'}</small>
                  <small style={{ display: 'block', marginTop: 4 }}>
                    Role aktif: {(userRoles[user.id] || []).length > 0 ? userRoles[user.id].map((r) => r.role_name).join(', ') : 'Tidak ada role'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
