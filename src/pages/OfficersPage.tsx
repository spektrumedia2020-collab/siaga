import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import '../pages/OfficersPage.css'

interface Officer {
  id: number
  user_id: string
  code: string
  name: string
  phone: string
  market_id: number
  status: string
  created_at: string
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
    name: '',
    phone: ''
  })

  useEffect(() => {
    loadOfficers()
  }, [marketId])

  const loadOfficers = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('market_id', marketId)
        .order('name')

      if (err) throw err
      setOfficers(data || [])
    } catch (err: any) {
      setError(err.message || 'Error loading officers')
    } finally {
      setLoading(false)
    }
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
            name: formData.name,
            phone: formData.phone
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
              name: formData.name,
              phone: formData.phone,
              market_id: marketId,
              status: 'AKTIF'
            }
          ])

        if (err) throw err
      }

      setFormData({ code: '', name: '', phone: '' })
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
      name: officer.name,
      phone: officer.phone
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
    setFormData({ code: '', name: '', phone: '' })
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => (
                  <tr key={officer.id}>
                    <td>{officer.code}</td>
                    <td>{officer.name}</td>
                    <td>{officer.phone || '-'}</td>
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
