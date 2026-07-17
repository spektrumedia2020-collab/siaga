import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { getUserRole } from '../lib/roleUtils'
import './Markets.css'
import { compressImageFile } from '../lib/imageUtils'

interface Market {
  id: number
  code: string
  name: string
  address: string
  city: string
  status: string
  created_at: string
}

export function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: 'Makassar',
    status: 'AKTIF',
    photo_url: '',
    head_photo_url: ''
  })
  const [marketPhotoFile, setMarketPhotoFile] = useState<File | null>(null)
  const [headPhotoFile, setHeadPhotoFile] = useState<File | null>(null)
  const [marketPhotoPreview, setMarketPhotoPreview] = useState<string>('')
  const [headPhotoPreview, setHeadPhotoPreview] = useState<string>('')
  const [userRoleName, setUserRoleName] = useState<string | null>(null)
  const isSuperAdmin = (userRoleName || '').toUpperCase() === 'ADMIN'
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [assignForMarket, setAssignForMarket] = useState<Record<number, { open: boolean; userId: string }>>({})
  const [assignedAdmins, setAssignedAdmins] = useState<Record<number, { userId: string; label: string }>>({})

  const getUserDisplayLabel = (u: any) => {
    const rawName =
      u?.display_name ||
      u?.full_name ||
      u?.name ||
      u?.user_metadata?.full_name ||
      u?.user_metadata?.name ||
      u?.profile?.full_name ||
      u?.profile?.name ||
      ''

    const email = u?.email || u?.user_email || u?.profile?.email || ''
    const fallbackName = email ? email.split('@')[0] : ''
    const displayName = rawName || fallbackName || ''

    if (displayName) {
      return email ? `${displayName} (${email})` : displayName
    }

    return email || u?.id || 'User'
  }

  const resolveAssignedAdminLabel = (userId: string, userList: any[] = []) => {
    const matchingUser = userList.find((u) => u.id === userId)
    if (matchingUser) {
      return getUserDisplayLabel(matchingUser)
    }

    const emailHint = userId.includes('@') ? userId : ''
    if (emailHint) {
      return emailHint
    }

    return userId
  }

  const lookupAuthUserDetails = async (userId: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data: authData } = await supabase.auth.getUser()
      const currentUser = (authData as any)?.user || null
      if (currentUser?.id === userId) {
        return {
          id: currentUser.id,
          email: currentUser.email ?? null,
          display_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || null,
          created_at: currentUser.created_at ?? ''
        }
      }

      return null
    } catch (e) {
      return null
    }
  }

  useEffect(() => {
    loadMarkets()
    ;(async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: authData } = await supabase.auth.getUser()
        const user = (authData as any)?.user || null
        if (user?.id) {
          const ur = await getUserRole(user.id)
          setUserRoleName(ur?.role_name || null)
        }
        // fetch users for assignment dropdown (if allowed)
        let loadedUsers: any[] = []
        try {
          const { data: authData } = await supabase.auth.getUser()
          const currentUser = (authData as any)?.user || null
          if (currentUser?.id) {
            loadedUsers.push({
              id: currentUser.id,
              email: currentUser.email ?? null,
              display_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || null,
              created_at: currentUser.created_at ?? ''
            })
          }
        } catch (e) {
          console.warn('Current user lookup unavailable', e)
        }

        try {
          const { data: roleRows, error: roleRowsErr } = await supabase
            .from('user_roles')
            .select('user_id')

          if (!roleRowsErr) {
            const fallbackUsers = (roleRows || [])
              .map((row: any) => row.user_id)
              .filter(Boolean)
              .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index)
              .map((userId: string) => ({ id: userId, email: null, display_name: null, created_at: '' }))

            loadedUsers = [
              ...loadedUsers,
              ...fallbackUsers.filter((u) => !loadedUsers.some((existing) => existing.id === u.id))
            ]
          }
        } catch (e) {
          console.warn('Fallback user_roles lookup failed', e)
        }

        setUsers(loadedUsers)

        // fetch roles lookup
        try {
          const { data: rolesData, error: rolesErr } = await supabase.from('roles').select('*')
          if (!rolesErr) setRoles(rolesData || [])
        } catch (e) {
          // ignore
        }

        loadMarkets(loadedUsers)
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  const loadMarkets = async (userList: any[] = []) => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMarkets(data || [])
      await loadAssignedAdmins(userList)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const loadAssignedAdmins = async (userList: any[] = []) => {
    try {
      const supabase = getSupabaseClient()
      const { data: roleRows, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role_id, market_id')

      if (error) throw error

      const roleIds = [...new Set((roleRows || []).map((row: any) => row.role_id).filter(Boolean))]
      const roleNameMap = new Map<number, string>()

      if (roleIds.length > 0) {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id, name')
          .in('id', roleIds)

        if (!roleError) {
          ;(roleData || []).forEach((role: any) => roleNameMap.set(role.id, role.name))
        }
      }

      const nextAssignedAdmins: Record<number, { userId: string; label: string }> = {}
      for (const row of roleRows || []) {
        const roleName = (roleNameMap.get(row.role_id) || '').toUpperCase()
        const hasMarket = row.market_id != null && row.market_id !== ''
        const isMarketAdminRole = ['MARKET_HEAD', 'ADMIN_PASAR', 'PASAR_ADMIN', 'MARKET_ADMIN', 'ADMIN'].includes(roleName)

        if (hasMarket && isMarketAdminRole) {
          const marketId = Number(row.market_id)
          let label = resolveAssignedAdminLabel(row.user_id, userList)

          if (label === row.user_id) {
            const authUser = await lookupAuthUserDetails(row.user_id)
            if (authUser) {
              label = getUserDisplayLabel(authUser)
            }
          }

          nextAssignedAdmins[marketId] = { userId: row.user_id, label }
        }
      }

      setAssignedAdmins(nextAssignedAdmins)
    } catch (err) {
      console.warn('Failed to load assigned admins', err)
    }
  }

  const uploadFile = async (file: File, path: string) => {
    const compressedFile = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8, maxBytes: 700 * 1024 })
    const fileExt = compressedFile.name.split('.').pop() || 'jpg'
    const fileName = `${path}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const supabase = getSupabaseClient()
    const { error } = await supabase.storage.from('Data Siaga').upload(fileName, compressedFile, {
      cacheControl: '3600',
      upsert: false
    })

    if (error) throw error
    const { data: urlData } = supabase.storage.from('Data Siaga').getPublicUrl(fileName)
    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (!isSuperAdmin) {
        setError('Hanya Superadmin yang dapat menambah atau mengubah pasar.')
        return
      }

      const payload: any = {
        code: formData.code,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        status: formData.status
      }

      if (marketPhotoFile) {
        payload.photo_url = await uploadFile(marketPhotoFile, 'market-photos')
      }
      if (headPhotoFile) {
        payload.head_photo_url = await uploadFile(headPhotoFile, 'head-photos')
      }

      const supabase = getSupabaseClient()

      if (editingId) {
        const { error } = await supabase
          .from('markets')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('markets')
          .insert([payload])

        if (error) throw error
      }

      setFormData({ code: '', name: '', address: '', city: 'Makassar', status: 'AKTIF', photo_url: '', head_photo_url: '' })
      setMarketPhotoFile(null)
      setHeadPhotoFile(null)
      setMarketPhotoPreview('')
      setHeadPhotoPreview('')
      setEditingId(null)
      setShowForm(false)
      loadMarkets()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (market: Market) => {
    setFormData({
      code: market.code,
      name: market.name,
      address: market.address,
      city: market.city,
      status: market.status,
      photo_url: (market as any).photo_url || '',
      head_photo_url: (market as any).head_photo_url || ''
    })
    setMarketPhotoPreview((market as any).photo_url || '')
    setHeadPhotoPreview((market as any).head_photo_url || '')
    setMarketPhotoFile(null)
    setHeadPhotoFile(null)
    setEditingId(market.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus pasar ini?')) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('markets')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadMarkets()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ code: '', name: '', address: '', city: 'Makassar', status: 'AKTIF', photo_url: '', head_photo_url: '' })
  }

  const openAssign = (marketId: number) => {
    setAssignForMarket(prev => ({ ...prev, [marketId]: { open: true, userId: '' } }))
  }

  const closeAssign = (marketId: number) => {
    setAssignForMarket(prev => ({ ...prev, [marketId]: { ...(prev[marketId] || {}), open: false } }))
  }

  const handleSaveAssign = async (marketId: number) => {
    setError('')
    const s = assignForMarket[marketId]
    if (!s || !s.userId) {
      setError('Pilih user yang akan ditetapkan sebagai Admin Pasar')
      return
    }

    const role = roles.find((r: any) => r.name === 'MARKET_HEAD' || r.name === 'ADMIN_PASAR' || r.name === 'PASAR_ADMIN')
    if (!role) {
      setError('Role MARKET_HEAD tidak ditemukan di tabel roles')
      return
    }

    try {
      const supabase = getSupabaseClient()
      // remove any existing MARKET_HEAD for this market
      const { error: delErr } = await supabase.from('user_roles').delete().eq('role_id', role.id).eq('market_id', marketId)
      if (delErr) throw delErr

      // also remove any existing assignment of this role for the same user (unique constraint may prevent duplicates across markets)
      const { error: delUserErr } = await supabase.from('user_roles').delete().eq('role_id', role.id).eq('user_id', s.userId)
      if (delUserErr) throw delUserErr

      const payload = {
        user_id: s.userId,
        role_id: role.id,
        market_id: marketId
      }
      const { error: insErr } = await supabase.from('user_roles').insert([payload])
      if (insErr) {
        // handle unique constraint more gracefully
        if (insErr.code === '23505') {
          setError('User sudah memiliki role tersebut di tempat lain. Hapus dulu sebelum menetapkan ke pasar ini.')
          return
        }
        throw insErr
      }

      closeAssign(marketId)
      await loadMarkets(users)
    } catch (err: any) {
      setError(err.message || 'Error menetapkan Admin Pasar')
    }
  }

  return (
    <div className="markets-page">
      <div className="page-header">
        <h2>Manajemen Pasar</h2>
        {isSuperAdmin && (
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
            disabled={showForm}
          >
            + Tambah Pasar
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-section">
          <h3>{editingId ? 'Edit Pasar' : 'Tambah Pasar Baru'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Kode Pasar</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="MKT001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nama Pasar</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Pasar Sentral"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Alamat</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Merdeka No. 123"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Kota</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Makassar"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="NONAKTIF">NONAKTIF</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Foto Pasar</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setMarketPhotoFile(file)
                    if (file) {
                      setMarketPhotoPreview(URL.createObjectURL(file))
                    }
                  }}
                />
                {marketPhotoPreview && (
                  <img src={marketPhotoPreview} alt="Preview Foto Pasar" className="image-preview" />
                )}
              </div>
              <div className="form-group">
                <label>Foto Kepala Pasar</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setHeadPhotoFile(file)
                    if (file) {
                      setHeadPhotoPreview(URL.createObjectURL(file))
                    }
                  }}
                />
                {headPhotoPreview && (
                  <img src={headPhotoPreview} alt="Preview Foto Kepala Pasar" className="image-preview" />
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update' : 'Simpan'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-responsive">
        <table className="markets-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Pasar</th>
              <th>Kota</th>
              <th>Alamat</th>
              <th>Status</th>
              <th>Admin</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => (
                <tr key={market.id}>
                  <td>{market.code}</td>
                  <td>{market.name}</td>
                  <td>{market.city}</td>
                  <td className="address-cell">{market.address}</td>
                  <td>
                    <span className={`status-badge status-${market.status.toLowerCase()}`}>
                      {market.status}
                    </span>
                  </td>
                  <td className="admin-cell">
                    {assignForMarket[market.id]?.open ? (
                      <div className="assign-inline">
                        <select value={assignForMarket[market.id]?.userId || ''} onChange={(e) => setAssignForMarket(prev => ({ ...prev, [market.id]: { ...(prev[market.id]||{}), userId: e.target.value } }))}>
                          <option value="">-- Pilih User --</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{getUserDisplayLabel(u)}</option>
                          ))}
                        </select>
                        <button className="btn-sm btn-primary" onClick={() => handleSaveAssign(market.id)}>Simpan</button>
                        <button className="btn-sm btn-secondary" onClick={() => closeAssign(market.id)}>Batal</button>
                      </div>
                    ) : assignedAdmins[market.id] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <strong>{assignedAdmins[market.id].label}</strong>
                        <span className="muted">Admin Pasar</span>
                      </div>
                    ) : (
                      isSuperAdmin ? (
                        <button className="btn-sm btn-assign" onClick={() => openAssign(market.id)}>Tetapkan Admin Pasar</button>
                      ) : (
                        <span className="muted">-</span>
                      )
                    )}
                  </td>
                  <td className="action-cell">
                    {isSuperAdmin ? (
                      <>
                        <button
                          className="btn-sm btn-edit"
                          onClick={() => handleEdit(market)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-sm btn-delete"
                          onClick={() => handleDelete(market.id)}
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <span className="muted">View only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
