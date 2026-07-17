import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
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

interface Category {
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
  const [categories, setCategories] = useState<Category[]>([])
  const [owners, setOwners] = useState<StallOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    number: '',
    sector_id: '',
    category_id: '',
    owner_id: '',
    status: 'AKTIF'
  })
  // sector management removed from UI; keep sectors list only

  useEffect(() => {
    loadData()
  }, [marketId])

  const loadData = async () => {
    try {
      const supabase = getSupabaseClient()
      if (!marketId || marketId === 0) {
        setStalls([])
        setSectors([])
        setCategories([])
        setOwners([])
        setLoading(false)
        return
      }

      // Load stalls
      const { data: stallsData, error: stallsErr } = await supabase
        .from('stalls')
        .select('*')
        .eq('market_id', marketId)
        .order('number')

      if (stallsErr) throw stallsErr
      setStalls(stallsData || [])

      // Load sectors: prefer market_sectors, fallback to sektor_pasar
      let sectorsToUse: Sector[] = []
      const { data: sectorsData, error: sectorsErr } = await supabase
        .from('market_sectors')
        .select('*')
        .eq('market_id', marketId)
        .order('name')

      if (!sectorsErr && Array.isArray(sectorsData) && sectorsData.length > 0) {
        sectorsToUse = sectorsData.map((s: any) => ({ id: s.id, name: s.name }))
      } else {
        const { data: marketData, error: marketErr } = await supabase
          .from('markets')
          .select('code')
          .eq('id', marketId)
          .limit(1)

        if (!marketErr && Array.isArray(marketData) && marketData.length > 0) {
          const marketCode = marketData[0].code
          const { data: pasarData, error: pasarErr } = await supabase
            .from('pasar')
            .select('id_pasar')
            .eq('kode_pasar', marketCode)
            .limit(1)

          if (!pasarErr && Array.isArray(pasarData) && pasarData.length > 0) {
            const pasarId = pasarData[0].id_pasar
            const { data: siagaSectors, error: siagaErr } = await supabase
              .from('sektor_pasar')
              .select('id_sektor, nama_sektor')
              .eq('id_pasar', pasarId)
              .order('nama_sektor')

            if (!siagaErr && Array.isArray(siagaSectors) && siagaSectors.length > 0) {
              sectorsToUse = siagaSectors.map((s: any) => ({ id: s.id_sektor, name: s.nama_sektor }))
            }
          }
        }
      }

      setSectors(sectorsToUse)

      // Load categories
      const { data: categoriesData, error: categoriesErr } = await supabase
        .from('stall_categories')
        .select('*')
        .order('name')

      if (!categoriesErr) {
        setCategories((categoriesData || []).map((item: any) => ({ id: item.id, name: item.name || item.nama_kategori || '-' })))
      } else {
        setCategories([])
      }

      // Load owners
      const { data: ownersData, error: ownersErr } = await supabase
        .from('stall_owners')
        .select('*')
        .order('name')

      if (!ownersErr && Array.isArray(ownersData) && ownersData.length > 0) {
        setOwners(ownersData || [])
      } else {
        const { data: siagaOwners, error: siagaOwnersErr } = await supabase
          .from('pemilik_lapak')
          .select('id_pemilik, nama_pemilik, nik')
          .order('nama_pemilik')

        if (!siagaOwnersErr) {
          setOwners((siagaOwners || []).map((o: any) => ({ id: o.id_pemilik, name: o.nama_pemilik, nik: o.nik })))
        }
      }
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
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        owner_id: formData.owner_id ? parseInt(formData.owner_id) : null,
        status: formData.status
      }

      const fallbackPayload = {
        kode_lapak: formData.code,
        nomor_lapak: formData.number,
        id_sektor: formData.sector_id ? parseInt(formData.sector_id) : null,
        id_kategori: formData.category_id ? parseInt(formData.category_id) : null,
        id_pemilik: formData.owner_id ? parseInt(formData.owner_id) : null,
        status: formData.status
      }

      try {
        const supabase = getSupabaseClient()
        if (editingId) {
          const { error: err } = await supabase
            .from('stalls')
            .update(payload)
            .eq('id', editingId)

          if (err) throw err
        } else {
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
      } catch (primaryErr: any) {
        const msg = primaryErr?.message || 'Error saving stall'
        if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('403')) {
          const supabase = getSupabaseClient()
          if (editingId) {
            const { error: legacyErr } = await supabase
              .from('lapak')
              .update(fallbackPayload)
              .eq('id_lapak', editingId)

            if (legacyErr) throw legacyErr
          } else {
            const { error: legacyErr } = await supabase
              .from('lapak')
              .insert([
                {
                  ...fallbackPayload,
                  id_pasar: marketId
                }
              ])

            if (legacyErr) throw legacyErr
          }
        } else {
          throw primaryErr
        }
      }

      setFormData({
        code: '',
        number: '',
        sector_id: '',
        category_id: '',
        owner_id: '',
        status: 'AKTIF'
      })
      setEditingId(null)
      setShowForm(false)
      loadData()
    } catch (err: any) {
      const msg = err?.message || 'Error saving stall'
      if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('403')) {
        setError(`${msg}. Jalankan SQL setup_stall_owners_policies.sql di Supabase untuk mengizinkan manajemen lapak.`)
      } else {
        setError(msg)
      }
    }
  }

  const handleEdit = (stall: Stall) => {
    setFormData({
      code: stall.code,
      number: stall.number,
      sector_id: stall.sector_id?.toString() || '',
      category_id: (stall as any).category_id?.toString() || '',
      owner_id: stall.owner_id?.toString() || '',
      status: stall.status
    })
    setEditingId(stall.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus lapak ini?')) return

    try {
      try {
        const supabase = getSupabaseClient()
        const { error: err } = await supabase
          .from('stalls')
          .delete()
          .eq('id', id)

        if (err) throw err
      } catch (primaryErr: any) {
        const msg = primaryErr?.message || 'Error deleting stall'
        if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('403')) {
          const supabase = getSupabaseClient()
          const { error: legacyErr } = await supabase
            .from('lapak')
            .delete()
            .eq('id_lapak', id)

          if (legacyErr) throw legacyErr
        } else {
          throw primaryErr
        }
      }

      loadData()
    } catch (err: any) {
      const msg = err?.message || 'Error deleting stall'
      if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('403')) {
        setError(`${msg}. Jalankan SQL setup_stall_owners_policies.sql di Supabase untuk mengizinkan delete lapak.`)
      } else {
        setError(msg)
      }
    }
  }

  

  const handleCancel = () => {
    setFormData({
      code: '',
      number: '',
      sector_id: '',
      category_id: '',
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

  const getCategoryName = (id: number | null) => {
    return categories.find(c => c.id === id)?.name || '-'
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
                  value={formData.sector_id || ''}
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
                <label>Kategori Lapak</label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pemilik Lapak</label>
                <select
                  value={formData.owner_id || ''}
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

      {/* Manajemen Sektor dihilangkan — gunakan halaman Sektor terpisah */}

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
                  <th>Kategori</th>
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
                    <td>{getCategoryName((stall as any).category_id)}</td>
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
