import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import './MarketLandingPage.css'

interface MarketData {
  id: number
  name: string
  code: string
  city: string
  address: string
  photo_url?: string | null
  logo_url?: string | null
  head_photo_url?: string | null
  status: string
  description?: string
  street?: string
  street_number?: string
  kecamatan?: string
  province?: string
  postal_code?: string
}

interface SectorData {
  id: number
  name: string
  description?: string
}

interface StallData {
  id: number
  code: string
  name: string
  sector_name: string
  owner_name: string
  status: string
}

interface PublicNewsItem {
  title?: string
  summary?: string
  image?: string
  link?: string
}

interface CmsContent {
  logoUrl: string
  heroSlides: string[]
  announcement: string
  news: PublicNewsItem[]
}

interface Props {
  slug: string
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value || typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

export function MarketLandingPage({ slug }: Props) {
  const [market, setMarket] = useState<MarketData | null>(null)
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [stalls, setStalls] = useState<StallData[]>([])
  const [cms, setCms] = useState<CmsContent>({ logoUrl: '', heroSlides: [], announcement: '', news: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'sectors' | 'stalls'>('info')
  const [heroIndex, setHeroIndex] = useState(0)

  useEffect(() => {
    loadMarketData()
  }, [slug])

  useEffect(() => {
    if (!cms.heroSlides || cms.heroSlides.length <= 1) return
    const interval = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % cms.heroSlides.length)
    }, 4500)
    return () => window.clearInterval(interval)
  }, [cms.heroSlides])

  const loadMarketData = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()

      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select('*')
        .or(`code.ilike.${slug},name.ilike.%${slug}%`)
        .maybeSingle()

      if (marketError) throw marketError
      if (!marketData) throw new Error('Pasar tidak ditemukan')

      const { data: configRows } = await supabase
        .from('market_config')
        .select('key, value')
        .eq('market_id', marketData.id)

      let cmsContent: CmsContent = { logoUrl: '', heroSlides: [], announcement: '', news: [] }
      ;(configRows || []).forEach((row: any) => {
        if (row.key === 'public_logo_url') cmsContent.logoUrl = row.value || ''
        if (row.key === 'public_hero_images') cmsContent.heroSlides = parseJsonArray<string>(row.value)
        if (row.key === 'public_announcement') cmsContent.announcement = row.value || ''
        if (row.key === 'public_news') cmsContent.news = parseJsonArray<PublicNewsItem>(row.value)
      })

      setMarket(marketData)
      setCms(cmsContent)
      await loadSectorsAndStalls(marketData.id)
    } catch (err) {
      console.error('Error loading market:', err)
      setError('Gagal memuat data pasar')
    } finally {
      setLoading(false)
    }
  }

  const loadSectorsAndStalls = async (marketId: number) => {
    const supabase = getSupabaseClient()

    const { data: sectorsData, error: sectorsError } = await supabase
      .from('market_sectors')
      .select('*')
      .eq('market_id', marketId)
      .order('name')
    if (sectorsError) throw sectorsError

    setSectors(sectorsData || [])

    const { data: stallsData, error: stallsError } = await supabase
      .from('stalls')
      .select('id, code, number, status, sector_id, owner_id')
      .eq('market_id', marketId)
      .order('code')
    if (stallsError) throw stallsError

    const { data: ownersData, error: ownersError } = await supabase
      .from('stall_owners')
      .select('id, name')
    if (ownersError) throw ownersError

    const sectorMap = new Map((sectorsData || []).map((sector: any) => [sector.id, sector.name]))
    const ownerMap = new Map((ownersData || []).map((owner: any) => [owner.id, owner.name]))

    setStalls((stallsData || []).map((s: any) => ({
      id: s.id,
      code: s.code || '',
      name: s.number || '',
      sector_name: sectorMap.get(s.sector_id) || '-',
      owner_name: ownerMap.get(s.owner_id) || '-',
      status: s.status || 'AKTIF'
    })))
  }

  if (loading) {
    return (
      <div className="market-landing-loading">
        <div className="spinner"></div>
        <p>Memuat data pasar...</p>
      </div>
    )
  }

  if (!market) {
    return <div className="market-landing-error"><div className="error-card"><h1>Pasar tidak ditemukan</h1><p>{error || 'Data pasar tidak tersedia.'}</p><a href="/" className="btn-back">Kembali</a></div></div>
  }

  const displayMarket = market
  const clean = (value: unknown) => String(value || '').trim().replace(/^[,\s]+|[,\s]+$/g, '')
  const structuredAddress = [
    [clean(displayMarket.street), clean(displayMarket.street_number)].filter(Boolean).join(' '),
    clean(displayMarket.kecamatan) ? `Kecamatan ${clean(displayMarket.kecamatan)}` : '',
    clean(displayMarket.city),
    clean(displayMarket.province),
    clean(displayMarket.postal_code)
  ].filter(Boolean).join(', ')
  const displayAddress = structuredAddress || clean(displayMarket.address) || '-'
  const commerceLogo = cms.logoUrl || displayMarket.logo_url || displayMarket.head_photo_url || displayMarket.photo_url || '/logo.jpeg'
  const heroSlides = cms.heroSlides.length > 0 ? cms.heroSlides.filter(Boolean) : [displayMarket.photo_url || '/pasar.jpeg']
  const heroImage = heroSlides[Math.min(heroIndex, heroSlides.length - 1)] || '/pasar.jpeg'
  const newsItems = cms.news.filter((item) => item.title || item.summary || item.image)
  const activeStallCount = stalls.filter((stall) => (stall.status || '').toUpperCase() === 'AKTIF').length
  const sectorSummaries = sectors.map((sector) => ({
    ...sector,
    count: stalls.filter((stall) => stall.sector_name === sector.name).length
  }))
  const featuredStalls = stalls.slice(0, 8)

  return (
    <div className="market-landing">
      <div className="landing-hero" style={{
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="hero-overlay">
          <div className="hero-content">
            <div className="hero-brand-row">
              <img src={commerceLogo} alt={`Logo Pasar ${displayMarket.name}`} className="hero-logo" onError={(event) => { (event.currentTarget as HTMLImageElement).src = '/logo.jpeg' }} />
              <div>
                <h1>Pasar {displayMarket.name}</h1>
                <p className="hero-subtitle">{displayAddress}</p>
              </div>
            </div>
            <div className="hero-badges">
              <span className="badge badge-code">Kode: {displayMarket.code}</span>
              <span className="badge badge-status">{displayMarket.status}</span>
            </div>
            <div className="hero-actions">
              <button type="button" className="hero-action primary" onClick={() => setActiveTab('info')}>Lihat informasi</button>
              <button type="button" className="hero-action secondary" onClick={() => setActiveTab('stalls')}>Lihat lapak</button>
            </div>
            {heroSlides.length > 1 && (
              <div className="hero-dots" aria-label="Slide hero pasar">
                {heroSlides.map((_, idx) => (
                  <button
                    key={`${heroImage}-${idx}`}
                    type="button"
                    className={`hero-dot ${idx === heroIndex ? 'active' : ''}`}
                    onClick={() => setHeroIndex(idx)}
                    aria-label={`Lihat slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="market-summary-strip">
        <div className="summary-strip-card">
          <span>Sektor</span>
          <strong>{sectors.length}</strong>
        </div>
        <div className="summary-strip-card">
          <span>Lapak</span>
          <strong>{stalls.length}</strong>
        </div>
        <div className="summary-strip-card">
          <span>Aktif</span>
          <strong>{activeStallCount}</strong>
        </div>
        <div className="summary-strip-card">
          <span>Status</span>
          <strong>{displayMarket.status || 'AKTIF'}</strong>
        </div>
      </div>

      <div className="landing-nav">
        <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>📋 Informasi</button>
        <button className={`tab-btn ${activeTab === 'sectors' ? 'active' : ''}`} onClick={() => setActiveTab('sectors')}>📂 Sektor ({sectors.length})</button>
        <button className={`tab-btn ${activeTab === 'stalls' ? 'active' : ''}`} onClick={() => setActiveTab('stalls')}>🏪 Lapak ({stalls.length})</button>
      </div>

      <div className="landing-content">
        {activeTab === 'info' && (
          <div className="info-panel">
            <div className="info-card wide market-intro-card">
              <h3>📝 Tentang Pasar</h3>
              <p>{displayMarket.description || 'Informasi pasar belum tersedia.'}</p>
            </div>

            {cms.announcement && (
              <div className="info-card wide announcement-card">
                <h3>📣 Pengumuman</h3>
                <p>{cms.announcement}</p>
              </div>
            )}

            <div className="info-card">
              <h3>📍 Alamat</h3>
              <p>{displayAddress}</p>
            </div>
            <div className="info-card">
              <h3>🏙️ Kota</h3>
              <p>{displayMarket.city || '-'}</p>
            </div>
            <div className="info-card">
              <h3>🔢 Kode Pasar</h3>
              <p>{displayMarket.code || '-'}</p>
            </div>
            <div className="info-card">
              <h3>📊 Status</h3>
              <p className={`status-${(displayMarket.status || '').toLowerCase()}`}>{displayMarket.status}</p>
            </div>
            <div className="info-card wide">
              <h3>📈 Statistik</h3>
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-number">{sectors.length}</span>
                  <span className="stat-label">Sektor</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{stalls.length}</span>
                  <span className="stat-label">Lapak</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{activeStallCount}</span>
                  <span className="stat-label">Aktif</span>
                </div>
              </div>
            </div>

            {newsItems.length > 0 && (
              <div className="info-card wide news-card">
                <h3>📰 Berita</h3>
                <div className="news-grid">
                  {newsItems.map((item, index) => (
                    <article key={`${item.title || 'news'}-${index}`} className="news-item">
                      {item.image && <img src={item.image} alt={item.title || 'Berita pasar'} className="news-image" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = 'none' }} />}
                      <div className="news-item-body">
                        <h4>{item.title || 'Berita pasar'}</h4>
                        <p>{item.summary || 'Informasi terbaru mengenai pasar ini.'}</p>
                        {item.link && <a href={item.link} target="_blank" rel="noreferrer">Baca selengkapnya</a>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sectors' && (
          <div className="summary-panel">
            <div className="summary-box highlight">
              <span>Jumlah sektor</span>
              <strong>{sectors.length}</strong>
            </div>
            <div className="summary-box muted">
              <span>Status pasar</span>
              <strong>{displayMarket.status || 'AKTIF'}</strong>
            </div>
            <div className="sector-list">
              {sectorSummaries.length > 0 ? sectorSummaries.map((sector) => (
                <div key={sector.id} className="sector-card public-sector-card">
                  <div className="sector-card-header">
                    <h3>{sector.name}</h3>
                    <span className="sector-count">{sector.count} lapak</span>
                  </div>
                  <p>{sector.description || 'Sektor pasar yang aktif dan siap melayani pembeli.'}</p>
                </div>
              )) : (
                <div className="empty-msg">Belum ada sektor yang ditambahkan untuk pasar ini.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stalls' && (
          <div className="summary-panel">
            <div className="summary-box highlight">
              <span>Jumlah lapak</span>
              <strong>{stalls.length}</strong>
            </div>
            <div className="summary-box muted">
              <span>Lapak aktif</span>
              <strong>{activeStallCount}</strong>
            </div>
            <div className="summary-box muted">
              <span>Lapak nonaktif</span>
              <strong>{Math.max(stalls.length - activeStallCount, 0)}</strong>
            </div>
            <div className="stall-list">
              {featuredStalls.length > 0 ? featuredStalls.map((stall) => (
                <div key={stall.id} className="stall-mini-row">
                  <div>
                    <strong>{stall.code || 'Lapak'}</strong>
                    <span>{stall.name || 'Nama lapak belum diisi'}</span>
                  </div>
                  <span className={`badge-sm ${stall.status === 'AKTIF' ? 'badge-aktif' : 'badge-nonaktif'}`}>
                    {stall.status || 'AKTIF'}
                  </span>
                </div>
              )) : (
                <div className="empty-msg">Belum ada lapak yang terdaftar di pasar ini.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="landing-footer">
        <p>© 2026 SiAga - Sistem Informasi Manajemen Pasar</p>
        <p>Data pasar {displayMarket.name} - {displayMarket.city || '-'}</p>
      </div>
    </div>
  )
}