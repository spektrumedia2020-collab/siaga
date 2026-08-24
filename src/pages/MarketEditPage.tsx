import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import '../styles/layout.css'

interface Market {
  id: number
  name: string
  code: string
  city: string
  address?: string
  photo_url?: string
  head_photo_url?: string
  status: string
  head_user_id?: string
}

interface User {
  id: number
  email: string
  full_name?: string
}

interface Props {
  marketId: number | null
  onBack: () => void
}

export function MarketEditPage({ marketId, onBack }: Props) {
  const [market, setMarket] = useState<Market | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const headPhotoInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    address: '',
    photo_url: '',
    head_photo_url: '',
    head_user_id: '',
    status: 'AKTIF'
  })

  useEffect(() => {
    if (marketId) {
      const init = async () => {
        await loadUsers()
        await loadMarket()
        setLoading(false)
      }
      init()
    } else {
      setLoading(false)
    }
  }, [marketId])

  const loadMarket = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('markets')
        .select('id, name, code, city, address, photo_url, head_photo_url, id_head_market, status')
        .eq('id', marketId)
        .single()
      
      if (data) {
        setMarket(data)
        setFormData({
          name: data.name || '',
          code: data.code || '',
          city: data.city || '',
          address: data.address || '',
          photo_url: data.photo_url || '',
          head_photo_url: data.head_photo_url || '',
          head_user_id: data.id_head_market ? String(data.id_head_market) : '',
          status: data.status || 'AKTIF'
        })
      }
    } catch (err) {
      console.error('Error loading market:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: usersData } = await supabase
        .from('users')
        .select('id_user, email, nama')

      setUsers((usersData || []).map((u: any) => ({
        id: u.id_user,
        email: u.email,
        full_name: u.nama || u.email
      })))
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const uploadPhoto = async (file: File, type: 'photo' | 'head'): Promise<string | null> => {
    try {
      const supabase = getSupabaseClient()
      const bucket = 'Data Siaga'
      const fileName = `${type}_${Date.now()}_${file.name}`
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      return publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      alert('Gagal upload foto: ' + (err as Error).message)
      return null
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'head') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB')
      return
    }

    const uploadedUrl = await uploadPhoto(file, type)
    if (uploadedUrl) {
      if (type === 'photo') {
        setFormData({ ...formData, photo_url: uploadedUrl })
      } else {
        setFormData({ ...formData, head_photo_url: uploadedUrl })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('markets')
        .update({
          name: formData.name,
          code: formData.code,
          city: formData.city,
          address: formData.address,
          photo_url: formData.photo_url,
          head_photo_url: formData.head_photo_url,
          id_head_market: formData.head_user_id ? parseInt(formData.head_user_id, 10) : null,
          status: formData.status
        })
        .eq('id', marketId)

      if (!error) {
        alert('Pasar berhasil diupdate!')
        onBack()
      } else {
        alert('Gagal update pasar: ' + error.message)
      }
    } catch (err) {
      console.error('Error saving market:', err)
      alert('Gagal menyimpan pasar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="siaga-loading"><div>Memuat data pasar...</div></div>
  }

  if (!marketId || !market) {
    return (
      <div className="siaga-card">
        <h3>Tidak ada pasar yang dipilih</h3>
        <button className="siaga-btn siaga-btn-primary" onClick={onBack}>Kembali ke Manajemen Pasar</button>
      </div>
    )
  }

  return (
    <div className="siaga-card" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="siaga-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#2D5016' }}>✏️ Edit Pasar: {market.name}</h2>
        <button className="siaga-btn siaga-btn-outline" onClick={onBack}>← Kembali</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="siaga-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Kolom kiri: info pasar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label>Nama Pasar</label><input type="text" className="siaga-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div className="form-group"><label>Kode Pasar</label><input type="text" className="siaga-input" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required /></div>
            <div className="form-group"><label>Kota</label><input type="text" className="siaga-input" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required /></div>
            <div className="form-group"><label>Alamat</label><textarea className="siaga-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3} /></div>
            <div className="form-group"><label>Status</label><select className="siaga-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="AKTIF">Aktif</option><option value="NONAKTIF">Non-Aktif</option></select></div>
          </div>

          {/* Kolom kanan: foto & kepala pasar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Foto Pasar</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {formData.photo_url && <img src={formData.photo_url} alt="Pasar" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />}
                <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} style={{ display: 'none' }} />
                <button type="button" className="siaga-btn siaga-btn-outline" onClick={() => fileInputRef.current?.click()}>📎 {formData.photo_url ? 'Ganti Foto' : 'Upload Foto'}</button>
              </div>
            </div>
            <div className="form-group"><label>Kepala Pasar</label><select className="siaga-input" value={formData.head_user_id} onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value })}><option value="">-- Pilih Kepala Pasar --</option>{users.map(user => (<option key={user.id} value={user.id}>{user.full_name || user.email}</option>))}</select></div>
            <div className="form-group">
              <label>Foto Kepala Pasar</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {formData.head_photo_url && <img src={formData.head_photo_url} alt="Kepala Pasar" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%', border: '2px solid #2D5016' }} />}
                <input type="file" ref={headPhotoInputRef} accept="image/*" onChange={(e) => handleFileChange(e, 'head')} style={{ display: 'none' }} />
                <button type="button" className="siaga-btn siaga-btn-outline" onClick={() => headPhotoInputRef.current?.click()}>📎 {formData.head_photo_url ? 'Ganti Foto' : 'Upload Foto'}</button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
          <button type="submit" className="siaga-btn siaga-btn-primary" disabled={saving}>{saving ? '💾 Menyimpan...' : '💾 Simpan Perubahan'}</button>
          <button type="button" className="siaga-btn siaga-btn-outline" onClick={onBack} disabled={saving}>Batal</button>
        </div>
      </form>
    </div>
  )
}