import { useState, useEffect } from 'react'
import QRCodeGenerator from '../components/QRCodeGenerator'
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

interface RetributionRate {
  id: number
  amount: number
  stall_id: number | null
  market_id: number
  types_id: number
  retribution_types?: {
    id: number
    name: string
    code: string
    category: string
    unit: string
  }
  created_at?: string
  updated_at?: string
}

interface DbRetributionType {
  id: number
  code: string
  name: string
  category: string
  unit: string
  is_active?: boolean
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
  const [sectorFilter, setSectorFilter] = useState('')
  // rate dialog state
  const [rateDialogOpen, setRateDialogOpen] = useState(false)
  const [rateDialogStall, setRateDialogStall] = useState<Stall | null>(null)
  const [rates, setRates] = useState<RetributionRate[]>([])
  const [ratesLoading, setRatesLoading] = useState(false)
  const [rateFormOpen, setRateFormOpen] = useState(false)
  const [rateEditingId, setRateEditingId] = useState<number | null>(null)
  const [rateFormTypesId, setRateFormTypesId] = useState('')
  const [rateFormAmount, setRateFormAmount] = useState('')
  const [rateSaving, setRateSaving] = useState(false)
  const [retributionTypes, setRetributionTypes] = useState<DbRetributionType[]>([])

  const filteredStalls = sectorFilter
    ? stalls.filter(s => s.sector_id === parseInt(sectorFilter))
    : stalls
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

      // Load sectors: prefer market_sectors
      const { data: sectorsData, error: sectorsErr } = await supabase
        .from('market_sectors')
        .select('*')
        .eq('market_id', marketId)
        .order('name')

      if (!sectorsErr && Array.isArray(sectorsData) && sectorsData.length > 0) {
        setSectors(sectorsData.map((s: any) => ({ id: s.id, name: s.name })))
      } else {
        setSectors([])
      }

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
        setOwners([])
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
      setError(msg)
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
      const supabase = getSupabaseClient()
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

  // Rate dialog handlers
  const loadRates = async (stallId: number) => {
    try {
      setRatesLoading(true)
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('retribution_rates')
        .select('*, retribution_types(name, code, category, unit)')
        .eq('stall_id', stallId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRates(data || [])
    } catch (err: any) {
      console.error('Error loading rates:', err.message)
    } finally {
      setRatesLoading(false)
    }
  }

  const loadRetributionTypes = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('retribution_types')
        .select('*')
        .order('name')
      if (!error && data) {
        setRetributionTypes(data)
      }
    } catch (err) {
      console.error('Error loading retribution types:', err)
    }
  }

  const handleOpenRateDialog = (stall: Stall) => {
    setRateDialogStall(stall)
    setRateDialogOpen(true)
    loadRates(stall.id)
    loadRetributionTypes()
  }

  const handleCloseRateDialog = () => {
    setRateDialogOpen(false)
    setRateDialogStall(null)
    setRates([])
    setRateFormOpen(false)
    setRateEditingId(null)
    setRateFormTypesId('')
    setRateFormAmount('')
  }

  const handleRateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rateFormTypesId || !rateFormAmount) return

    try {
      setRateSaving(true)
      const supabase = getSupabaseClient()
      const payload = {
        types_id: parseInt(rateFormTypesId),
        amount: parseFloat(rateFormAmount),
        stall_id: rateDialogStall!.id,
        market_id: (rateDialogStall as any).market_id || marketId
      }

      if (rateEditingId) {
        const { error } = await supabase
          .from('retribution_rates')
          .update({ amount: payload.amount, types_id: payload.types_id })
          .eq('id', rateEditingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('retribution_rates')
          .insert([payload])
        if (error) throw error
      }

      setRateFormTypesId('')
      setRateFormAmount('')
      setRateEditingId(null)
      setRateFormOpen(false)
      loadRates(rateDialogStall!.id)
    } catch (err: any) {
      console.error('Error saving rate:', err.message)
    } finally {
      setRateSaving(false)
    }
  }

  const handleRateEdit = (rate: RetributionRate) => {
    setRateEditingId(rate.id)
    setRateFormTypesId(String(rate.types_id))
    setRateFormAmount(String(rate.amount))
    setRateFormOpen(true)
  }

  const handleRateDelete = async (id: number) => {
    if (!confirm('Yakin hapus rate retribusi ini?')) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('retribution_rates')
        .delete()
        .eq('id', id)
      if (error) {
        throw new Error(error.message || 'Gagal menghapus rate')
      }
      if (rateDialogStall) {
        loadRates(rateDialogStall.id)
      }
    } catch (err: any) {
      const msg = err?.message || 'Gagal menghapus rate retribusi'
      setError(msg)
    }
  }

  const resetRateForm = () => {
    setRateFormTypesId('')
    setRateFormAmount('')
    setRateEditingId(null)
    setRateFormOpen(false)
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
        <div className="section-header-row">
          <h3>Data Lapak ({filteredStalls.length})</h3>
          <div className="filter-group">
            <label>Filter Sektor:</label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">Semua Sektor</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredStalls.length === 0 ? (
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
                {filteredStalls.map((stall) => (
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
                        <QRCodeGenerator
                          value={String(stall.code || stall.id)}
                          label={`Lapak ${stall.code || stall.number}`}
                        />
                        <button
                          onClick={() => handleOpenRateDialog(stall)}
                          className="btn-rate"
                          title="Atur Retribusi"
                        >
                          💰
                        </button>
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

      {/* Rate Dialog */}
      {rateDialogOpen && rateDialogStall && (
        <div className="modal-backdrop" onClick={handleCloseRateDialog}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>💰 Retribusi Rates — {rateDialogStall.code || rateDialogStall.number}</h3>
              <button className="modal-close" onClick={handleCloseRateDialog}>&times;</button>
            </div>

            <div style={{ padding: '16px 0' }}>
              {!rateFormOpen ? (
                <button className="btn-primary" onClick={() => setRateFormOpen(true)}>
                  + Tambah Rate
                </button>
              ) : (
                <form onSubmit={handleRateFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
                  <h4>{rateEditingId ? 'Edit' : 'Tambah'} Rate Retribusi</h4>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Jenis Retribusi</label>
                    <select
                      value={rateFormTypesId}
                      onChange={(e) => setRateFormTypesId(e.target.value)}
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                      required
                    >
                      <option value="">-- Pilih Jenis --</option>
                      {retributionTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Tarif (Rp)</label>
                    <input
                      type="number"
                      value={rateFormAmount}
                      onChange={(e) => setRateFormAmount(e.target.value)}
                      placeholder="50000"
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                      min="0"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn-primary" disabled={rateSaving}>
                      {rateSaving ? 'Menyimpan...' : rateEditingId ? 'Simpan' : 'Tambah'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={resetRateForm}>Batal</button>
                  </div>
                </form>
              )}
            </div>

            <div>
              <h4>Daftar Rate Retribusi ({rates.length})</h4>
              {ratesLoading ? (
                <p>Memuat data rates...</p>
              ) : rates.length === 0 ? (
                <p style={{ color: '#6b7280', padding: '12px 0' }}>Belum ada rate retribusi untuk lapak ini.</p>
              ) : (
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {rates.map((rate) => (
                    <div key={rate.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{rate.retribution_types?.name || `Tipe #${rate.types_id}`}</strong>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {rate.retribution_types?.code || ''}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 13 }}>
                          Rp {rate.amount.toLocaleString('id-ID')}
                          {rate.retribution_types?.unit ? ` / ${rate.retribution_types.unit}` : ''}
                          {rate.retribution_types?.category ? ` • ${rate.retribution_types.category}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-secondary" onClick={() => handleRateEdit(rate)} style={{ padding: '4px 12px', fontSize: 13 }}>Edit</button>
                        <button className="btn-delete-user" onClick={() => handleRateDelete(rate.id)} style={{ padding: '4px 12px', fontSize: 13 }}>Hapus</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}