import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { setImpersonateSession, UserRole } from '../lib/roleUtils'
import '../styles/layout.css'
import './SuperAdminDashboardImproved.css'

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
  head_name?: string
}

interface User {
  id: string
  email: string
  full_name?: string
}

interface Props {
  onImpersonate?: (userId: string, role: UserRole) => void
}

export function MarketsManagement({ onImpersonate }: Props) {
  const [markets, setMarkets] = useState<Market[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [headPhotoPreview, setHeadPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const headPhotoInputRef = useRef<HTMLInputElement>(null)
  const [impersonatingMarketId, setImpersonatingMarketId] = useState<number | null>(null)
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
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      const supabase = getSupabaseClient()
      
      // Load markets with head_user_id directly from markets table
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('*')
        .order('name')

      if (marketsError) throw marketsError
      
      // Get all head users's auth_uid from markets table
      const headUserIds = [...new Set((marketsData || [])
        .filter((m: any) => m.head_user_id)
        .map((m: any) => m.head_user_id))]
      
      // Map head_user_id to user name from public.users table
      let userMap = new Map<string, string>()
      if (headUserIds.length > 0) {
        const { data: headUsers } = await supabase
          .from('users')
          .select('nama, email, auth_uid')
          .in('auth_uid', headUserIds)
        
        ;(headUsers || []).forEach((u: any) => {
          userMap.set(u.auth_uid, u.nama || u.email || '-')
        })
      }
      
      // Process markets
      const processedMarkets = (marketsData || []).map((m: any) => ({
        ...m,
        head_name: m.head_user_id ? (userMap.get(m.head_user_id) || '-') : '-'
      }))
      
      setMarkets(processedMarkets)

      // Load all users for the dropdown (to assign as head)
      const { data: allUsers } = await supabase
        .from('users')
        .select('id_user, email, nama, auth_uid')
        .not('id_user', 'is', null)
      
      setUsers((allUsers || []).map((u: any) => ({
        id: u.auth_uid || u.id_user.toString(),
        email: u.email,
        full_name: u.nama || u.email
      })))
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const uploadPhoto = async (file: File, type: 'market' | 'head'): Promise<string | null> => {
    try {
      const supabase = getSupabaseClient()
      const bucket = 'Data Siaga'
      const fileName = `${type}_${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from(bucket).upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
      return publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      alert('Gagal upload foto: ' + (err as Error).message)
      return null
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'market' | 'head') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran file maksimal 5MB'); return }
    const url = URL.createObjectURL(file)
    if (type === 'market') {
      setPreviewUrl(url)
      const uploadedUrl = await uploadPhoto(file, 'market')
      if (uploadedUrl) setFormData({ ...formData, photo_url: uploadedUrl })
    } else {
      setHeadPhotoPreview(url)
      const uploadedUrl = await uploadPhoto(file, 'head')
      if (uploadedUrl) setFormData({ ...formData, head_photo_url: uploadedUrl })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const supabase = getSupabaseClient()
      const marketData = { name: formData.name, code: formData.code, city: formData.city, address: formData.address, photo_url: formData.photo_url, head_photo_url: formData.head_photo_url, status: formData.status }
      const { error } = await supabase.from('markets').insert([marketData])
      if (error) throw error
      setFormData({ name: '', code: '', city: '', address: '', photo_url: '', head_photo_url: '', head_user_id: '', status: 'AKTIF' })
      setPreviewUrl(null); setHeadPhotoPreview(null); setShowForm(false); loadAllData()
    } catch (err) { console.error('Error saving market:', err) }
  }

  const handleEdit = (marketId: number) => { window.location.hash = `superadmin/market-edit/${marketId}` }
  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus pasar ini?')) return
    try {
      const supabase = getSupabaseClient()
      await supabase.from('markets').delete().eq('id', id)
      loadAllData()
    } catch (err) { console.error('Error deleting market:', err) }
  }

  const handleImpersonate = async (market: Market) => {
    if (!market.head_user_id) { alert('Pasar ini belum memiliki kepala pasar yang ditugaskan'); return }
    try {
      setImpersonatingMarketId(market.id)
      const supabase = getSupabaseClient()
      // Get role info from users table (new schema: users.id_role)
      const { data: roleData } = await supabase.from('roles').select('id, name').eq('name', 'MARKET_HEAD').maybeSingle()
      if (!roleData) { alert('Role MARKET_HEAD tidak ditemukan'); setImpersonatingMarketId(null); return }
      const targetRole: UserRole = { id: 0, user_id: market.head_user_id, role_id: roleData.id, role_name: 'MARKET_HEAD', market_id: market.id }
      const currentUser = await supabase.auth.getUser()
      if (currentUser.data.user?.id) { setImpersonateSession(currentUser.data.user.id, market.head_user_id, targetRole) }
      if (onImpersonate) { onImpersonate(market.head_user_id, targetRole) } else { window.location.hash = 'market/dashboard' }
    } catch (err) { console.error('Error during impersonation:', err); alert('Gagal login sebagai kepala pasar') } finally { setImpersonatingMarketId(null) }
  }

  if (loading) {
    return <div className="siaga-loading">Memuat data pasar...</div>
  }

  return (
    <div className="markets-page-container">
      {showForm && (
        <div className="market-form-drawer">
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Nama Pasar</label><input type="text" className="siaga-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kode Pasar</label><input type="text" className="siaga-input" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required /></div>
                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kota</label><input type="text" className="siaga-input" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required /></div>
                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Kepala Pasar</label><select className="siaga-input" value={formData.head_user_id} onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value })}><option value="">-- Pilih Kepala Pasar --</option>{users.map(user => (<option key={user.id} value={user.id}>{user.full_name || user.email}</option>))}</select></div>
                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Foto Pasar</label><input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => handleFileChange(e, 'market')} style={{ display: 'none' }} /><button type="button" className="siaga-btn siaga-btn-outline" onClick={() => fileInputRef.current?.click()}>📎 Upload Foto Pasar</button></div>
                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Foto Kepala</label><input type="file" ref={headPhotoInputRef} accept="image/*" onChange={(e) => handleFileChange(e, 'head')} style={{ display: 'none' }} /><button type="button" className="siaga-btn siaga-btn-outline" onClick={() => headPhotoInputRef.current?.click()}>📎 Upload Foto Kepala</button></div>
                <div style={{ gridColumn: '1/-1' }}><label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Alamat</label><input type="text" className="siaga-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="siaga-btn siaga-btn-primary">Simpan Pasar</button>
                <button type="button" className="siaga-btn siaga-btn-outline" onClick={() => { setPreviewUrl(null); setHeadPhotoPreview(null); setFormData({ name: '', code: '', city: '', address: '', photo_url: '', head_photo_url: '', head_user_id: '', status: 'AKTIF' }) }}>Batal</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="markets-grid">
        {markets.length === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: '2rem', textAlign: 'center', color: '#6b7280' }}><p>Belum ada data pasar.</p></div>
        ) : (
          markets.map((market) => (
            <div key={market.id} className="market-card">
              {market.photo_url && (<img src={market.photo_url} alt={market.name} style={{ width: '100%', height: '140px', objectFit: 'cover', borderBottom: '1px solid #e5e7eb' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />)}
              {!market.photo_url && (<img src="/pasar.jpeg" alt="Default market" style={{ width: '100%', height: '140px', objectFit: 'cover', borderBottom: '1px solid #e5e7eb' }} />)}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: 'calc(100% - 140px)' }}>
                <div style={{ flex: 1 }}>
                  <div className="market-header">
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{market.name}</h4>
                    <span className={`status-badge status-${(market.status || 'aktif').toLowerCase()}`}>{market.status}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    <p style={{ margin: '0.25rem 0' }}><strong>Kode:</strong> {market.code}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Kota:</strong> {market.city}</p>
                    <p style={{ margin: '0.25rem 0' }}><strong>Alamat:</strong> {market.address || '-'}</p>
                    <p style={{ margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><strong>Kepala Pasar:</strong> {market.head_name || '-'}</p>
                  </div>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <div className="market-actions-row">
                    <button className="siaga-btn siaga-btn-outline" onClick={() => handleEdit(market.id)} style={{ flex: 1 }}>✏️ Edit</button>
                    <button className="siaga-btn siaga-btn-accent" onClick={() => handleDelete(market.id)} style={{ flex: 1 }}>🗑️ Hapus</button>
                  </div>
                  {market.head_user_id && (
                    <button className="btn-impersonate" onClick={() => handleImpersonate(market)} disabled={impersonatingMarketId === market.id} style={{ marginTop: '0.5rem' }}>
                      {impersonatingMarketId === market.id ? '⏳ Memproses...' : '🔑 Login sebagai Kepala Pasar'}
                    </button>
                  )}
                  {!market.head_user_id && (
                    <button className="siaga-btn siaga-btn-outline" style={{ width: '100%', marginTop: '0.5rem', opacity: 0.6, cursor: 'not-allowed' }}>⚠️ Belum ada Kepala Pasar</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="floating-add-btn" onClick={() => setShowForm(!showForm)} title={showForm ? 'Tutup Form' : 'Tambah Pasar'}>{showForm ? '✕' : '+'}</button>
    </div>
  )
}