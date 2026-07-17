import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'

interface OwnersPageProps {
  marketId?: string
}

interface Owner {
  id: number
  name: string
  nik?: string
  phone?: string
  address?: string
  created_at?: string
}

export function OwnersPage({ marketId }: OwnersPageProps) {
  const [owners, setOwners] = useState<Owner[]>([])
  const [name, setName] = useState('')
  const [nik, setNik] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [marketName, setMarketName] = useState('')

  const loadOwners = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from('stall_owners').select('*').order('name')

      if (error) throw error

      const mappedOwners = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name || item.nama_pemilik || '-',
        nik: item.nik || item.nik_pemilik || '',
        phone: item.phone || item.telepon || '',
        address: item.address || item.alamat || '',
        created_at: item.created_at || item.tanggal_daftar || ''
      }))

      setOwners(mappedOwners)
    } catch (err: any) {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('pemilik_lapak')
          .select('id_pemilik, nama_pemilik, nik')
          .order('nama_pemilik')

        if (error) throw error

        setOwners((data || []).map((item: any) => ({
          id: item.id_pemilik,
          name: item.nama_pemilik || '-',
          nik: item.nik || '',
          phone: '',
          address: '',
          created_at: ''
        })))
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Gagal memuat data pemilik lapak')
      }
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

    loadOwners()
    fetchMarketName()
  }, [marketId])

  const resetForm = () => {
    setName('')
    setNik('')
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama pemilik wajib diisi')
      return
    }

    try {
      setSaving(true)
      setError('')
      const supabase = getSupabaseClient()
      const payload = {
        name: name.trim(),
        nik: nik.trim() || null
      }

      if (editingId) {
        const { error } = await supabase.from('stall_owners').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('stall_owners').insert([payload])
        if (error) throw error
      }

      resetForm()
      await loadOwners()
    } catch (err: any) {
      try {
        const supabase = getSupabaseClient()
        const fallbackPayload = {
          nama_pemilik: name.trim(),
          nik: nik.trim() || null
        }

        if (editingId) {
          const { error } = await supabase.from('pemilik_lapak').update(fallbackPayload).eq('id_pemilik', editingId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('pemilik_lapak').insert([fallbackPayload])
          if (error) throw error
        }

        resetForm()
        await loadOwners()
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || (editingId ? 'Gagal mengubah pemilik lapak' : 'Gagal menambah pemilik lapak'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (owner: Owner) => {
    setEditingId(owner.id)
    setName(owner.name)
    setNik(owner.nik || '')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus pemilik ini?')) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('stall_owners').delete().eq('id', id)
      if (error) throw error
      await loadOwners()
    } catch (err: any) {
      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.from('pemilik_lapak').delete().eq('id_pemilik', id)
        if (error) throw error
        await loadOwners()
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Gagal menghapus pemilik lapak')
      }
    }
  }

  return (
    <div className="page-card">
      <h2>👤 Manajemen Pemilik Lapak</h2>
      <p>Kelola data pemilik lapak yang terdaftar pada pasar ini.</p>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <strong>Pasar aktif:</strong> {marketName || marketId || 'Belum ditentukan'}
      </div>

      {error && <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Nama Pemilik</label>
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ width: 'fit-content' }}>
            {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Pemilik'}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ marginTop: 24 }}>
        <h3>Daftar Pemilik ({owners.length})</h3>
        {loading ? (
          <p>Memuat pemilik lapak...</p>
        ) : owners.length === 0 ? (
          <p>Belum ada pemilik lapak yang terdaftar.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {owners.map((owner) => (
              <div key={owner.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{owner.name}</strong>
                  {owner.nik ? <div style={{ color: '#6b7280', fontSize: 13 }}>NIK: {owner.nik}</div> : null}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => handleEdit(owner)}>
                    Edit
                  </button>
                  <button type="button" className="btn-delete-user" onClick={() => handleDelete(owner.id)}>
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
