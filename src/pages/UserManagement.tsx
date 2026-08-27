import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import '../styles/layout.css'

interface User {
  id: number
  email: string
  full_name?: string
  phone?: string
  market_id?: number
  market_name?: string
  role_id?: number
  role_name?: string
}

interface Role {
  id: number
  name: string
}

interface Market {
  id: number
  name: string
}

const roleNames: Record<string, string> = {
  'SUPER_ADMIN': 'Super Admin',
  'MARKET_HEAD': 'Kepala Pasar',
  'OFFICER': 'Petugas',
  'CASHIER': 'Kasir'
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    roleId: '',
    marketId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: usersData } = await api.supabase.from('users').select('id_user, email, nama, no_hp, market_id, id_role')
      const { data: rolesData } = await api.supabase.from('roles').select('id, name')
      const roleMap = new Map((rolesData || []).map((r: any) => [r.id, r.name]))

      const marketIds = [...new Set((usersData || []).map((u: any) => u.market_id).filter(Boolean))]
      const { data: marketData } = await api.supabase.from('markets').select('id, name')
      const marketMap = new Map((marketData || []).map((m: any) => [m.id, m.name]))

      const formattedUsers = (usersData || []).map((u: any) => ({
        id: u.id_user,
        email: u.email,
        full_name: u.nama || u.email,
        phone: u.no_hp,
        market_id: u.market_id,
        market_name: u.market_id ? marketMap.get(u.market_id) : '-',
        role_id: u.id_role,
        role_name: roleNames[roleMap.get(u.id_role) || ''] || roleMap.get(u.id_role) || 'UNKNOWN'
      }))
      setUsers(formattedUsers)
      setRoles(rolesData || [])
      setMarkets(marketData || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      fullName: user.full_name || '',
      phone: user.phone || '',
      roleId: user.role_id?.toString() || '',
      marketId: user.market_id?.toString() || ''
    })
    setShowForm(true)
  }

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (userId: number) => {
    try {
      setDeleting(true)
      await api.supabase.from('user_roles').delete().eq('id', userId)
      await api.supabase.from('users').delete().eq('id_user', userId)
      loadData()
    } catch (err) {
      console.error('Error deleting user:', err)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await api.supabase.from('users').update({
          email: formData.email,
          nama: formData.fullName,
          no_hp: formData.phone,
          market_id: formData.marketId ? parseInt(formData.marketId) : null
        }).eq('id_user', editingUser.id)
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            phone: formData.phone,
            roleId: formData.roleId ? parseInt(formData.roleId) : null,
            marketId: formData.marketId ? parseInt(formData.marketId) : null
          })
        })
        const result = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = result?.error || `Gagal membuat user (HTTP ${res.status})`
          console.error('Create user failed:', msg)
          alert(`Gagal membuat user: ${msg}`)
          return
        }
      }
      setFormData({ email: '', password: '', fullName: '', phone: '', roleId: '', marketId: '' })
      setEditingUser(null)
      setShowForm(false)
      loadData()
    } catch (err) {
      console.error('Error saving user:', err)
    }
  }

  const getUserDisplayName = (user: User) => user.full_name || user.email || 'Tanpa Nama'

  if (loading) {
    return <div className="siage-loading">Memuat data users...</div>
  }

  return (
    <div className="siage-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>👥 Manajemen User</h3>
        <button className="siage-btn siage-btn-primary" onClick={() => { setEditingUser(null); setFormData({ email: '', password: '', fullName: '', phone: '', roleId: '', marketId: '' }); setShowForm(!showForm) }}>
          {showForm ? 'Tutup' : '+ Tambah User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Email</label><input type="email" className="siage-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Password {editingUser && '(kosongkan untuk tidak diubah)'}</label><input type="password" className="siage-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} minLength={6} /></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Nama Lengkap</label><input type="text" className="siage-input" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} /></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>No HP</label><input type="text" className="siage-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Role</label><select className="siage-input" value={formData.roleId} onChange={(e) => setFormData({ ...formData, roleId: e.target.value })} required><option value="">-- Pilih Role --</option>{roles.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}</select></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Pasar (opsional)</label><select className="siage-input" value={formData.marketId} onChange={(e) => setFormData({ ...formData, marketId: e.target.value })}><option value="">-- Pilih Pasar --</option>{markets.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}</select></div>
          </div>
          <div style={{ marginTop: '1rem' }}><button type="submit" className="siage-btn siage-btn-primary">{editingUser ? 'Update' : 'Buat'} User</button><button type="button" className="siage-btn siage-btn-outline" onClick={() => { setEditingUser(null); setFormData({ email: '', password: '', fullName: '', phone: '', roleId: '', marketId: '' }) }} style={{ marginLeft: '0.5rem' }}>Batal</button></div>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Nama</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Email</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>No HP</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Pasar</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Role</th>
            <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '100px' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Belum ada user.</td></tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{getUserDisplayName(user)}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{user.email}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{user.phone || '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{user.market_name || '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>{user.role_name}</span>
                </td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <button className="siage-btn siage-btn-outline" onClick={() => handleEdit(user)} style={{ padding: '0.25rem 0.5rem', marginRight: '0.25rem' }}>✏️</button>
                  <button className="siage-btn siage-btn-accent" onClick={() => setDeleteTarget(user)} style={{ padding: '0.25rem 0.5rem' }}>🗑️</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus User"
        message={`Yakin hapus user "${deleteTarget?.full_name || deleteTarget?.email || ''}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        danger
        loading={deleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
