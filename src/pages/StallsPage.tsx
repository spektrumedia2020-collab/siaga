import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../pages/StallsPage.css'

interface Stall {
  id: number
  market_id: number
  sector_id: number | null
  owner_id: number | null
  code: string
  number: string
  qr_code: string | null
  status: string
  created_at: string
}

interface Sector {
  id: number
  name: string
}

interface StallOwner {
  id: number
  name: string
  nik: string
}

interface Props {
  marketId: number
}

export function StallsPage({ marketId }: Props) {
  const [stalls, setStalls] = useState<Stall[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [owners, setOwners] = useState<StallOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    number: '',
    sector_id: '',
    owner_id: '',
    status: 'AKTIF'
  })

  useEffect(() => {
    loadData()
  }, [marketId])

  const loadData = async () => {
    try {
      // Load stalls
      const { data: stallsData, error: stallsErr } = await supabase
        .from('stalls')
        .select('*')
        .eq('market_id', marketId)
        .order('number')

      if (stallsErr) throw stallsErr
      setStalls(stallsData || [])

      // Load sectors
      const { data: sectorsData, error: sectorsErr } = await supabase
        .from('market_sectors')
        .select('*')
        .eq('market_id', marketId)
        .order('name')

      if (sectorsErr) throw sectorsErr
      setSectors(sectorsData || [])

      // Load owners
      const { data: ownersData, error: ownersErr } = await supabase
        .from('stall_owners')
        .select('*')
        .order('name')

      if (ownersErr) throw ownersErr
      setOwners(ownersData || [])
    } catch (err: any) {
      setError(err.message || 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const payload = {
        code: formData.code,
        number: formData.number,
        sector_id: formData.sector_id ? parseInt(formData.sector_id) : null,
        owner_id: formData.owner_id ? parseInt(formData.owner_id) : null,
        status: formData.status
      }

      if (editingId) {
        // Update
        const { error: err } = await supabase
          .from('stalls')
          .update(payload)
          .eq('id', editingId)

        if (err) throw err
      } else {
        // Create
        const { error: err } = await supabase
          .from('stalls')
          .insert([
            {
              ...payload,
              market_id: marketId
            }
          ])

        if (err) throw err
      }

      setFormData({
        code: '',
        number: '',
        sector_id: '',
        owner_id: '',
        status: 'AKTIF'
      })
      setEditingId(null)
      setShowForm(false)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error saving stall')
    }
  }

  const handleEdit = (stall: Stall) => {
    setFormData({
      code: stall.code,
      number: stall.number,
      sector_id: stall.sector_id?.toString() || '',
      owner_id: stall.owner_id?.toString() || '',
      status: stall.status
    })
    setEditingId(stall.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus lapak ini?')) return

    try {
      const { error: err } = await supabase
        .from('stalls')
        .delete()
        .eq('id', id)

      if (err) throw err
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error deleting stall')
    }
  }

  const handleCancel = () => {
    setFormData({
      code: '',
      number: '',
      sector_id: '',
      owner_id: '',
      status: 'AKTIF'
    })
    setEditingId(null)
    setShowForm(false)
  }

  const getSectorName = (id: number | null) => {
    return sectors.find(s => s.id === id)?.name || '-'
  }

  const getOwnerName = (id: number | null) => {
    return owners.find(o => o.id === id)?.name || '-'
  }

  if (loading) {
    return <div className="loading">Memuat data lapak...</div>
  }

  return (
    <div className="stalls-page">
      <div className="page-header">
        <h2>🏪 Manajemen Lapak</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Tambah Lapak
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-section">
          <h3>{editingId ? 'Edit' : 'Tambah'} Lapak</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Kode Lapak</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="LP001"
                  required
                />
              </div>

              <div className="form-group">
                <label>Nomor Lapak</label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="01"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Sektor Pasar</label>
                <select
                  value={formData.sector_id}
                  onChange={(e) => setFormData({ ...formData, sector_id: e.target.value })}
                >
                  <option value="">-- Pilih Sektor --</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Pemilik Lapak</label>
                <select
                  value={formData.owner_id}
                  onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                >
                  <option value="">-- Pilih Pemilik --</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
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
        <h3>Data Lapak ({stalls.length})</h3>
        {stalls.length === 0 ? (
          <p className="no-data">Tidak ada data lapak.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nomor</th>
                  <th>Sektor</th>
                  <th>Pemilik</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {stalls.map((stall) => (
                  <tr key={stall.id}>
                    <td>{stall.code}</td>
                    <td>{stall.number}</td>
                    <td>{getSectorName(stall.sector_id)}</td>
                    <td>{getOwnerName(stall.owner_id)}</td>
                    <td>
                      <span className={`status-badge status-${stall.status.toLowerCase()}`}>
                        {stall.status}
                      </span>
                    </td>
                    <td>{new Date(stall.created_at).toLocaleDateString('id-ID')}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(stall)}
                          className="btn-edit"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(stall.id)}
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
