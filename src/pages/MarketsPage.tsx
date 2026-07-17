import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Markets.css'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: 'Makassar',
    status: 'AKTIF',
  })

  useEffect(() => {
    loadMarkets()
  }, [])

  const loadMarkets = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMarkets(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('markets')
          .update(formData)
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('markets')
          .insert([formData])

        if (error) throw error
      }

      setFormData({ code: '', name: '', address: '', city: 'Makassar', status: 'AKTIF' })
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
    })
    setEditingId(market.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus pasar ini?')) return

    try {
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
    setFormData({ code: '', name: '', address: '', city: 'Makassar', status: 'AKTIF' })
  }

  return (
    <div className="markets-page">
      <div className="page-header">
        <h2>Manajemen Pasar</h2>
        <button
          className="btn-primary"
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          + Tambah Pasar
        </button>
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

      {loading ? (
        <p>Loading...</p>
      ) : markets.length === 0 ? (
        <div className="empty-state">
          <p>Belum ada pasar. Tambahkan pasar baru untuk memulai.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="markets-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Pasar</th>
                <th>Kota</th>
                <th>Alamat</th>
                <th>Status</th>
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
                  <td className="action-cell">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
