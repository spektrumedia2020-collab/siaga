import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Loading } from '../components/Loading'
import { EmptyState } from '../components/EmptyState'

interface OwnersPageProps {
  marketId?: string
  mode?: 'market' | 'superadmin'
}

interface Owner {
  id: number
  name: string
  nik?: string
  phone?: string
  address?: string
  created_at?: string
  stalls?: Array<{
    id: number
    code?: string
    number?: string
    status?: string
  }>
}

export function OwnersPage({ marketId, mode = 'market' }: OwnersPageProps) {
  const [owners, setOwners] = useState<Owner[]>([])
  const [name, setName] = useState('')
  const [nik, setNik] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [marketName, setMarketName] = useState('')
  const [markets, setMarkets] = useState<Array<{ id: number; name: string }>>([])
  const [selectedMarketId, setSelectedMarketId] = useState<string>('')
  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStallModalOpen, setIsStallModalOpen] = useState(false)
  const [stallOwner, setStallOwner] = useState<Owner | null>(null)
  const [editingStallId, setEditingStallId] = useState<number | null>(null)
  const [stallForm, setStallForm] = useState({
    code: '',
    number: '',
    sector_id: '',
    category_id: '',
    status: 'AKTIF'
  })
  const [sectors, setSectors] = useState<Array<{ id: number; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])

  const selectedMarket = markets.find((market) => String(market.id) === selectedMarketId)

  const loadOwners = async () => {
    try {
      if (mode === 'superadmin' && !selectedMarketId) {
        setOwners([])
        return
      }

      const supabase = getSupabaseClient()
      const { data: ownersData, error: ownersError } = await supabase
        .from('stall_owners')
        .select('*')
        .order('name')

      if (ownersError) throw ownersError

      const marketFilterId = mode === 'superadmin' ? selectedMarketId : marketId

      let filteredOwners = ownersData || []
      let stallsByOwner = new Map<number, any[]>()

      if (marketFilterId) {
        const { data: stallRows, error: stallsError } = await supabase
          .from('stalls')
          .select('id, owner_id, code, number, status, sector_id, category_id')
          .eq('market_id', Number(marketFilterId))
          .order('code', { ascending: true })

        if (stallsError) throw stallsError

        const matchingOwnerIds = new Set(
          (stallRows || [])
            .map((stall: any) => Number(stall.owner_id))
            .filter((ownerId) => !Number.isNaN(ownerId))
        )

        for (const stall of stallRows || []) {
          const ownerId = Number(stall.owner_id)
          if (Number.isNaN(ownerId)) continue

          const currentStalls = stallsByOwner.get(ownerId) || []
          currentStalls.push(stall)
          stallsByOwner.set(ownerId, currentStalls)
        }

        filteredOwners = (ownersData || []).filter((owner: any) => matchingOwnerIds.has(owner.id))
      }

      const mappedOwners = filteredOwners.map((item: any) => ({
        id: item.id,
        name: item.name || '-',
        nik: item.nik || '',
        phone: item.phone || '',
        address: item.address || '',
        created_at: item.created_at || '',
        stalls: (stallsByOwner.get(item.id) || []).map((stall: any) => ({
          id: stall.id,
          code: stall.code || '',
          number: stall.number || '',
          status: stall.status || '',
          sector_id: stall.sector_id ?? null,
          category_id: stall.category_id ?? null
        }))
      }))

      setOwners(mappedOwners)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data pemilik lapak')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchMarketName = async () => {
      if (!marketId) {
        setMarketName('')
        return
      }

      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('markets')
          .select('name')
          .eq('id', Number(marketId))
          .single()

        if (!error && data?.name) {
          setMarketName(data.name)
        } else {
          setMarketName('')
        }
      } catch {
        setMarketName('')
      }
    }

    const loadMarketMetadata = async () => {
      if (mode !== 'superadmin' || !selectedMarketId) {
        setSectors([])
        setCategories([])
        return
      }

      try {
        const supabase = getSupabaseClient()
        const [sectorsResult, categoriesResult] = await Promise.all([
          supabase
            .from('market_sectors')
            .select('id, name')
            .eq('market_id', Number(selectedMarketId))
            .order('name'),
          supabase
            .from('stall_categories')
            .select('id, name')
            .order('name')
        ])

        if (!sectorsResult.error) {
          setSectors((sectorsResult.data || []).map((sector: any) => ({ id: sector.id, name: sector.name })))
        } else {
          setSectors([])
        }

        if (!categoriesResult.error) {
          setCategories((categoriesResult.data || []).map((category: any) => ({ id: category.id, name: category.name })))
        } else {
          setCategories([])
        }
      } catch {
        setSectors([])
        setCategories([])
      }
    }

    if (mode === 'superadmin') {
      const fetchMarkets = async () => {
        try {
          const supabase = getSupabaseClient()
          const { data, error } = await supabase
            .from('markets')
            .select('id, name')
            .order('name')

          if (!error) {
            setMarkets(data || [])
          }
        } catch {
          setMarkets([])
        }
      }

      fetchMarkets()
      loadMarketMetadata()
    }

    loadOwners()
    fetchMarketName()
  }, [marketId, mode, selectedMarketId])

  const resetForm = () => {
    setName('')
    setNik('')
    setPhone('')
    setAddress('')
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama pemilik wajib diisi')
      return
    }

    if (mode === 'superadmin' && !selectedMarketId) {
      setError('Pilih pasar terlebih dahulu')
      return
    }

    try {
      setSaving(true)
      setError('')
      const supabase = getSupabaseClient()
      const payload = {
        name: name.trim(),
        nik: nik.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null
      }

      if (editingId) {
        const { error } = await supabase
          .from('stall_owners')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('stall_owners')
          .insert([payload])

        if (error) throw error
      }

      resetForm()
      setIsModalOpen(false)
      await loadOwners()
    } catch (err: any) {
      setError(err.message || (editingId ? 'Gagal mengubah pemilik lapak' : 'Gagal menambah pemilik lapak'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (owner: Owner) => {
    setEditingId(owner.id)
    setName(owner.name)
    setNik(owner.nik || '')
    setPhone(owner.phone || '')
    setAddress(owner.address || '')
    setIsModalOpen(true)
  }

  const handleOpenStallModal = (owner: Owner, stall?: { id?: number; code?: string; number?: string; sector_id?: number | null; category_id?: number | null; status?: string }) => {
    setStallOwner(owner)
    setEditingStallId(stall?.id ?? null)
    setStallForm({
      code: stall?.code || '',
      number: stall?.number || '',
      sector_id: stall?.sector_id ? String(stall.sector_id) : '',
      category_id: stall?.category_id ? String(stall.category_id) : '',
      status: stall?.status || 'AKTIF'
    })
    setIsStallModalOpen(true)
  }

  const handleSaveStall = async (e: React.FormEvent) => {
    e.preventDefault()

    const stallMarketId = Number(selectedMarketId || marketId || 0)

    if (!stallOwner || !stallMarketId) {
      setError('Pilih pasar dan pedagang terlebih dahulu')
      return
    }

    if (!stallForm.code.trim() || !stallForm.number.trim()) {
      setError('Kode dan nomor lapak wajib diisi')
      return
    }

    try {
      const supabase = getSupabaseClient()
      const payload = {
        market_id: stallMarketId,
        owner_id: stallOwner.id,
        code: stallForm.code.trim(),
        number: stallForm.number.trim(),
        sector_id: stallForm.sector_id ? Number(stallForm.sector_id) : null,
        category_id: stallForm.category_id ? Number(stallForm.category_id) : null,
        status: stallForm.status
      }

      if (editingStallId) {
        const { error } = await supabase
          .from('stalls')
          .update(payload)
          .eq('id', editingStallId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('stalls')
          .insert([payload])

        if (error) throw error
      }

      setError('')
      setIsStallModalOpen(false)
      setStallOwner(null)
      setEditingStallId(null)
      setStallForm({ code: '', number: '', sector_id: '', category_id: '', status: 'AKTIF' })
      await loadOwners()
    } catch (err: any) {
      setError(err.message || (editingStallId ? 'Gagal memperbarui lapak' : 'Gagal menambahkan lapak'))
    }
  }

  const handleDeleteStall = async (stallId: number) => {
    if (!window.confirm('Yakin hapus lapak ini?')) {
      return
    }

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('stalls')
        .delete()
        .eq('id', stallId)

      if (error) throw error

      await loadOwners()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus lapak')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setDeleting(true)
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('stall_owners')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadOwners()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus pemilik lapak')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="page-card">
      {mode !== 'superadmin' ? (
        <>
          <h2>👤 Manajemen Pemilik Lapak</h2>
          <p>Kelola data pemilik lapak yang terdaftar pada pasar ini.</p>
        </>
      ) : (
        <p>Kelola data pedagang/pemilik lapak pada semua pasar.</p>
      )}

      {mode === 'superadmin' ? (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Filter Pasar</label>
          <select
            className="siage-input"
            value={selectedMarketId}
            onChange={(e) => {
              setSelectedMarketId(e.target.value)
              setLoading(true)
            }}
            style={{ width: '100%' }}
          >
            <option value="">Pilih pasar</option>
            {markets.map((market) => (
              <option key={market.id} value={market.id}>{market.name}</option>
            ))}
          </select>

          {selectedMarket && (
            <div style={{ marginTop: 12, fontWeight: 600, color: '#1f2937' }}>
              {selectedMarket.name} • Total pedagang: {owners.length}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
          <strong>Pasar aktif:</strong> {marketName || marketId || 'Belum ditentukan'}
        </div>
      )}

      {error && <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>}

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>{mode === 'superadmin' ? 'Daftar Pedagang' : 'Daftar Pemilik'} ({owners.length})</h3>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
          >
            {mode === 'superadmin' ? 'Tambah Pedagang' : 'Tambah Pemilik'}
          </button>
        </div>
        {loading ? (
          <Loading label="Memuat pemilik lapak..." fullHeight={false} />
        ) : owners.length === 0 ? (
          <EmptyState
            icon="👤"
            title={mode === 'superadmin' ? 'Belum ada pedagang' : 'Belum ada pemilik lapak'}
            subtitle={mode === 'superadmin' ? 'Daftarkan pedagang untuk menghubungkannya dengan pasar yang dipilih.' : 'Daftarkan pemilik lapak untuk menghubungkannya dengan data lapak.'}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Nama</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>NIK</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Alamat</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Telepon</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', minWidth: 180 }}>Lapak</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 220 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top' }}><strong>{owner.name}</strong></td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#374151' }}>{owner.nik || '-'}</td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#374151' }}>{owner.address || '-'}</td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#374151' }}>{owner.phone || '-'}</td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#374151' }}>
                      {owner.stalls && owner.stalls.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {owner.stalls.map((stall) => (
                            <div
                              key={stall.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#e0f2fe',
                                border: '1px solid #7dd3fc',
                                borderRadius: 999,
                                padding: '4px 6px 4px 8px'
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', color: '#0f172a' }}>
                                {stall.code || '-'} / {stall.number || '-'}
                              </span>
                              <button
                                type="button"
                                title="Edit lapak"
                                onClick={() => handleOpenStallModal(owner, stall)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: 12,
                                  lineHeight: 1
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                title="Hapus lapak"
                                onClick={() => handleDeleteStall(stall.id)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: 12,
                                  lineHeight: 1
                                }}
                              >
                                🗑
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          title="View"
                          onClick={() => handleEdit(owner)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #2563eb',
                            background: '#dbeafe',
                            color: '#1e3a8a',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 12,
                            lineHeight: 1
                          }}
                        >
                          👁
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => handleEdit(owner)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #16a34a',
                            background: '#dcfce7',
                            color: '#166534',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 12,
                            lineHeight: 1
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          title="Lapak"
                          onClick={() => handleOpenStallModal(owner)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #7c3aed',
                            background: '#ede9fe',
                            color: '#5b21b6',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 12,
                            lineHeight: 1
                          }}
                        >
                          🏪
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setDeleteTarget(owner)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #dc2626',
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 12,
                            lineHeight: 1
                          }}
                        >
                          🗑
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

      {isStallModalOpen && stallOwner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1200
          }}
          onClick={() => {
            setIsStallModalOpen(false)
            setStallOwner(null)
            setStallForm({ code: '', number: '', sector_id: '', category_id: '', status: 'AKTIF' })
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: 'min(680px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              padding: 24
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editingStallId ? 'Edit Lapak untuk' : 'Tambah Lapak untuk'} {stallOwner.name}</h3>
              <button
                type="button"
                onClick={() => {
                  setIsStallModalOpen(false)
                  setStallOwner(null)
                  setStallForm({ code: '', number: '', sector_id: '', category_id: '', status: 'AKTIF' })
                }}
                style={{
                  background: '#e5e7eb',
                  color: '#111827',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveStall} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Kode Lapak</label>
                <input
                  value={stallForm.code}
                  onChange={(e) => setStallForm({ ...stallForm, code: e.target.value })}
                  placeholder="LP001"
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Nomor Lapak</label>
                <input
                  value={stallForm.number}
                  onChange={(e) => setStallForm({ ...stallForm, number: e.target.value })}
                  placeholder="01"
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Sektor Pasar</label>
                <select
                  value={stallForm.sector_id}
                  onChange={(e) => setStallForm({ ...stallForm, sector_id: e.target.value })}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                >
                  <option value="">-- Pilih Sektor --</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={String(sector.id)}>{sector.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Kategori Lapak</label>
                <select
                  value={stallForm.category_id}
                  onChange={(e) => setStallForm({ ...stallForm, category_id: e.target.value })}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Status</label>
                <select
                  value={stallForm.status}
                  onChange={(e) => setStallForm({ ...stallForm, status: e.target.value })}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="NONAKTIF">NONAKTIF</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsStallModalOpen(false)
                    setStallOwner(null)
                    setEditingStallId(null)
                    setStallForm({ code: '', number: '', sector_id: '', category_id: '', status: 'AKTIF' })
                  }}
                  style={{
                    background: '#e5e7eb',
                    color: '#111827',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: '1px solid #1d4ed8',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {editingStallId ? 'Simpan Perubahan' : 'Simpan Lapak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000
          }}
          onClick={() => {
            setIsModalOpen(false)
            resetForm()
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              width: 'min(680px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              padding: 24
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editingId ? 'Edit' : 'Tambah'} {mode === 'superadmin' ? 'Pedagang' : 'Pemilik'}</h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  resetForm()
                }}
                style={{
                  background: '#e5e7eb',
                  color: '#111827',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>{mode === 'superadmin' ? 'Nama Pedagang' : 'Nama Pemilik'}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>NIK (opsional)</label>
                <input
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder="3201010101010001"
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Alamat</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Pannampu No. 10, Makassar"
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Telepon</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  style={{
                    background: '#e5e7eb',
                    color: '#111827',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: saving ? '#93c5fd' : '#2563eb',
                    color: '#ffffff',
                    border: '1px solid #1d4ed8',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.8 : 1
                  }}
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : (mode === 'superadmin' ? 'Tambah Pedagang' : 'Tambah Pemilik')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Pemilik Lapak"
        message={`Yakin hapus pemilik "${deleteTarget?.name ?? ''}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        danger
        loading={deleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
