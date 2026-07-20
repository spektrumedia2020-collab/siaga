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
  created_at?: string
  head_name?: string
  head_user_id?: string
  officer_name?: string
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      
      // Use API endpoint to get markets with officers relationship (handles head data properly)
      const marketsRes = await fetch(`${apiUrl}/api/markets`)
      let marketsData = []
      
      if (marketsRes.ok) {
        marketsData = await marketsRes.json()
        console.log('Markets loaded from API:', marketsData)
      } else {
        // Fallback to direct Supabase query
        const supabase = getSupabaseClient()
        const { data: supabaseMarkets } = await supabase
          .from('markets')
          .select(`
            *,
            officers (id, name, user_id, photo_url)
          `)
          .order('name')
        marketsData = supabaseMarkets || []
        
        // Process to extract head info from officers
        marketsData = marketsData.map((m: any) => ({
          ...m,
          head_user_id: m.officers?.[0]?.user_id || '',
          head_name: m.officers?.[0]?.name || '',
          head_photo_url: m.officers?.[0]?.photo_url || ''
        }))
      }
      
      // Load head user names for markets that have head_user_id but no head_name
      const supabase = getSupabaseClient()
      const marketsNeedingHeadName = marketsData.filter((m: any) => m.head_user_id && !m.head_name)
      
      if (marketsNeedingHeadName.length > 0) {
        // Get user roles to find MARKET_HEAD users
        const { data: rolesData } = await supabase.from('roles').select('id, name')
        const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))
        
        const { data: userRolesData } = await supabase
          .from('user_roles')
          .select('user_id, users:user_id(email, raw_user_meta_data)')
          .in('user_id', marketsNeedingHeadName.map((m: any) => m.head_user_id))
        
        // Create a map of user_id to full_name
        const headNameMap = new Map<string, string>()
        ;(userRolesData || []).forEach((ur: any) => {
          const fullName = ur.users?.raw_user_meta_data?.full_name || ur.users?.email || ''
          headNameMap.set(ur.user_id, fullName)
        })
        
        // Update markets with head names
        marketsData = marketsData.map((m: any) => ({
          ...m,
          head_name: headNameMap.get(m.head_user_id) || m.head_name || '-'
        }))
      }
      
      setMarkets(marketsData)
      
      // Load all users with MARKET_HEAD role for dropdown via API
      try {
        const usersRes = await fetch(`${apiUrl}/api/users/market-heads`)
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData || [])
          console.log('Market heads loaded:', usersData)
        }
      } catch (fetchErr) {
        console.warn('Falling back to local user query for dropdown')
        // Fallback
        const { data: rolesData } = await supabase.from('roles').select('id, name')
        const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))
        
        const { data: userRolesData } = await supabase.from('user_roles').select('user_id')
        
        const headUserIds = (userRolesData || [])
          .filter((ur: any) => (roleMap.get(ur.role_id) || '').toUpperCase() === 'MARKET_HEAD')
          .map((ur: any) => ur.user_id)

        const { data: usersFromDb } = await supabase
          .from('users')
          .select('id, email, raw_user_meta_data')
          .in('id', headUserIds)
        setUsers(usersFromDb?.map((u: any) => ({
          id: u.id,
          email: u.email,
          full_name: u.raw_user_meta_data?.full_name || u.email
        })) || [])
      }
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const marketData = { name: formData.name, code: formData.code, city: formData.city, address: formData.address, photo_url: formData.photo_url, head_photo_url: formData.head_photo_url, status: formData.status }
      const res = await fetch(`${apiUrl}/api/markets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(marketData) })
      if (!res.ok) { const supabase = getSupabaseClient(); await supabase.from('markets').insert([marketData]) }
      setFormData({ name: '', code: '', city: '', address: '', photo_url: '', head_photo_url: '', head_user_id: '', status: 'AKTIF' })
      setPreviewUrl(null); setHeadPhotoPreview(null); setShowForm(false); loadAllData()
    } catch (err) { console.error('Error saving market:', err) }
  }

  const handleEdit = (marketId: number) => { window.location.hash = `superadmin/market-edit/${marketId}` }
  const handleDelete = async (id: number) => {
    if (!confirm('Yakin hapus pasar ini?')) return
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      await fetch(`${apiUrl}/api/markets/${id}`, { method: 'DELETE' })
      loadAllData()
    } catch (err) { console.error('Error deleting market:', err) }
  }

  const handleImpersonate = async (market: Market) => {
    if (!market.head_user_id) { alert('Pasar ini belum memiliki kepala pasar yang ditugaskan'); return }
    try {
      setImpersonatingMarketId(market.id)
      const supabase = getSupabaseClient()
      const { data: rolesData } = await supabase.from('roles').select('id, name')
      const roleMap = new Map<number, string>((rolesData || []).map((r: any) => [r.id, r.name]))
      const { data: userRoleData } = await supabase.from('user_roles').select('id, user_id, role_id, market_id').eq('user_id', market.head_user_id)
      const marketHeadRole = (userRoleData || []).find((ur: any) => (roleMap.get(ur.role_id) || '').toUpperCase() === 'MARKET_HEAD')
      if (!marketHeadRole) { alert('Kepala pasar tidak memiliki role yang sesuai'); setImpersonatingMarketId(null); return }
      const targetRole: UserRole = { id: marketHeadRole.id, user_id: marketHeadRole.user_id, role_id: marketHeadRole.role_id, role_name: 'MARKET_HEAD', market_id: market.id }
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
                    <p style={{ margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><strong>Kepala Pasar:</strong> {market.head_photo_url && <img src={market.head_photo_url} alt="Kepala Pasar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />} {market.head_name || market.officer_name || '-'}</p>
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