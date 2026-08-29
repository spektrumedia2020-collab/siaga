import { useState, useEffect, useRef } from 'react'
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
  aboutMarket: string
  news: PublicNewsItem[]
}

interface Props {
  slug: string
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value || typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function MarketLandingPage({ slug }: Props) {
  const [market, setMarket] = useState<MarketData | null>(null)
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [stalls, setStalls] = useState<StallData[]>([])
  const [cms, setCms] = useState<CmsContent>({ logoUrl: '', heroSlides: [], announcement: '', aboutMarket: '', news: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [heroIndex, setHeroIndex] = useState(0)
  const [isNavOpen, setIsNavOpen] = useState(false)

  useEffect(() => {
    loadMarketData()
  }, [slug])

  useEffect(() => {
    if (!cms.heroSlides || cms.heroSlides.length <= 1) return
    const interval = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % cms.heroSlides.length)
    }, 5000)
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

      let cmsContent: CmsContent = { logoUrl: '', heroSlides: [], announcement: '', aboutMarket: '', news: [] }
      ;(configRows || []).forEach((row: any) => {
        if (row.key === 'public_logo_url') cmsContent.logoUrl = row.value || ''
        if (row.key === 'public_hero_images') cmsContent.heroSlides = parseJsonArray<string>(row.value)
        if (row.key === 'public_announcement') cmsContent.announcement = row.value || ''
        if (row.key === 'public_about_market') cmsContent.aboutMarket = row.value || ''
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

    setStalls(
      (stallsData || []).map((s: any) => ({
        id: s.id,
        code: s.code || '',
        name: s.number || '',
        sector_name: sectorMap.get(s.sector_id) || '-',
        owner_name: ownerMap.get(s.owner_id) || '-',
        status: s.status || 'AKTIF'
      }))
    )
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
    return (
      <div className="market-landing-error">
        <div className="error-card">
          <h1>Pasar tidak ditemukan</h1>
          <p>{error || 'Data pasar tidak tersedia.'}</p>
          <a href="/" className="btn-back">
            Kembali
          </a>
        </div>
      </div>
    )
  }

  // Helper functions
  const clean = (value: unknown) => String(value || '').trim().replace(/^[,\s]+|[,\s]+$/g, '')
  const structuredAddress = [
    [clean(market.street), clean(market.street_number)].filter(Boolean).join(' '),
    clean(market.kecamatan) ? `Kecamatan ${clean(market.kecamatan)}` : '',
    clean(market.city),
    clean(market.province),
    clean(market.postal_code)
  ]
    .filter(Boolean)
    .join(', ')
  const displayAddress = structuredAddress || clean(market.address) || '-'
  const commerceLogo = cms.logoUrl || market.logo_url || market.head_photo_url || market.photo_url || '/logo.jpeg'
  const heroSlides = cms.heroSlides.length > 0 ? cms.heroSlides.filter(Boolean) : [market.photo_url || '/pasar.jpeg']
  const heroImage = heroSlides[Math.min(heroIndex, heroSlides.length - 1)] || '/pasar.jpeg'
  const newsItems = cms.news.filter((item) => item.title || item.summary || item.image).slice(0, 3)
  const activeStallCount = stalls.filter((stall) => (stall.status || '').toUpperCase() === 'AKTIF').length
  const galleryImages = heroSlides.slice(0, 9) // Use hero images for gallery

  return (
    <div className="market-landing">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <img src={commerceLogo} alt={`Logo ${market.name}`} className="navbar-logo" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.jpeg' }} />
            <span className="navbar-title">{market.name}</span>
          </div>

          <button className="navbar-toggle" onClick={() => setIsNavOpen(!isNavOpen)} aria-label="Toggle menu">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <ul className={`navbar-menu ${isNavOpen ? 'active' : ''}`}>
            <li><a href="#beranda" onClick={() => setIsNavOpen(false)}>Beranda</a></li>
            <li><a href="#tentang" onClick={() => setIsNavOpen(false)}>Tentang</a></li>
            <li><a href="#keunggulan" onClick={() => setIsNavOpen(false)}>Keunggulan</a></li>
            <li><a href="#kegiatan" onClick={() => setIsNavOpen(false)}>Kegiatan</a></li>
            <li><a href="#kontak" onClick={() => setIsNavOpen(false)}>Kontak</a></li>
          </ul>

          <button className="navbar-cta">Jelajahi Niaga</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="beranda" className="hero">
        <div className="hero-background" style={{ backgroundImage: `url(${heroImage})` }}></div>
        <div className="hero-overlay"></div>
        <div className="hero-content-wrapper">
          <div className="hero-text">
            <h1 className="hero-title">Pasar {market.name}</h1>
            <p className="hero-subtitle">Pasar modern yang terintegrasi dengan teknologi SIAGA</p>
            <p className="hero-description">{displayAddress}</p>
            <div className="hero-buttons">
              <button className="btn btn-primary">Mulai Jelajah</button>
              <button className="btn btn-secondary">Pelajari Lebih Lanjut</button>
            </div>
          </div>
        </div>
        {heroSlides.length > 1 && (
          <div className="hero-dots">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                className={`dot ${idx === heroIndex ? 'active' : ''}`}
                onClick={() => setHeroIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* About Market Section */}
      <section id="tentang" className="section about-market">
        <div className="container">
          <h2>Tentang Pasar {market.name}</h2>
          <p className="section-description">
            {cms.aboutMarket || market.description || 'Informasi pasar belum tersedia.'}
          </p>

          <div className="highlights-grid">
            <div className="highlight-card">
              <div className="highlight-icon">👥</div>
              <h3>Pedagang Aktif</h3>
              <p>{stalls.length} lapak siap melayani</p>
            </div>
            <div className="highlight-card">
              <div className="highlight-icon">📂</div>
              <h3>Berbagai Kategori</h3>
              <p>{sectors.length} sektor tersedia</p>
            </div>
            <div className="highlight-card">
              <div className="highlight-icon">✅</div>
              <h3>Terpercaya</h3>
              <p>{activeStallCount} lapak aktif beroperasi</p>
            </div>
            <div className="highlight-card">
              <div className="highlight-icon">📍</div>
              <h3>Lokasi Strategis</h3>
              <p>{market.city || '-'}, {market.kecamatan || '-'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section id="keunggulan" className="section advantages">
        <div className="container">
          <h2>Keunggulan Pasar Niaga Daya</h2>
          <p className="section-description">Mengapa memilih pasar kami</p>

          <div className="advantages-grid">
            <div className="advantage-card">
              <div className="advantage-icon">💳</div>
              <h3>Pembayaran Digital</h3>
              <p>Kemudahan transaksi dengan sistem pembayaran digital terintegrasi</p>
            </div>
            <div className="advantage-card">
              <div className="advantage-icon">🔗</div>
              <h3>Terintegrasi</h3>
              <p>Sistem terpadu untuk manajemen pasar yang efisien dan transparan</p>
            </div>
            <div className="advantage-card">
              <div className="advantage-icon">🏪</div>
              <h3>Nyaman</h3>
              <p>Fasilitas lengkap dan suasana pasar yang bersih dan menyenangkan</p>
            </div>
            <div className="advantage-card">
              <div className="advantage-icon">👁️</div>
              <h3>Transparan</h3>
              <p>Informasi pasar yang terbuka dan akses data yang mudah untuk semua</p>
            </div>
          </div>
        </div>
      </section>

      {/* About SIAGA Section */}
      <section className="section siaga-info">
        <div className="container">
          <div className="siaga-content">
            <div className="siaga-text">
              <h2>SIAGA untuk Pasar yang Lebih Modern</h2>
              <p>
                Sistem Informasi Retribusi Pasar (SIAGA) adalah solusi teknologi terpadu yang dirancang untuk mengubah cara pengelolaan pasar modern. Dengan SIAGA, pasar dapat beroperasi dengan lebih efisien, transparan, dan berkelanjutan.
              </p>
              <ul className="siaga-features">
                <li>📊 Dashboard analitik real-time untuk manajemen pasar</li>
                <li>💰 Sistem retribusi digital yang terintegrasi</li>
                <li>📱 Aplikasi mobile untuk kemudahan akses</li>
                <li>🔐 Keamanan data dengan enkripsi tingkat enterprise</li>
              </ul>
            </div>
            <div className="siaga-visual">
              <div className="siaga-icon-box">
                <div className="siaga-icon">🚀</div>
                <p>Teknologi Modern</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News/Activities Section */}
      {newsItems.length > 0 && (
        <section id="kegiatan" className="section news">
          <div className="container">
            <h2>Kegiatan Terbaru</h2>
            <p className="section-description">Berita dan informasi terkini dari Pasar {market.name}</p>

            <div className="news-grid">
              {newsItems.map((item, index) => (
                <article key={index} className="news-card">
                  {item.image && (
                    <div className="news-image" style={{ backgroundImage: `url(${item.image})` }}></div>
                  )}
                  <div className="news-body">
                    <h3>{item.title || 'Berita Pasar'}</h3>
                    <p>{item.summary || 'Informasi terbaru mengenai pasar ini.'}</p>
                    {item.link && (
                      <a href={item.link} className="news-link" target="_blank" rel="noreferrer">
                        Baca Selengkapnya →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <section className="section gallery">
          <div className="container">
            <h2>Galeri Pasar</h2>
            <p className="section-description">Suasana dan fasilitas Pasar {market.name}</p>

            <div className="gallery-grid">
              {galleryImages.map((img, index) => (
                <div key={index} className="gallery-item">
                  <img
                    src={img}
                    alt={`Galeri pasar ${index + 1}`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="section cta-section">
        <div className="container">
          <h2>Siap Bergabung dengan Pasar Modern?</h2>
          <p>Jadilah bagian dari Pasar Niaga Daya dan rasakan pengalaman berbelanja dan berdagang yang lebih baik</p>
          <button className="btn btn-primary btn-large">Jelajahi Lebih Lanjut</button>
        </div>
      </section>

      {/* Footer */}
      <footer id="kontak" className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-section">
              <h4>Pasar {market.name}</h4>
              <p>{displayAddress}</p>
            </div>
            <div className="footer-section">
              <h4>Informasi</h4>
              <ul>
                <li><a href="#tentang">Tentang Pasar</a></li>
                <li><a href="#keunggulan">Keunggulan</a></li>
                <li><a href="#kegiatan">Kegiatan</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Statistik</h4>
              <ul>
                <li>Sektor: {sectors.length}</li>
                <li>Lapak: {stalls.length}</li>
                <li>Aktif: {activeStallCount}</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Pasar {market.name}. Diperkuat oleh SIAGA.</p>
            <p>Sistem Informasi Retribusi Pasar</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
