import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Loading } from '../components/Loading'
import { EmptyState } from '../components/EmptyState'

interface RetribusiPageProps {
  marketId?: string
  readOnly?: boolean
}

interface RetribusiItem {
  id: number
  name: string
  amount: number
  description?: string
  billingPeriod: 'HARIAN' | 'BULANAN' | 'TAHUNAN'
  allowInstallment: boolean
  created_at?: string
}

export function RetribusiPage({ marketId, readOnly = false }: RetribusiPageProps) {
  const [items, setItems] = useState<RetribusiItem[]>([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<'HARIAN' | 'BULANAN' | 'TAHUNAN'>('HARIAN')
  const [allowInstallment, setAllowInstallment] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [marketName, setMarketName] = useState('')

  const loadItems = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('retribution_types')
        .select('*')
        .order('name')

      if (error) throw error

      setItems((data || []).map((item: any) => ({
        id: item.id,
        name: item.name || item.jenis_retribusi || '-',
        amount: Number(item.amount || item.tarif || 0),
        description: item.description || item.keterangan || '',
        billingPeriod: (item.billing_period || 'HARIAN') as 'HARIAN' | 'BULANAN' | 'TAHUNAN',
        allowInstallment: Boolean(item.allow_installment),
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
    setAmount('')
    setDescription('')
    setBillingPeriod('HARIAN')
    setAllowInstallment(false)
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
      const payload = {
        name: name.trim(),
        amount: Number(amount) || 0,
        description: description.trim() || null,
        billing_period: billingPeriod,
        allow_installment: billingPeriod === 'TAHUNAN' ? allowInstallment : false
      }

      if (editingId) {
        const { error } = await supabase.from('retribution_types').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('retribution_types').insert([payload])
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
    setName(item.name)
    setAmount(String(item.amount))
    setDescription(item.description || '')
    setBillingPeriod(item.billingPeriod)
    setAllowInstallment(item.allowInstallment)
  }

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (id: number) => {
    try {
      setDeleting(true)
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('retribution_types').delete().eq('id', id)
      if (error) throw error
      await loadItems()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus retribusi')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
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

      {!readOnly && (
        <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Jenis Retribusi</label>
          <input
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Contoh: Retribusi Harian"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            required
          />
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
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Periode Tagihan</label>
          <select
            value={billingPeriod}
            onChange={(e) => {
              const next = e.target.value as 'HARIAN' | 'BULANAN' | 'TAHUNAN'
              setBillingPeriod(next)
              if (next !== 'TAHUNAN') setAllowInstallment(false)
            }}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            <option value="HARIAN">Harian</option>
            <option value="BULANAN">Bulanan</option>
            <option value="TAHUNAN">Tahunan</option>
          </select>
        </div>
        {billingPeriod === 'TAHUNAN' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={allowInstallment}
              onChange={(e) => setAllowInstallment(e.target.checked)}
            />
            Boleh dibayar mencicil (sisa tahun lalu menjadi tunggakan)
          </label>
        )}
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
      )}

      <div style={{ marginTop: 24 }}>
        <h3>Daftar Retribusi ({items.length})</h3>
        {loading ? (
          <Loading label="Memuat data retribusi..." fullHeight={false} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="💰"
            title="Belum ada data retribusi"
            subtitle="Tambahkan jenis retribusi dan tarif yang berlaku di pasar ini."
          />
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {items.map((item) => (
              <div key={item.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    Tarif: Rp {item.amount.toLocaleString('id-ID')}
                    {` • ${item.billingPeriod === 'TAHUNAN' ? 'Tahunan' : item.billingPeriod === 'BULANAN' ? 'Bulanan' : 'Harian'}`}
                    {item.billingPeriod === 'TAHUNAN' && item.allowInstallment ? ' • boleh dicicil' : ''}
                    {item.description ? ` • ${item.description}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!readOnly && (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => handleEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className="btn-delete-user" onClick={() => setDeleteTarget({ id: item.id, name: (item as any).nama_retribusi || (item as any).name || `#${item.id}` })}>
                        Hapus
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Data Retribusi"
        message={`Yakin hapus data retribusi "${deleteTarget?.name ?? ''}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        danger
        loading={deleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
