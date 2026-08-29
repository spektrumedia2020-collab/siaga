import { useState, useEffect } from 'react'
import { getSupabaseClient, STORAGE_BUCKET, getStorageConfigurationMessage } from '../lib/supabase'
import { getUserMarket, getUserRole } from '../lib/roleUtils'
import { OfficersPage } from './OfficersPage'
import { StallsPage } from './StallsPage'
import { SectorsPage } from './SectorsPage'
import { OwnersPage } from './OwnersPage'
import { CategoriesPage } from './CategoriesPage'
import { RetribusiPage } from './RetribusiPage'
import { TransactionsPage } from './TransactionsPage'
import { ReconciliationsPage } from './ReconciliationsPage'
import { SetoranPage } from './SetoranPage'
import { TreasurerDashboard } from './TreasurerDashboard'
import { MarketDetailPage } from './MarketDetailPage'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import {
  IconOverview,
  IconStalls,
  IconSectors,
  IconOwners,
  IconCategories,
  IconRetribusi,
  IconTransactions,
  IconReconciliations,
  IconOfficers
} from '../components/Icons'
import '../pages/MarketDashboard.css'
import { compressImageFile } from '../lib/imageUtils'
import { saveUserProfileToUsersTable } from '../lib/userProfile'

interface MarketStats {
  market: any
  stallCount: number
  officerCount: number
  transactionCount: number
  totalRevenue: number
}

interface Props {
  userId: string
  impersonating?: boolean
  onStopImpersonation?: () => void
  onLogout?: () => void
}

interface PublicNewsItem {
  title: string
  summary: string
  image: string
  link: string
}

type PageType = 'overview' | 'officers' | 'stalls' | 'sectors' | 'owners' | 'categories' | 'retribusi' | 'transactions' | 'reconciliations' | 'setoran' | 'treasurer' | 'marketDetail' | 'publicContent'

function formatMarketAddress(market: any) {
  const clean = (value: unknown) => String(value || '').trim().replace(/^[,\s]+|[,\s]+$/g, '')
  const structured = [
    [clean(market.street), clean(market.street_number)].filter(Boolean).join(' '),
    clean(market.kecamatan) ? `Kecamatan ${clean(market.kecamatan)}` : '',
    clean(market.city),
    clean(market.province),
    clean(market.postal_code)
  ].filter(Boolean).join(', ')

  return structured || clean(market.address) || '-'
}

export function MarketDashboard({ userId, impersonating = false, onStopImpersonation, onLogout }: Props) {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<PageType>('overview')
  const [chartData, setChartData] = useState<any[]>([])
  const [editingMarket, setEditingMarket] = useState(false)
  const [marketForm, setMarketForm] = useState<any>({ name: '', code: '', address: '', street: '', street_number: '', kecamatan: '', city: '', province: '', postal_code: '', description: '', status: '' })
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('')
  const [profileRole, setProfileRole] = useState('Administrator')
  const [userRoleName, setUserRoleName] = useState('')
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [publicContent, setPublicContent] = useState({
    logoUrl: '',
    heroSlides: [] as string[],
    announcement: '',
    aboutMarket: '',
    news: [{ title: '', summary: '', image: '', link: '' }] as PublicNewsItem[]
  })
  const [publicContentSaving, setPublicContentSaving] = useState(false)
  const [publicContentError, setPublicContentError] = useState('')
  const [publicLinkCopied, setPublicLinkCopied] = useState(false)

  useEffect(() => {
    loadMarketStats()
    loadUserProfile()
    loadUserRole()
  }, [userId])

  useEffect(() => {
    if (!stats?.market) return
    loadPublicCms(stats.market.id)
  }, [stats?.market?.id])

  useEffect(() => {
    if (stats?.market) {
      setMarketForm({
        name: stats.market.name || '',
        code: stats.market.code || '',
        address: stats.market.address || '',
        street: stats.market.street || '',
        street_number: stats.market.street_number || '',
        kecamatan: stats.market.kecamatan || '',
        city: stats.market.city || '',
        province: stats.market.province || '',
        postal_code: stats.market.postal_code || '',
        description: stats.market.description || '',
        status: stats.market.status || ''
      })
    }
  }, [stats])

  useEffect(() => {
    const computeChartData = async () => {
      if (!stats?.market) return
      const supabaseClient = getSupabaseClient()
      const { data: stallsData } = await supabaseClient
        .from('stalls')
        .select('id')
        .eq('market_id', stats.market.id)
        .eq('status', 'AKTIF')

      const stallIds = stallsData?.map(s => s.id) || []
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 6)
      const weekStart = new Date(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate()).toISOString()
      const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

      let weeklyTransactions: any[] = []
      if (stallIds.length > 0) {
        const { data } = await supabaseClient
          .from('transactions')
          .select('amount, created_at')
          .in('stall_id', stallIds)
          .gte('created_at', weekStart)
          .lt('created_at', weekEnd)
        weeklyTransactions = data || []
      }

      const dailyMap = new Map<string, { revenue: number; transactions: number }>()
      for (let i = 0; i < 7; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - (6 - i))
        const key = d.toISOString().split('T')[0]
        dailyMap.set(key, { revenue: 0, transactions: 0 })
      }

      weeklyTransactions.forEach((tx: any) => {
        const dayKey = (tx.created_at || '').split('T')[0]
        if (dailyMap.has(dayKey)) {
          const existing = dailyMap.get(dayKey)!
          existing.revenue += parseFloat(tx.amount || 0)
          existing.transactions += 1
        }
      })

      const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      const currentDayIndex = today.getDay()

      const nextChartData = Array.from({ length: 7 }, (_, i) => {
        const dayOffset = i - currentDayIndex + 1
        const targetDate = new Date(today)
        targetDate.setDate(today.getDate() + dayOffset)
        const targetKey = targetDate.toISOString().split('T')[0]
        const dayName = dayLabels[targetDate.getDay()]
        const dataPoint = dailyMap.get(targetKey) || { revenue: 0, transactions: 0 }
        return {
          name: dayName,
          revenue: dataPoint.revenue,
          transactions: dataPoint.transactions
        }
      })

      setChartData(nextChartData)
    }

    computeChartData()
  }, [stats])

  const loadUserRole = async () => {
    try {
      const role = await getUserRole(userId)
      const normalized = (role?.role_name || '').toUpperCase()
      setUserRoleName(normalized)
      if (normalized) {
        setProfileRole(normalized)
        localStorage.setItem('siaga_profile_role', normalized)
      }
    } catch (err) {
      console.error('Error loading user role', err)
    }
  }

  const loadUserProfile = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error

      const storedName = localStorage.getItem('siaga_profile_name') || ''
      const storedPhoto = localStorage.getItem('siaga_profile_photo_preview') || ''
      const storedRole = localStorage.getItem('siaga_profile_role') || ''

      const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
      const metadataAvatar = user?.user_metadata?.avatar_url || ''
      const metadataRole = user?.user_metadata?.role || ''

      const displayName = metadataName || storedName || user?.email?.split('@')[0] || 'User'
      const avatarUrl = metadataAvatar || storedPhoto || ''
      const role = metadataRole || storedRole || 'Administrator'

      setProfileName(displayName)
      setProfilePhotoUrl(avatarUrl)
      setProfileRole(role)

      if (storedName !== displayName) {
        localStorage.setItem('siaga_profile_name', displayName)
      }
      if (storedPhoto !== avatarUrl) {
        localStorage.setItem('siaga_profile_photo_preview', avatarUrl)
      }
      if (storedRole !== role) {
        localStorage.setItem('siaga_profile_role', role)
      }
    } catch (err) {
      console.error('Error loading user profile', err)
      const storedName = localStorage.getItem('siaga_profile_name') || ''
      const storedPhoto = localStorage.getItem('siaga_profile_photo_preview') || ''
      const storedRole = localStorage.getItem('siaga_profile_role') || ''
      if (storedName || storedPhoto || storedRole) {
        setProfileName(storedName || 'User')
        setProfilePhotoUrl(storedPhoto || '')
        setProfileRole(storedRole || 'Administrator')
      }
    }
  }

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'))
    reader.readAsDataURL(file)
  })

  const uploadProfilePhoto = async (file: File) => {
    try {
      const compressedFile = await compressImageFile(file, { maxWidth: 900, maxHeight: 900, quality: 0.8, maxBytes: 700 * 1024 })
      const fileExt = compressedFile.name.split('.').pop() || 'jpg'
      const filePath = `profile-photos/${userId}/${Date.now()}.${fileExt}`

      const supabaseClient = getSupabaseClient()
      const { error: uploadError } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: true
      })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)
      return { url: publicUrlData.publicUrl, stored: true }
    } catch (err) {
      console.warn('Storage upload blocked, using inline avatar fallback', err)
      return { url: await readFileAsDataUrl(file), stored: false }
    }
  }

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true)
      setProfileError('')

      const nextName = profileName.trim()
      let avatarUrl = profilePhotoUrl

      if (profilePhotoFile) {
        const uploadResult = await uploadProfilePhoto(profilePhotoFile)
        avatarUrl = uploadResult.url
      }

      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: nextName,
          name: nextName,
          avatar_url: avatarUrl || ''
        }
      })

      if (error) {
        console.warn('Profile update failed, using local fallback', error)
      }

      try {
        await saveUserProfileToUsersTable(supabase, userId, {
          email: '',
          full_name: nextName || 'User',
          photo_url: avatarUrl || ''
        })
      } catch (dbError) {
        console.warn('Users table save failed from dashboard', dbError)
      }

      localStorage.setItem('siaga_profile_name', nextName || 'User')
      localStorage.setItem('siaga_profile_photo_preview', avatarUrl || '')
      localStorage.setItem('siaga_profile_role', profileRole || 'Administrator')

      setProfileName(nextName || 'User')
      setProfilePhotoUrl(avatarUrl || '')
      setProfilePhotoFile(null)
      setProfileOpen(false)
      await loadUserProfile()
    } catch (err: any) {
      setProfileError(err.message || 'Gagal menyimpan profil')
    } finally {
      setProfileSaving(false)
    }
  }

  const parseJsonArray = <T,>(value: unknown): T[] => {
    if (!value || typeof value !== 'string') return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed as T[] : []
    } catch {
      return []
    }
  }

  const uploadPublicAsset = async (file: File) => {
    try {
      const supabaseClient = getSupabaseClient()
      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `market-public/${stats?.market?.id || userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { error: uploadError } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)
      return publicUrlData.publicUrl
    } catch (err: any) {
      console.warn('Public asset upload failed, using local fallback', err)
      const actionableMessage = getStorageConfigurationMessage(err, 'Upload gambar publik gagal')
      setPublicContentError(actionableMessage)
      return URL.createObjectURL(file)
    }
  }

  const updateNewsItem = (index: number, field: keyof PublicNewsItem, value: string) => {
    setPublicContent((current) => ({
      ...current,
      news: current.news.map((item, idx) => idx === index ? { ...item, [field]: value } : item)
    }))
  }

  const addNewsItem = () => {
    setPublicContent((current) => ({
      ...current,
      news: [...current.news, { title: '', summary: '', image: '', link: '' }]
    }))
  }

  const removeNewsItem = (index: number) => {
    setPublicContent((current) => ({
      ...current,
      news: current.news.filter((_, idx) => idx !== index)
    }))
  }

  const loadPublicCms = async (marketId: number) => {
    try {
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from('market_config')
        .select('key, value')
        .eq('market_id', marketId)

      if (error) throw error

      const values: Record<string, string> = {}
      ;(data || []).forEach((row: any) => {
        values[row.key] = row.value || ''
      })

      const heroSlides = parseJsonArray<string>(values.public_hero_images)
      const news = parseJsonArray<PublicNewsItem>(values.public_news)

      setPublicContent({
        logoUrl: values.public_logo_url || '',
        heroSlides: heroSlides.length > 0 ? heroSlides : [],
        announcement: values.public_announcement || '',
        aboutMarket: values.public_about_market || '',
        news: news.length > 0 ? news : [{ title: '', summary: '', image: '', link: '' }]
      })
    } catch (err) {
      console.warn('Could not load public content config', err)
    }
  }

  const savePublicCms = async () => {
    try {
      if (!stats?.market) return
      setPublicContentSaving(true)
      setPublicContentError('')

      const supabaseClient = getSupabaseClient()
      const rows = [
        { market_id: stats.market.id, key: 'public_logo_url', value: publicContent.logoUrl.trim() },
        { market_id: stats.market.id, key: 'public_hero_images', value: JSON.stringify(publicContent.heroSlides.filter(Boolean)) },
        { market_id: stats.market.id, key: 'public_announcement', value: publicContent.announcement.trim() },
        { market_id: stats.market.id, key: 'public_about_market', value: publicContent.aboutMarket.trim() },
        { market_id: stats.market.id, key: 'public_news', value: JSON.stringify(publicContent.news.filter((item) => item.title || item.summary || item.image || item.link)) }
      ]

      for (const row of rows) {
        const payload = { market_id: row.market_id, key: row.key, value: row.value }
        const { error } = await supabaseClient
          .from('market_config')
          .upsert(payload, { onConflict: 'market_id,key' })

        if (error) throw error
      }

      await loadPublicCms(stats.market.id)
    } catch (err: any) {
      const message = getStorageConfigurationMessage(err, err.message || 'Gagal menyimpan pengaturan publikasi pasar')
      setPublicContentError(message)
    } finally {
      setPublicContentSaving(false)
    }
  }

  const loadMarketStats = async () => {
    try {
      // Get user's market
      const market = await getUserMarket(userId)
      if (!market) {
        console.error('No market assigned')
        setLoading(false)
        return
      }

      // Count stalls in this market (only active)
      const supabaseClient = getSupabaseClient()
      const { count: stallCount } = await supabaseClient
        .from('stalls')
        .select('*', { count: 'exact' })
        .eq('market_id', market.id)
        .eq('status', 'AKTIF')

      const { count: officerCount } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact' })
        .eq('market_id', market.id)
        .eq('status', 'AKTIF')

      const { data: stallsData } = await supabaseClient
        .from('stalls')
        .select('id')
        .eq('market_id', market.id)
        .eq('status', 'AKTIF')

      const stallIds = stallsData?.map(s => s.id) || []

      let transactionCount = 0
      let totalRevenue = 0

      if (stallIds.length > 0) {
        const { count, data: transactionData } = await supabaseClient
          .from('transactions')
          .select('amount, created_at', { count: 'exact' })
          .in('stall_id', stallIds)

        transactionCount = count || 0
        totalRevenue = (transactionData || []).reduce(
          (sum, t: any) => sum + (parseFloat(t.amount) || 0),
          0
        )
      }

      setStats({
        market,
        stallCount: stallCount || 0,
        officerCount: officerCount || 0,
        transactionCount,
        totalRevenue
      })
    } catch (err) {
      console.error('Error loading market stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Memuat data pasar...</div>
  }

  if (!stats) {
    return (
      <div className="error-message">
        <h2>❌ Tidak Ada Pasar</h2>
        <p>Anda belum di-assign ke pasar manapun.</p>
      </div>
    )
  }

  const { market, stallCount, officerCount, transactionCount, totalRevenue } = stats
  const publicMarketSlug = encodeURIComponent((market.code || market.name || 'pasar').trim()).replace(/%20/g, '-').replace(/%/g, '')
  const publicMarketUrl = `/@${publicMarketSlug}`
  const isTreasurer = (userRoleName || profileRole || '').toUpperCase() === 'TREASURER'

  useEffect(() => {
    if (!isTreasurer && currentPage === 'treasurer') {
      setCurrentPage('overview')
    }
  }, [isTreasurer, currentPage])

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + publicMarketUrl)
      setPublicLinkCopied(true)
      window.setTimeout(() => setPublicLinkCopied(false), 1800)
    } catch (error) {
      console.error('Failed to copy public market URL', error)
    }
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'stalls':
        return <StallsPage marketId={stats.market.id} />
      case 'officers':
        return <OfficersPage marketId={stats.market.id} />
      case 'sectors':
        return <SectorsPage marketId={stats.market.id} />
      case 'owners':
        return <OwnersPage marketId={stats.market.id} />
      case 'marketDetail':
        return <MarketDetailPage marketId={stats.market.id} onBack={() => setCurrentPage('overview')} onSaved={() => loadMarketStats()} />
      case 'categories':
        return <CategoriesPage marketId={stats.market.id} />
      case 'retribusi':
        return <RetribusiPage />
      case 'transactions':
        return <TransactionsPage marketId={stats.market.id} />
      case 'reconciliations':
        return <ReconciliationsPage marketId={stats.market.id} />
      case 'setoran':
        return <SetoranPage marketId={stats.market.id} />
      case 'treasurer':
        return <TreasurerDashboard marketId={stats.market.id} />
      case 'publicContent':
        return (
          <div className="content-editor-panel">
            <div className="content-editor-header">
              <div>
                <span className="content-editor-kicker">Publikasi pasar</span>
                <h2>CMS Halaman publik</h2>
              </div>
              <div className="content-editor-header-actions">
                <button className="btn-secondary small public-link-btn" type="button" onClick={handleCopyPublicLink}>
                  {publicLinkCopied ? 'Link tersalin' : 'Salin link'}
                </button>
                <a className="btn-secondary small public-link-btn" href={publicMarketUrl} target="_blank" rel="noreferrer">Lihat halaman publik</a>
              </div>
            </div>

            <div className="content-editor-grid">
              <label className="content-editor-field">
                <span>Logo pasar</span>
                {publicContent.logoUrl && <img src={publicContent.logoUrl} alt="Preview logo" style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', marginBottom: '0.5rem' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                <input value={publicContent.logoUrl} onChange={(e) => setPublicContent({ ...publicContent, logoUrl: e.target.value })} placeholder="https://.../logo.png" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const uploadedUrl = await uploadPublicAsset(file)
                    setPublicContent((current) => ({ ...current, logoUrl: uploadedUrl }))
                    e.target.value = ''
                  }}
                />
              </label>

              <label className="content-editor-field full-width">
                <span>Slide hero gambar</span>
                <div className="content-editor-list">
                  {(publicContent.heroSlides.length > 0 ? publicContent.heroSlides : ['']).map((slide, index) => (
                    <div key={`slide-${index}`} className="content-editor-inline-row">
                      <input
                        value={slide}
                        onChange={(e) => {
                          const nextSlides = [...publicContent.heroSlides]
                          nextSlides[index] = e.target.value
                          setPublicContent({ ...publicContent, heroSlides: nextSlides })
                        }}
                        placeholder="https://.../slide.jpg"
                      />
                      <button type="button" className="btn-secondary small" onClick={() => {
                        const nextSlides = publicContent.heroSlides.filter((_, idx) => idx !== index)
                        setPublicContent({ ...publicContent, heroSlides: nextSlides.length > 0 ? nextSlides : [] })
                      }}>Hapus</button>
                    </div>
                  ))}
                  <button type="button" className="btn-secondary small" onClick={() => setPublicContent({ ...publicContent, heroSlides: [...publicContent.heroSlides, ''] })}>Tambah slide</button>
                </div>
              </label>

              <label className="content-editor-field full-width">
                <span>Pengumuman</span>
                <textarea rows={5} value={publicContent.announcement} onChange={(e) => setPublicContent({ ...publicContent, announcement: e.target.value })} placeholder="Tulis pengumuman pasar yang akan tampil di landing page" />
              </label>

              <label className="content-editor-field full-width">
                <span>Tentang Pasar</span>
                <textarea rows={5} value={publicContent.aboutMarket} onChange={(e) => setPublicContent({ ...publicContent, aboutMarket: e.target.value })} placeholder="Tulis deskripsi atau informasi tentang pasar" />
              </label>

              <div className="content-editor-field full-width">
                <span>Berita pasar</span>
                <div className="content-editor-list">
                  {publicContent.news.map((item, index) => (
                    <div key={`news-${index}`} className="content-editor-news-card">
                      <div className="content-editor-inline-row" style={{ marginBottom: '0.5rem' }}>
                        <input value={item.title} onChange={(e) => updateNewsItem(index, 'title', e.target.value)} placeholder="Judul berita" />
                        <button type="button" className="btn-secondary small" onClick={() => removeNewsItem(index)}>Hapus</button>
                      </div>
                      <textarea rows={3} value={item.summary} onChange={(e) => updateNewsItem(index, 'summary', e.target.value)} placeholder="Ringkasan berita" />
                      <input value={item.image} onChange={(e) => updateNewsItem(index, 'image', e.target.value)} placeholder="https://.../gambar.jpg" />
                      <input value={item.link} onChange={(e) => updateNewsItem(index, 'link', e.target.value)} placeholder="https://.../link-berita" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const uploadedUrl = await uploadPublicAsset(file)
                          updateNewsItem(index, 'image', uploadedUrl)
                          e.target.value = ''
                        }}
                      />
                    </div>
                  ))}
                  <button type="button" className="btn-secondary small" onClick={addNewsItem}>Tambah berita</button>
                </div>
              </div>
            </div>

            <div className="content-editor-preview">
              <h3>Preview real-time</h3>
              <div className="content-editor-preview-card">
                <div className="preview-hero" style={{ backgroundImage: `url(${(publicContent.heroSlides.find(Boolean) || stats?.market?.photo_url || '/pasar.jpeg')})` }}>
                  <div className="preview-overlay">
                    <img src={publicContent.logoUrl || stats?.market?.photo_url || '/logo.jpeg'} alt="Logo preview" className="preview-logo" onError={(event) => { (event.currentTarget as HTMLImageElement).src = '/logo.jpeg' }} />
                    <div>
                      <strong>Pasar {stats?.market?.name || 'Nama pasar'}</strong>
                      <p>{publicContent.announcement || 'Pengumuman pasar akan tampil di sini.'}</p>
                    </div>
                  </div>
                </div>
                <div className="preview-news-row">
                  {(publicContent.news.filter((item) => item.title || item.summary || item.image || item.link)).slice(0, 2).map((item, idx) => (
                    <div key={`preview-news-${idx}`} className="preview-news-item">
                      {item.image && <img src={item.image} alt={item.title || 'Preview berita'} />}
                      <div>
                        <strong>{item.title || 'Judul berita'}</strong>
                        <span>{item.summary || 'Ringkasan berita...'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {publicContentError && <div className="content-editor-error">{publicContentError}</div>}
            <div className="content-editor-actions">
              <button className="btn-primary" type="button" onClick={savePublicCms} disabled={publicContentSaving}>{publicContentSaving ? 'Menyimpan...' : 'Simpan perubahan'}</button>
            </div>
          </div>
        )
      default:
        const avgRevenuePerTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0
        const displayChartData = chartData.length > 0 ? chartData : [
          { name: 'Sen', revenue: 0, transactions: 0 },
          { name: 'Sel', revenue: 0, transactions: 0 },
          { name: 'Rab', revenue: 0, transactions: 0 },
          { name: 'Kam', revenue: 0, transactions: 0 },
          { name: 'Jum', revenue: 0, transactions: 0 },
          { name: 'Sab', revenue: 0, transactions: 0 },
          { name: 'Min', revenue: 0, transactions: 0 }
        ]

        const topCards = [
          {
            label: 'Total Revenue',
            value: `Rp ${totalRevenue.toLocaleString('id-ID')}`,
            detail: 'Total pendapatan semua transaksi',
            color: '#fff3b0'
          },
          {
            label: 'Transaksi',
            value: transactionCount.toLocaleString('id-ID'),
            detail: 'Jumlah transaksi hari ini',
            color: '#fff0a2'
          },
          {
            label: 'Lapak',
            value: stallCount.toLocaleString('id-ID'),
            detail: 'Lapak aktif di pasar',
            color: '#fff6c1'
          }
        ]

        return (
          <>
            <div className="overview-top-row">
              {topCards.map((card) => (
                <div key={card.label} className="mini-card" style={{ background: card.color }}>
                  <div className="mini-card-title">{card.label}</div>
                  <div className="mini-card-value">{card.value}</div>
                  <div className="mini-card-note">{card.detail}</div>
                </div>
              ))}
            </div>

            <div className="overview-grid">
              <div className="chart-panel">
                <div className="chart-card-header">
                  <div>
                    <h4>Ringkasan Pasar</h4>
                    <p>Grafik kinerja dan aktivitas pasar hari ini.</p>
                  </div>
                </div>
                <div className="chart-display">
                  <div className="chart-legend">
                    <span className="legend-dot green" /> Pendapatan
                    <span className="legend-dot yellow" /> Transaksi
                  </div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={displayChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(29, 61, 7, 0.12)" />
                        <XAxis dataKey="name" stroke="#3d5224" tickLine={false} axisLine={false} />
                        <YAxis stroke="#3d5224" tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(value: number | string | readonly (number | string)[] | undefined) => {
                            if (typeof value === 'number') {
                              return value.toLocaleString('id-ID')
                            }

                            if (Array.isArray(value)) {
                              return value.join(', ')
                            }

                            return value ?? ''
                          }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line type="monotone" dataKey="revenue" stroke="#1f4e12" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="transactions" stroke="#f4c300" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="overview-summary-row">
                  <div>
                    <div className="summary-label">Pendapatan rata-rata</div>
                    <div className="summary-value">Rp {Number(avgRevenuePerTransaction.toFixed(0)).toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    <div className="summary-label">Lapak aktif</div>
                    <div className="summary-value">{stallCount}</div>
                  </div>
                  <div>
                    <div className="summary-label">Petugas terdaftar</div>
                    <div className="summary-value">{officerCount}</div>
                  </div>
                </div>
              </div>

              <div className="side-panel">
                <div className="side-card">
                    <div className="side-card-header">
                      <div>
                        <span>Info Pasar</span>
                        <strong>{market.name}</strong>
                      </div>
                      <div className="card-actions">
                        <button className="icon-action" title="Lihat detail" aria-label="Lihat detail pasar" onClick={() => setCurrentPage('marketDetail')}>
                          <span className="sidebar-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </span>
                        </button>
                        <button className="icon-action" title="Edit pasar" aria-label="Edit pasar" onClick={() => setEditingMarket(true)}>
                          <span className="sidebar-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 21l4-1 11-11a2.1 2.1 0 10-3-3L4 17l-1 4z" />
                              <path d="M14.5 6.5l3 3" />
                            </svg>
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="side-kpi">
                      {editingMarket ? (
                        <div className="market-edit-form">
                          <div className="form-group">
                            <label>Nama</label>
                            <input value={marketForm.name} onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Nama Jalan</label>
                            <input placeholder="Nama jalan" value={marketForm.street} onChange={(e) => setMarketForm({ ...marketForm, street: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Nomor</label>
                            <input placeholder="No. 10" value={marketForm.street_number} onChange={(e) => setMarketForm({ ...marketForm, street_number: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Kecamatan</label>
                            <input value={marketForm.kecamatan} onChange={(e) => setMarketForm({ ...marketForm, kecamatan: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Deskripsi Pasar</label>
                            <textarea rows={3} value={marketForm.description} onChange={(e) => setMarketForm({ ...marketForm, description: e.target.value })} placeholder="Tulis informasi singkat tentang pasar..." />
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Kota</label>
                              <input value={marketForm.city} onChange={(e) => setMarketForm({ ...marketForm, city: e.target.value })} />
                            </div>
                            <div className="form-group">
                              <label>Provinsi</label>
                              <input value={marketForm.province} onChange={(e) => setMarketForm({ ...marketForm, province: e.target.value })} />
                            </div>
                            <div className="form-group">
                              <label>Kode Pos</label>
                              <input inputMode="numeric" value={marketForm.postal_code} onChange={(e) => setMarketForm({ ...marketForm, postal_code: e.target.value.replace(/\D/g, '') })} />
                            </div>
                            <div className="form-group">
                              <label>Status</label>
                              <select value={marketForm.status} onChange={(e) => setMarketForm({ ...marketForm, status: e.target.value })}>
                                <option value="AKTIF">AKTIF</option>
                                <option value="NONAKTIF">NONAKTIF</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-actions">
                            <button className="btn-primary" onClick={async () => {
                              try {
                                const payload: any = {
                                  name: marketForm.name,
                                  address: marketForm.address,
                                  street: marketForm.street,
                                  street_number: marketForm.street_number,
                                  kecamatan: marketForm.kecamatan,
                                  city: marketForm.city,
                                  province: marketForm.province,
                                  postal_code: marketForm.postal_code,
                                  description: marketForm.description,
                                  status: marketForm.status
                                }
                                const supabase = getSupabaseClient()
      const { error } = await supabase.from('markets').update(payload).eq('id', market.id)
                                if (error) throw error
                                await loadMarketStats()
                                setEditingMarket(false)
                              } catch (err) {
                                console.error('Error updating market', err)
                              }
                            }}>Simpan</button>
                            <button className="btn-secondary" onClick={() => { setEditingMarket(false); setMarketForm({ name: market.name, code: market.code, address: market.address, street: market.street, street_number: market.street_number, kecamatan: market.kecamatan, city: market.city, province: market.province, postal_code: market.postal_code, description: market.description, status: market.status }) }}>Batal</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span>Alamat</span>
                            <strong>{formatMarketAddress(market)}</strong>
                          </div>
                          <div>
                            <span>Kode Pasar</span>
                            <strong>{market.code}</strong>
                          </div>
                          <div>
                            <span>Status Pasar</span>
                            <strong>{market.status}</strong>
                          </div>
                        </>
                      )}
                    </div>
                </div>
                <div className="side-card compact-card">
                  <div className="status-block">
                    <span>Ringkasan</span>
                    <strong>{stallCount.toLocaleString('id-ID')} Lapak</strong>
                  </div>
                  <p>Terdaftar {transactionCount.toLocaleString('id-ID')} transaksi dengan total pendapatan Rp {totalRevenue.toLocaleString('id-ID')}.</p>
                </div>
              </div>
            </div>
          </>
        )
    }
  }

  return (
      <div className="market-dashboard">
        <div className="dashboard-layout">
          <aside className="sidebar">
            <div className="sidebar-nav">
              <div className="sidebar-group">
                <div className="sidebar-group-title">Overview</div>
                <button
                  className={`sidebar-item ${currentPage === 'overview' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('overview')}
                >
                  <span className="sidebar-icon"><IconOverview /></span>
                  <span>Overview</span>
                </button>
              </div>
              <div className="sidebar-group">
                <div className="sidebar-group-title">Data Pasar</div>
                <button
                  className={`sidebar-item ${currentPage === 'stalls' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('stalls')}
                >
                  <span className="sidebar-icon"><IconStalls /></span>
                  <span>Lapak</span>
                </button>
                <button
                  className={`sidebar-item ${currentPage === 'sectors' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('sectors')}
                >
                  <span className="sidebar-icon"><IconSectors /></span>
                  <span>Sektor</span>
                </button>
                <button
                  className={`sidebar-item ${currentPage === 'owners' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('owners')}
                >
                  <span className="sidebar-icon"><IconOwners /></span>
                  <span>Pemilik</span>
                </button>
              </div>
              <div className="sidebar-group">
                <div className="sidebar-group-title">Konfigurasi</div>
                <button
                  className={`sidebar-item ${currentPage === 'categories' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('categories')}
                >
                  <span className="sidebar-icon"><IconCategories /></span>
                  <span>Kategori</span>
                </button>
                <button
                  className={`sidebar-item ${currentPage === 'retribusi' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('retribusi')}
                >
                  <span className="sidebar-icon"><IconRetribusi /></span>
                  <span>Retribusi</span>
                </button>
              </div>
              <div className="sidebar-group">
                <div className="sidebar-group-title">Keuangan</div>
                <button
                  className={`sidebar-item ${currentPage === 'transactions' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('transactions')}
                >
                  <span className="sidebar-icon"><IconTransactions /></span>
                  <span>Transaksi</span>
                </button>
                <button
                  className={`sidebar-item ${currentPage === 'reconciliations' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('reconciliations')}
                >
                  <span className="sidebar-icon"><IconReconciliations /></span>
                  <span>Rekonsiliasi</span>
                </button>
                <button
                  className={`sidebar-item ${currentPage === 'setoran' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('setoran')}
                >
                  <span className="sidebar-icon"><IconReconciliations /></span>
                  <span>Setoran</span>
                </button>
                {isTreasurer && (
                  <button
                    className={`sidebar-item ${currentPage === 'treasurer' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('treasurer')}
                  >
                    <span className="sidebar-icon">💼</span>
                    <span>Dashboard Bendahara</span>
                  </button>
                )}
              </div>
              <div className="sidebar-group">
                <div className="sidebar-group-title">Operasional</div>
                <button
                  className={`sidebar-item ${currentPage === 'officers' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('officers')}
                >
                  <span className="sidebar-icon"><IconOfficers /></span>
                  <span>Petugas</span>
                </button>
                <button
                  className={`sidebar-item ${currentPage === 'publicContent' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('publicContent')}
                >
                  <span className="sidebar-icon">📰</span>
                  <span>Publikasi</span>
                </button>
              </div>
            </div>

            <div className="sidebar-footer">
              <a className="sidebar-public-link" href={publicMarketUrl} target="_blank" rel="noreferrer">
                Lihat halaman publik
              </a>
              <button className="sidebar-profile" type="button" onClick={() => setProfileOpen((open) => !open)}>
              <div className="sidebar-profile-avatar">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="avatar" className="sidebar-profile-photo" />
                ) : (
                  <span>{profileName.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase() || 'U'}</span>
                )}
              </div>
              <div>
                <div className="sidebar-profile-name">{profileName || 'Admin Pasar'}</div>
                <div className="sidebar-profile-role">{profileRole}</div>
              </div>
            </button>

            {profileOpen && (
              <div className="sidebar-profile-modal-backdrop" onClick={() => { setProfileOpen(false); setProfilePhotoFile(null); setProfileError('') }}>
                <div className="sidebar-profile-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="sidebar-profile-modal-header">
                    <h4>Profil Pengguna</h4>
                    <button className="sidebar-profile-close" type="button" onClick={() => { setProfileOpen(false); setProfilePhotoFile(null); setProfileError('') }}>×</button>
                  </div>
                  <label className="sidebar-profile-label">Nama</label>
                  <input
                    className="sidebar-profile-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Masukkan nama"
                  />
                  <label className="sidebar-profile-label">Foto Profil</label>
                  <input
                    className="sidebar-profile-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                  />
                  {profileError && <div className="sidebar-profile-error">{profileError}</div>}
                  <div className="sidebar-profile-actions">
                    <button className="btn-primary" type="button" onClick={handleSaveProfile} disabled={profileSaving}>
                      {profileSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => { setProfileOpen(false); setProfilePhotoFile(null); setProfileError('') }}>
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button className="sidebar-item sidebar-logout" type="button" onClick={() => onLogout?.()}>
              <span className="sidebar-icon sidebar-logout-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </span>
              <span>Logout</span>
            </button>
            <div className="sidebar-copyright">Siaga oleh Spektrumedia</div>
          </div>
        </aside>

        <main className="page-panel">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  )
}
