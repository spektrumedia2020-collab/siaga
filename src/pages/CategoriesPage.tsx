import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'

interface CategoriesPageProps {
  marketId?: string
}

interface Category {
  id: number
  name: string
  description?: string
  created_at?: string
}

export function CategoriesPage({ marketId }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [marketName, setMarketName] = useState('')

  const loadCategories = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('stall_categories')
        .select('*')
        .order('name')

      if (error) throw error

      setCategories((data || []).map((item: any) => ({
        id: item.id,
        name: item.name || item.nama_kategori || '-',
        description: item.description || item.keterangan || '',
        created_at: item.created_at || ''
      })))
    } catch (err: any) {
      const msg = err.message || 'Gagal memuat kategori'
      if (msg.toLowerCase().includes('could not find the table') || msg.toLowerCase().includes('schema cache')) {
        setError('Tabel kategori belum dibuat.')
      } else {
        setError(msg)
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

    loadCategories()
    fetchMarketName()
  }, [marketId])

  const resetForm = () => {
    setName('')
    setDescription('')
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama kategori wajib diisi')
      return
    }

    try {
      setSaving(true)
      setError('')
      const supabase = getSupabaseClient()
      const payload = {
        name: name.trim(),
        description: description.trim() || null
      }

      if (editingId) {
        const { error } = await supabase.from('stall_categories').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('stall_categories').insert([payload])
        if (error) throw error
      }

      resetForm()
      await loadCategories()
    } catch (err: any) {
      setError(err.message || (editingId ? 'Gagal mengubah kategori' : 'Gagal menambah kategori'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setName(category.name)
    setDescription(category.description || '')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus kategori ini?')) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('stall_categories').delete().eq('id', id)
      if (error) throw error
      await loadCategories()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus kategori')
    }
  }

  return (
    <div className="page-card">
      <h2>📂 Manajemen Kategori Lapak</h2>
      <p>Kelola kategori usaha di pasar, misalnya sayur-sayuran, kelontong, daging, dan lainnya.</p>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <strong>Pasar aktif:</strong> {marketName || marketId || 'Belum ditentukan'}
      </div>

      {error && <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Nama Kategori</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Sayur-sayuran"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Deskripsi (opsional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Kategori untuk penjualan sayur dan buah"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ width: 'fit-content' }}>
            {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ marginTop: 24 }}>
        <h3>Daftar Kategori ({categories.length})</h3>
        {loading ? (
          <p>Memuat kategori...</p>
        ) : categories.length === 0 ? (
          <p>Belum ada kategori yang ditambahkan.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {categories.map((category) => (
              <div key={category.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{category.name}</strong>
                  {category.description ? <div style={{ color: '#6b7280', fontSize: 13 }}>{category.description}</div> : null}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => handleEdit(category)}>
                    Edit
                  </button>
                  <button type="button" className="btn-delete-user" onClick={() => handleDelete(category.id)}>
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
