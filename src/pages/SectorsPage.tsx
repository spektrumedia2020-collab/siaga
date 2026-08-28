import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Loading } from '../components/Loading'
import { EmptyState } from '../components/EmptyState'

interface SectorsPageProps {
  marketId?: string
}

interface Sector {
  id: number
  name: string
  code?: string
  market_id?: number
  officer_id?: number | null
  created_at?: string
}

interface Officer {
  id_user: number
  nama?: string
  email?: string
}

export function SectorsPage({ marketId }: SectorsPageProps) {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [officerId, setOfficerId] = useState('')
  const [officers, setOfficers] = useState<Officer[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [marketName, setMarketName] = useState('')

  const loadSectors = async () => {
    try {
      const supabase = getSupabaseClient()
      let query = supabase.from('market_sectors').select('*').order('name')

      if (marketId) {
        query = query.eq('market_id', Number(marketId))
      }

      const { data, error } = await query
      if (error) throw error
      setSectors((data || []) as Sector[])
    } catch (err: any) {
      setError(err.message || 'Gagal memuat sektor')
    } finally {
      setLoading(false)
    }
  }

  const loadOfficers = async () => {
    if (!marketId) {
      setOfficers([])
      return
    }

    try {
      const supabase = getSupabaseClient()
      const { data: officerRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'OFFICER')
        .maybeSingle()

      if (roleError) throw roleError
      if (!officerRole) {
        setOfficers([])
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('id_user, nama, email')
        .eq('market_id', Number(marketId))
        .eq('id_role', officerRole.id)
        .order('nama')

      if (error) throw error
      setOfficers((data || []) as Officer[])
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar petugas')
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

    loadSectors()
    loadOfficers()
    fetchMarketName()
  }, [marketId])

  const resetForm = () => {
    setName('')
    setCode('')
    setOfficerId('')
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama sektor wajib diisi')
      return
    }

    try {
      setSaving(true)
      setError('')
      const supabase = getSupabaseClient()
      const payload: any = {
        name: name.trim(),
        code: code.trim() || undefined,
        market_id: marketId ? Number(marketId) : null,
        officer_id: officerId ? Number(officerId) : null
      }

      if (editingId) {
        const { data, error } = await supabase
          .from('market_sectors')
          .update(payload)
          .eq('id', editingId)
          .select('id')
        if (error) throw error
        if (!data?.length) throw new Error('Assignment tidak tersimpan. Anda tidak memiliki izin mengubah sektor ini.')
      } else {
        const { error } = await supabase.from('market_sectors').insert([payload])
        if (error) throw error
      }

      resetForm()
      await loadSectors()
    } catch (err: any) {
      setError(err.message || (editingId ? 'Gagal mengubah sektor' : 'Gagal menambah sektor'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (sector: Sector) => {
    setEditingId(sector.id)
    setName(sector.name)
    setCode(sector.code || '')
    setOfficerId(sector.officer_id?.toString() || '')
  }

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (id: number) => {
    try {
      setDeleting(true)
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('market_sectors').delete().eq('id', id)
      if (error) throw error
      await loadSectors()
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus sektor')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="page-card">
      <h2>🏷️ Manajemen Sektor Pasar</h2>
      <p>Kelola sektor untuk pasar yang sedang dipilih.</p>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <strong>Pasar aktif:</strong> {marketName || marketId || 'Belum ditentukan'}
      </div>

      {error && <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Nama Sektor</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Blok A"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Kode Sektor (opsional)</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="A1"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Petugas Penarik</label>
          <select
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            disabled={!marketId || officers.length === 0}
          >
            <option value="">-- Belum ditugaskan --</option>
            {officers.map((officer) => (
              <option key={officer.id_user} value={officer.id_user}>
                {officer.nama || officer.email || `User ${officer.id_user}`}
                {officer.nama && officer.email ? ` (${officer.email})` : ''}
              </option>
            ))}
          </select>
          {!marketId ? <small>Pasar belum dipilih.</small> : null}
          {marketId && officers.length === 0 ? <small>Tidak ada user yang terdaftar di pasar ini.</small> : null}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ width: 'fit-content' }}>
            {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Sektor'}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ marginTop: 24 }}>
        <h3>Daftar Sektor</h3>
        {loading ? (
          <Loading label="Memuat sektor..." fullHeight={false} />
        ) : sectors.length === 0 ? (
          <EmptyState
            icon="🏷️"
            title="Belum ada sektor"
            subtitle="Tambahkan sektor untuk mengelompokkan lapak di pasar ini, misalnya Blok A atau Blok B."
          />
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {sectors.map((sector) => (
              <div key={sector.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{sector.name}</strong>
                  {sector.code ? <span style={{ marginLeft: 8, color: '#6b7280' }}>({sector.code})</span> : null}
                  <div style={{ marginTop: 4, color: '#6b7280', fontSize: 13 }}>
                    Petugas: {officers.find((officer) => officer.id_user === sector.officer_id)?.nama || 'Belum ditugaskan'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => handleEdit(sector)}>
                    Edit
                  </button>
                  <button type="button" className="btn-delete-user" onClick={() => setDeleteTarget({ id: sector.id, name: sector.name })}>
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Sektor"
        message={`Yakin hapus sektor "${deleteTarget?.name ?? ''}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        danger
        loading={deleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
