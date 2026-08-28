import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'

interface MarketData {
  id: number
  name: string
  code: string
  city: string
  address: string
  photo_url: string
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

interface Props {
  slug: string
}

export function MarketLandingPage({ slug }: Props) {
  const [market, setMarket] = useState<MarketData | null>(null)
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [stalls, setStalls] = useState<StallData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'sectors' | 'stalls'>('info')

  useEffect(() => {
    loadMarketData()
  }, [slug])

  const loadMarketData = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()

      // Find market by code (slug = market code lowercase)
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select('*')
        .or(`code.ilike.${slug},name.ilike.%${slug}%`)
        .maybeSingle()

      if (marketError) throw marketError
      if (!marketData) throw new Error('Pasar tidak ditemukan')
      setMarket(marketData)
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

    // Load stalls with owner info
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

  return (
    <div className="market-landing">
      {/* Hero Section */}
      <div className="landing-hero" style={{
        backgroundImage: `url(${displayMarket.photo_url || '/pasar.jpeg'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="hero-overlay">
          <div className="hero-content">
              <h1>Pasar {displayMarket.name}</h1>
              <p className="hero-subtitle">{displayAddress}</p>
            <div className="hero-badges">
              <span className="badge badge-code">Kode: {displayMarket.code}</span>
              <span className="badge badge-status">{displayMarket.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="landing-nav">
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          📋 Informasi
        </button>
        <button
          className={`tab-btn ${activeTab === 'sectors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sectors')}
        >
          📂 Sektor ({sectors.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'stalls' ? 'active' : ''}`}
          onClick={() => setActiveTab('stalls')}
        >
          🏪 Lapak ({stalls.length})
        </button>
      </div>

      {/* Content */}
      <div className="landing-content">
        {activeTab === 'info' && (
          <div className="info-panel">
            <div className="info-card wide">
              <h3>📝 Tentang Pasar</h3>
              <p>{displayMarket.description || 'Informasi pasar belum tersedia.'}</p>
            </div>
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
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sectors' && (
          <div className="sectors-panel">
            {(sectors.length === 0 && !error) ? (
              <p className="empty-msg">Belum ada sektor</p>
            ) : (
              <div className="sectors-grid">
                {sectors.map((sector) => (
                  <div key={sector.id} className="sector-card">
                    <h3>{sector.name}</h3>
                    {sector.description && <p>{sector.description}</p>}
                    <span className="sector-count">
                      {stalls.filter(s => s.sector_name === sector.name).length} lapak
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stalls' && (
          <div className="stalls-panel">
            {stalls.length === 0 && !error ? (
              <p className="empty-msg">Belum ada lapak</p>
            ) : (
              <div className="stalls-table-wrapper">
                <table className="stalls-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th>Sektor</th>
                      <th>Pemilik</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stalls.map((stall) => (
                      <tr key={stall.id}>
                        <td>{stall.code}</td>
                        <td>{stall.name}</td>
                        <td>{stall.sector_name}</td>
                        <td>{stall.owner_name}</td>
                        <td>
                          <span className={`badge badge-sm badge-${stall.status.toLowerCase()}`}>
                            {stall.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="landing-footer">
        <p>© 2026 SiAga - Sistem Informasi Manajemen Pasar</p>
        <p>Data pasar {displayMarket.name} - {displayMarket.city || '-'}</p>
      </div>
    </div>
  )
}