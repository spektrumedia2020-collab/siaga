import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import '../pages/OfficersPage.css'

const ROLE_NAMES: Record<string, string> = {
  'MARKET_HEAD': 'Kepala Pasar',
  'ADMIN_PASAR': 'Admin Pasar',
  'PASAR_ADMIN': 'Admin Pasar',
  'MARKET_ADMIN': 'Admin Pasar',
  'OFFICER': 'Petugas',
  'CASHIER': 'Kasir',
  'TREASURER': 'Bendahara',
  'SUPER_ADMIN': 'Super Admin',
  'ADMIN': 'Admin'
}

interface Officer {
  id: number
  user_id: string
  code: string
  nama: string
  phone: string
  market_id: number
  status: string
  created_at: string
  id_role?: number
}

interface Props {
  marketId: number
}

export function OfficersPage({ marketId }: Props) {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    nama: '',
    phone: '',
    id_role: '' as number | ''
  })
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    loadOfficers()
    loadRoles()
  }, [marketId])

  const loadRoles = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('roles')
        .select('id, name')
        .order('name')
      setRoles(data || [])
    } catch (err) {
      console.error('Error loading roles', err)
    }
  }

  const loadOfficers = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('market_id', marketId)
        .order('nama')

      if (err) throw err
      setOfficers(data || [])
    } catch (err: any) {
      setError(err.message || 'Error loading officers')
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (roleId?: number) => {
    if (!roleId) return '-'
    const role = roles.find(r => r.id === roleId)
    return ROLE_NAMES[role?.name || ''] || role?.name || '-'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const supabase = getSupabaseClient()
      if (editingId) {
        // Update
        const { error: err } = await supabase
          .from('users')
          .update({
            code: formData.code,
            nama: formData.nama,
            phone: formData.phone,
            id_role: formData.id_role || null
          })
          .eq('id', editingId)

        if (err) throw err
      } else {
        // Create - Admin pasar dapat membuat officer
        const { error: err } = await supabase
          .from('users')
          .insert([
            {
              code: formData.code,
              nama: formData.nama,
              phone: formData.phone,
              market_id: marketId,
              status: 'AKTIF',
              id_role: formData.id_role || null
            }
          ])

        if (err) throw err
      }

      setFormData({ code: '', nama: '', phone: '', id_role: '' })
      setEditingId(null)
      setShowForm(false)
      loadOfficers()
    } catch (err: any) {
      setError(err.message || 'Error saving officer')
    }
  }

  const handleEdit = (officer: Officer) => {
    setFormData({
      code: officer.code,
      nama: officer.nama,
      phone: officer.phone,
      id_role: officer.id_role || ''
    })
    setEditingId(officer.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus petugas ini?')) return

    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (err) throw err
      loadOfficers()
    } catch (err: any) {
      setError(err.message || 'Error deleting officer')
    }
  }

  const handleCancel = () => {
    setFormData({ code: '', nama: '', phone: '', id_role: '' })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return <div className="loading">Memuat data petugas...</div>
  }

  return (
    <div className="officers-page">
      <div className="page-header">
        <h2>👮 Manajemen Petugas</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Tambah Petugas
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-section">
          <h3>{editingId ? 'Edit' : 'Tambah'} Petugas</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Kode Petugas</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="PT001"
                required
              />
            </div>

            <div className="form-group">
              <label>Nama Petugas</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Nama lengkap"
                required
              />
            </div>

            <div className="form-group">
              <label>Nomor Telepon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={formData.id_role}
                onChange={(e) => setFormData({ ...formData, id_role: e.target.value ? Number(e.target.value) : '' })}
                className="siaga-input"
              >
                <option value="">-- Pilih Role --</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {ROLE_NAMES[r.name] || r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update' : 'Simpan'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="section">
        <h3>Data Petugas ({officers.length})</h3>
        {officers.length === 0 ? (
          <p className="no-data">Tidak ada data petugas.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th>Telepon</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => (
                  <tr key={officer.id}>
                    <td>{officer.code}</td>
                    <td>{officer.nama}</td>
                    <td>{officer.phone || '-'}</td>
                    <td>{getRoleLabel(officer.id_role)}</td>
                    <td>
                      <span className={`status-badge status-${officer.status.toLowerCase()}`}>
                        {officer.status}
                      </span>
                    </td>
                    <td>{new Date(officer.created_at).toLocaleDateString('id-ID')}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(officer)}
                          className="btn-edit"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(officer.id)}
                          className="btn-delete"
                          title="Hapus"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
