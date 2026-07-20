import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { DEFAULT_RETRIBUTION_TYPES } from '../lib/retributionMasterData'

interface RetribusiPageProps {
  marketId?: string
}

interface RetribusiItem {
  id: number
  name: string
  amount: number
  description?: string
  created_at?: string
}

export function RetribusiPage({ marketId }: RetribusiPageProps) {
  const [items, setItems] = useState<RetribusiItem[]>([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [marketName, setMarketName] = useState('')

  const loadItems = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('market_retribusi')
        .select('*')
        .order('name')

      if (error) throw error

      setItems((data || []).map((item: any) => ({
        id: item.id,
        name: item.name || item.jenis_retribusi || '-',
        amount: Number(item.amount || item.tarif || 0),
        description: item.description || item.keterangan || '',
        created_at: item.created_at || ''
      })))
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data retribusi')
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

    loadItems()
    fetchMarketName()
  }, [marketId])

  const resetForm = () => {
    setName('')
    setSelectedType('')
    setAmount('')
    setDescription('')
    setEditingId(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama retribusi wajib diisi')
      return
    }

    try {
      setSaving(true)
      setError('')
      const supabase = getSupabaseClient()
      const resolvedName = (selectedType && DEFAULT_RETRIBUTION_TYPES.find((item) => item.id === selectedType)?.name) || name.trim()
      const payload = {
        name: resolvedName,
        amount: Number(amount) || 0,
        description: description.trim() || null
      }

      if (editingId) {
        const { error } = await supabase.from('market_retribusi').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('market_retribusi').insert([payload])
        if (error) throw error
      }

      resetForm()
      await loadItems()
    } catch (err: any) {
      setError(err.message || (editingId ? 'Gagal mengubah retribusi' : 'Gagal menambah retribusi'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: RetribusiItem) => {
    setEditingId(item.id)
    const matchedType = DEFAULT_RETRIBUTION_TYPES.find((option) => option.name === item.name)
    setSelectedType(matchedType?.id || '')
    setName(item.name)
    setAmount(String(item.amount))
    setDescription(item.description || '')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus data retribusi ini?')) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('market_retribusi').delete().eq('id', id)
      if (error) throw error
      await loadItems()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus retribusi')
    }
  }

  return (
    <div className="page-card">
      <h2>💰 Manajemen Retribusi</h2>
      <p>Kelola jenis retribusi dan tarif yang berlaku di pasar.</p>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <strong>Pasar aktif:</strong> {marketName || marketId || 'Belum ditentukan'}
      </div>

      {error && <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Jenis Retribusi</label>
          <select
            value={selectedType}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const nextType = e.target.value
              setSelectedType(nextType)
              const matched = DEFAULT_RETRIBUTION_TYPES.find((item) => item.id === nextType)
              setName(matched?.name || '')
            }}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            required
          >
            <option value="">-- Pilih jenis retribusi --</option>
            {DEFAULT_RETRIBUTION_TYPES.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Tarif (Rp)</label>
          <input
            type="number"
            value={amount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
            placeholder="50000"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            min="0"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Keterangan (opsional)</label>
          <input
            value={description}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            placeholder="Contoh: Tarif bulanan untuk pedagang tetap"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ width: 'fit-content' }}>
            {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Retribusi'}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ marginTop: 24 }}>
        <h3>Master Data Jenis Retribusi</h3>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e5e7eb' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Kode</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Nama</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Kategori</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Satuan</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Dasar Tarif</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_RETRIBUTION_TYPES.map((option) => (
                <tr key={option.id}>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{option.code}</td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{option.name}</td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{option.category}</td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{option.unit}</td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{option.base_tariff_note || '-'}</td>
                  <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{option.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Daftar Retribusi ({items.length})</h3>
        {loading ? (
          <p>Memuat data retribusi...</p>
        ) : items.length === 0 ? (
          <p>Belum ada data retribusi.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {items.map((item) => (
              <div key={item.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    Tarif: Rp {item.amount.toLocaleString('id-ID')}
                    {item.description ? ` • ${item.description}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => handleEdit(item)}>
                    Edit
                  </button>
                  <button type="button" className="btn-delete-user" onClick={() => handleDelete(item.id)}>
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
