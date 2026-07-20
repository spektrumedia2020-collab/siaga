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
  description?: string
  theme_color?: string
  logo_url?: string
  head_user_id?: string
}

interface User {
  id: string
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
  const logoInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    address: '',
    photo_url: '',
    head_photo_url: '',
    head_user_id: '',
    status: 'AKTIF',
    description: '',
    theme_color: '#1f7a1f',
    logo_url: ''
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
      // Use relative API endpoint
      const res = await fetch(`/api/markets/${marketId}`)
      if (res.ok) {
        const data = await res.json()
        console.log('Market data loaded:', data)
        setMarket(data)
        setFormData(prev => ({
          ...prev,
          name: data.name || '',
          code: data.code || '',
          city: data.city || '',
          address: data.address || '',
          photo_url: data.photo_url || '',
          head_photo_url: data.head_photo_url || '',
          head_user_id: data.head_user_id || '',
          status: data.status || 'AKTIF',
          description: data.description || '',
          theme_color: data.theme_color || '#1f7a1f',
          logo_url: data.logo_url || ''
        }))
      } else {
        // Fallback: load from Supabase directly
        const supabase = getSupabaseClient()
        const { data } = await supabase
          .from('markets')
          .select('*')
          .eq('id', marketId)
          .single()
        
        if (data) {
          console.log('Market data loaded from Supabase:', data)
          setMarket(data)
          setFormData(prev => ({
            ...prev,
            name: data.name || '',
            code: data.code || '',
            city: data.city || '',
            address: data.address || '',
            photo_url: data.photo_url || '',
            head_photo_url: data.head_photo_url || '',
            head_user_id: data.head_user_id || '',
            status: data.status || 'AKTIF',
            description: data.description || '',
            theme_color: data.theme_color || '#1f7a1f',
            logo_url: data.logo_url || ''
          }))
        }
      }
    } catch (err) {
      console.error('Error loading market:', err)
    }
  }

  const loadUsers = async () => {
    try {
      // Use relative API endpoint
      const res = await fetch('/api/users/market-heads')
      if (res.ok) {
        const usersData = await res.json()
        console.log('Market heads loaded:', usersData)
        setUsers(usersData || [])
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const uploadPhoto = async (file: File, type: 'photo' | 'head' | 'logo'): Promise<string | null> => {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'head' | 'logo') => {
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
      } else if (type === 'head') {
        setFormData({ ...formData, head_photo_url: uploadedUrl })
      } else {
        setFormData({ ...formData, logo_url: uploadedUrl })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const res = await fetch(`/api/markets/${marketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        alert('Pasar berhasil diupdate!')
        onBack()
      } else {
        const error = await res.json()
        alert('Gagal update pasar: ' + (error.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error saving market:', err)
      alert('Gagal menyimpan pasar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="siaga-loading">
        <div>Memuat data pasar...</div>
      </div>
    )
  }

  if (!marketId || !market) {
    return (
      <div className="siaga-card">
        <h3>Tidak ada pasar yang dipilih</h3>
        <button className="siaga-btn siaga-btn-primary" onClick={onBack}>
          Kembali ke Manajemen Pasar
        </button>
      </div>
    )
  }

  return (
    <div className="siaga-card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h2 style={{ margin: 0 }}>✏️ Edit Pasar: {market.name}</h2>
        <button 
          className="siaga-btn siaga-btn-outline"
          onClick={onBack}
        >
          ← Kembali
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Nama Pasar</label>
              <input
                type="text"
                className="siaga-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kode Pasar</label>
              <input
                type="text"
                className="siaga-input"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kota</label>
              <input
                type="text"
                className="siaga-input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Alamat</label>
              <textarea
                className="siaga-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Deskripsi</label>
              <textarea
                className="siaga-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Deskripsi tentang pasar ini..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Status</label>
              <select
                className="siaga-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="AKTIF">Aktif</option>
                <option value="NONAKTIF">Non-Aktif</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Warna Tema</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={formData.theme_color}
                  onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                  style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="siaga-input"
                  value={formData.theme_color}
                  onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                  placeholder="#1f7a1f"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Logo Pasar</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {formData.logo_url && (
                  <img 
                    src={formData.logo_url} 
                    alt="Logo"
                    style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                )}
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'logo')}
                  style={{ display: 'none' }}
                />
                <button 
                  type="button"
                  className="siaga-btn siaga-btn-outline"
                  onClick={() => logoInputRef.current?.click()}
                >
                  📎 {formData.logo_url ? 'Ganti Logo' : 'Upload Logo'}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Foto Pasar</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {formData.photo_url && (
                  <img 
                    src={formData.photo_url} 
                    alt="Pasar"
                    style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'photo')}
                  style={{ display: 'none' }}
                />
                <button 
                  type="button"
                  className="siaga-btn siaga-btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎 {formData.photo_url ? 'Ganti Foto' : 'Upload Foto'}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kepala Pasar</label>
              <select
                className="siaga-input"
                value={formData.head_user_id}
                onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value })}
              >
                <option value="">-- Pilih Kepala Pasar --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Foto Kepala Pasar</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {formData.head_photo_url && (
                  <img 
                    src={formData.head_photo_url} 
                    alt="Kepala Pasar"
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%' }}
                  />
                )}
                <input
                  type="file"
                  ref={headPhotoInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'head')}
                  style={{ display: 'none' }}
                />
                <button 
                  type="button"
                  className="siaga-btn siaga-btn-outline"
                  onClick={() => headPhotoInputRef.current?.click()}
                >
                  📎 {formData.head_photo_url ? 'Ganti Foto' : 'Upload Foto'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button 
            type="submit" 
            className="siaga-btn siaga-btn-primary"
            disabled={saving}
          >
            {saving ? '💾 Menyimpan...' : '💾 Simpan Perubahan'}
          </button>
          <button 
            type="button"
            className="siaga-btn siaga-btn-outline"
            onClick={onBack}
            disabled={saving}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}