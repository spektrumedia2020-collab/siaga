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
        .select('id, name, code, city, address, photo_url, head_photo_url, head_user_id, status')
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
          head_user_id: data.head_user_id || '',
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
          head_user_id: formData.head_user_id,
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
    return <div className="siage-loading"><div>Memuat data pasar...</div></div>
  }

  if (!marketId || !market) {
    return (
      <div className="siage-card">
        <h3>Tidak ada pasar yang dipilih</h3>
        <button className="siage-btn siage-btn-primary" onClick={onBack}>Kembali ke Manajemen Pasar</button>
      </div>
    )
  }

  return (
    <div className="siage-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: 0 }}>✏️ Edit Pasar: {market.name}</h2>
        <button className="siage-btn siage-btn-outline" onClick={onBack}>← Kembali</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Nama Pasar</label><input type="text" className="siage-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kode Pasar</label><input type="text" className="siage-input" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required /></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kota</label><input type="text" className="siage-input" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required /></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Alamat</label><textarea className="siage-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3} /></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Status</label><select className="siage-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="AKTIF">Aktif</option><option value="NONAKTIF">Non-Aktif</option></select></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Foto Pasar</label><div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{formData.photo_url && <img src={formData.photo_url} alt="Pasar" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px' }} />}<input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} style={{ display: 'none' }} /><button type="button" className="siage-btn siage-btn-outline" onClick={() => fileInputRef.current?.click()}>📎 {formData.photo_url ? 'Ganti Foto' : 'Upload Foto'}</button></div></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kepala Pasar</label><select className="siage-input" value={formData.head_user_id} onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value })}><option value="">-- Pilih Kepala Pasar --</option>{users.map(user => (<option key={user.id} value={user.id}>{user.full_name || user.email}</option>))}</select></div>
            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Foto Kepala Pasar</label><div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{formData.head_photo_url && <img src={formData.head_photo_url} alt="Kepala Pasar" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%' }} />}<input type="file" ref={headPhotoInputRef} accept="image/*" onChange={(e) => handleFileChange(e, 'head')} style={{ display: 'none' }} /><button type="button" className="siage-btn siage-btn-outline" onClick={() => headPhotoInputRef.current?.click()}>📎 {formData.head_photo_url ? 'Ganti Foto' : 'Upload Foto'}</button></div></div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button type="submit" className="siage-btn siage-btn-primary" disabled={saving}>{saving ? '💾 Menyimpan...' : '💾 Simpan Perubahan'}</button>
          <button type="button" className="siage-btn siage-btn-outline" onClick={onBack} disabled={saving}>Batal</button>
        </div>
      </form>
    </div>
  )
}