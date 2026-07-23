import { useState, useEffect } from 'react'
import QRCodeGenerator from '../components/QRCodeGenerator'
import { getSupabaseClient } from '../lib/supabase'
import '../pages/StallsPage.css'

interface Stall {
  id: number
  market_id: number
  sector_id: number | null
  category_id: number | null
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
  retribution_type_name?: string
}

interface Props {
  marketId: number
}

export function StallsPage({ marketId }: Props) {
  const [stalls, setStalls] = useState<Stall[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [owners, setOwners] = useState<StallOwner[]>([])
  const [retributions, setRetributions] = useState<RetributionRate[]>([])
  const [retributionTypes, setRetributionTypes] = useState<any[]>([])
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
  const [selectedStallId, setSelectedStallId] = useState<number | null>(null)
  const [quickRetributionType, setQuickRetributionType] = useState('')
  const [quickRetributionAmount, setQuickRetributionAmount] = useState('')

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
        setRetributions([])
        setRetributionTypes([])
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

      // Load retribution types
      const { data: typesData, error: typesErr } = await supabase
        .from('retribution_types')
        .select('*')
        .order('name')

      if (!typesErr && Array.isArray(typesData)) {
        setRetributionTypes(typesData || [])
      } else {
        setRetributionTypes([])
      }

      // Load retribution rates for this market
      const { data: ratesData, error: ratesErr } = await supabase
        .from('retribution_rates')
        .select('*')
        .eq('market_id', marketId)
        .order('id')

      if (!ratesErr && Array.isArray(ratesData)) {
        const ratesWithTypeName = (ratesData || []).map((r: any) => ({
          ...r,
          retribution_type_name: (retributionTypes.find(t => t.id === r.types_id) || typesData?.find((t: any) => t.id === r.types_id))?.name || '-'
        }))
        setRetributions(ratesWithTypeName)
      } else {
        setRetributions([])
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

  const handleAddRetribution = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase
        .from('retribution_rates')
        .insert([{
          market_id: marketId,
          stall_id: retributionForm.stall_id ? parseInt(retributionForm.stall_id) : null,
          types_id: parseInt(retributionForm.type_id),
          amount: parseFloat(retributionForm.amount)
        }])

      if (err) throw err
      setRetributionForm({ stall_id: '', amount: '', type_id: '' })
      setShowRetributionForm(false)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error saving retribution rate')
    }
  }

  const handleDeleteRetribution = async (id: number) => {
    if (!confirm('Yakin hapus tarif retribusi ini?')) return
    try {
      const supabase = getSupabaseClient()
      const { error: err } = await supabase
        .from('retribution_rates')
        .delete()
        .eq('id', id)

      if (err) throw err
      loadData()
    } catch (err: any) {
      setError(err.message || 'Error deleting retribution rate')
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
                        <QRCodeGenerator
                          value={String(stall.code || stall.id)}
                          label={`Lapak ${stall.code || stall.number}`}
                        />
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
                      <div className="retribution-row">
                        <strong>Tarif:</strong>
                        {retributions.filter(r => r.stall_id === stall.id).length === 0 && (
                          <span className="no-data">-</span>
                        )}
                        {retributions.filter(r => r.stall_id === stall.id).map((r) => (
                          <div key={r.id} className="retribution-chip">
                            {retributionTypes.find(t => t.id === r.types_id)?.name}: Rp {Number(r.amount).toLocaleString('id-ID')}
                            <button onClick={() => handleDeleteRetribution(r.id)} className="btn-xs btn-delete">×</button>
                          </div>
                        ))}
                      </div>
                      <div className="retribution-form-row">
                        <select
                          value={selectedStallId === stall.id ? quickRetributionType : ''}
                          onChange={(e) => {
                            setSelectedStallId(stall.id)
                            setQuickRetributionType(e.target.value)
                          }}
                        >
                          <option value="">+ Tipe</option>
                          {retributionTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Nominal"
                          value={selectedStallId === stall.id ? quickRetributionAmount : ''}
                          onChange={(e) => {
                            setSelectedStallId(stall.id)
                            setQuickRetributionAmount(e.target.value)
                          }}
                        />
                          <button
                            onClick={async () => {
                              if (!quickRetributionType || !quickRetributionAmount) return
                              const supabase = getSupabaseClient()
                              await supabase.from('retribution_rates').insert([{ market_id: marketId, stall_id: stall.id, types_id: parseInt(quickRetributionType), amount: parseFloat(quickRetributionAmount) }])
                              setQuickRetributionType('')
                              setQuickRetributionAmount('')
                              setSelectedStallId(null)
                              loadData()
                            }}
                            className="btn-xs btn-primary"
                          >
                          Simpan
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