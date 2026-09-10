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

  const loadOwners = async () => {
    try {
      const supabase = getSupabaseClient()
      const query = supabase
        .from('stall_owners')
        .select('*')
        .order('name')

      const effectiveQuery = mode === 'superadmin' && selectedMarketId
        ? query.eq('market_id', Number(selectedMarketId))
        : query

      const { data, error } = await effectiveQuery

      if (error) throw error

      const mappedOwners = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name || '-',
        nik: item.nik || '',
        phone: item.phone || '',
        address: item.address || '',
        created_at: item.created_at || '',
        market_id: item.market_id
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
            if (data && data.length > 0 && !selectedMarketId) {
              setSelectedMarketId(String(data[0].id))
            }
          }
        } catch {
          setMarkets([])
        }
      }

      fetchMarkets()
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
        address: address.trim() || null,
        market_id: mode === 'superadmin' ? Number(selectedMarketId) : marketId ? Number(marketId) : null
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
      <h2>{mode === 'superadmin' ? '🧑‍💼 Manajemen Pedagang' : '👤 Manajemen Pemilik Lapak'}</h2>
      <p>{mode === 'superadmin' ? 'Kelola data pedagang/pemilik lapak pada semua pasar.' : 'Kelola data pemilik lapak yang terdaftar pada pasar ini.'}</p>

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
            {markets.map((market) => (
              <option key={market.id} value={market.id}>{market.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
          <strong>Pasar aktif:</strong> {marketName || marketId || 'Belum ditentukan'}
        </div>
      )}

      {error && <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ width: 'fit-content' }}>
            {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : (mode === 'superadmin' ? 'Tambah Pedagang' : 'Tambah Pemilik')}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ marginTop: 24 }}>
        <h3>{mode === 'superadmin' ? 'Daftar Pedagang' : 'Daftar Pemilik'} ({owners.length})</h3>
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
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 140 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top' }}><strong>{owner.name}</strong></td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#374151' }}>{owner.nik || '-'}</td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#374151' }}>{owner.address || '-'}</td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#374151' }}>{owner.phone || '-'}</td>
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" className="btn-secondary" onClick={() => handleEdit(owner)} style={{ padding: '6px 12px' }}>
                          View
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => handleEdit(owner)} style={{ padding: '6px 12px' }}>
                          Edit
                        </button>
                        <button type="button" className="btn-delete-user" onClick={() => setDeleteTarget(owner)} style={{ padding: '6px 12px' }}>
                          Delete
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
