import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import '../styles/layout.css'

interface User {
  id: string
  email: string
  full_name?: string
  created_at?: string
  roles?: any[]
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
  const [roles, setRoles] = useState<Role[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    roleId: '',
    marketId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load users from backend API (Vercel serverless function)
      try {
        const usersRes = await fetch('/api/users')
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData)
        }
      } catch (fetchError) {
        console.warn('Backend unavailable, using empty state')
      }

      // Load roles from Supabase (public)
      const { data: rolesData } = await api.supabase.from('roles').select('id, name')
      setRoles(rolesData || [])

      // Load markets
      const { data: marketsData } = await api.supabase.from('markets').select('id, name')
      setMarkets(marketsData || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          roleId: parseInt(formData.roleId),
          marketId: formData.marketId ? parseInt(formData.marketId) : null
        })
      })

      if (res.ok) {
        setFormData({ email: '', password: '', fullName: '', roleId: '', marketId: '' })
        setShowForm(false)
        loadData()
      } else {
        const error = await res.json()
        alert('Error: ' + error.error)
      }
    } catch (err) {
      console.error('Error creating user:', err)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Yakin hapus user ini?')) return

    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadData()
      }
    } catch (err) {
      console.error('Error deleting user:', err)
    }
  }

  const getUserDisplayName = (user: User) => {
    return user.full_name || user.email || 'Tanpa Nama'
  }

  if (loading) {
    return <div className="siaga-loading">Memuat data users...</div>
  }

  return (
    <div className="siaga-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>👥 Manajemen User</h3>
        <button 
          className="siaga-btn siaga-btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Tutup' : '+ Tambah User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          background: '#f9fafb', 
          borderRadius: '8px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Email</label>
              <input
                type="email"
                className="siaga-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Password</label>
              <input
                type="password"
                className="siaga-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={6}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Nama Lengkap</label>
              <input
                type="text"
                className="siaga-input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Role</label>
              <select
                className="siaga-input"
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                required
              >
                <option value="">-- Pilih Role --</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Pasar (opsional)</label>
              <select
                className="siaga-input"
                value={formData.marketId}
                onChange={(e) => setFormData({ ...formData, marketId: e.target.value })}
              >
                <option value="">-- Pilih Pasar --</option>
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="siaga-btn siaga-btn-primary">
              Buat User
            </button>
            <button 
              type="button" 
              className="siaga-btn siaga-btn-outline"
              onClick={() => setShowForm(false)}
              style={{ marginLeft: '0.5rem' }}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '1rem' 
      }}>
        {users.length === 0 ? (
          <div style={{ 
            gridColumn: '1/-1',
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <p>Belum ada user. Klik "+ Tambah User" untuk menambah.</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="siaga-card" style={{ margin: 0, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{getUserDisplayName(user)}</h4>
                  <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                    {user.email || 'Email tidak tersedia'}
                  </p>
                  <p style={{ margin: '0.25rem 0', color: '#9ca3af', fontSize: '0.8rem' }}>
                    ID: {user.id}
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteUser(user.id)}
                  className="siaga-btn siaga-btn-accent"
                  style={{ padding: '0.25rem 0.5rem' }}
                  title="Hapus user"
                >
                  🗑️
                </button>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                {(user.roles || []).length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {user.roles?.map((r: any) => (
                      <span key={r.id} className="siaga-badge siaga-badge-active">
                        {r.roles?.name || r.role_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Tidak ada role</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}