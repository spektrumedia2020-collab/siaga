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
}

interface SectorData {
  id: number
  name: string
  description: string
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
  const [error, setError] = useState('')
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
        .ilike('code', slug)
        .maybeSingle()

      if (marketError || !marketData) {
        // Try finding by name
        const { data: marketByName } = await supabase
          .from('markets')
          .select('*')
          .ilike('name', `%${slug}%`)
          .maybeSingle()

        if (marketByName) {
          setMarket(marketByName)
          await loadSectorsAndStalls(marketByName.id)
        } else {
          setError('Pasar tidak ditemukan')
        }
      } else {
        setMarket(marketData)
        await loadSectorsAndStalls(marketData.id)
      }
    } catch (err) {
      console.error('Error loading market:', err)
      setError('Gagal memuat data pasar')
    } finally {
      setLoading(false)
    }
  }

  const loadSectorsAndStalls = async (marketId: number) => {
    const supabase = getSupabaseClient()

    // Load sectors
    const { data: sectorsData } = await supabase
      .from('sectors')
      .select('*')
      .eq('market_id', marketId)
      .order('name')

    setSectors(sectorsData || [])

    // Load stalls with owner info
    const { data: stallsData } = await supabase
      .from('stalls')
      .select('*, sectors(name), stall_owners(name)')
      .eq('market_id', marketId)
      .order('code')

    setStalls((stallsData || []).map((s: any) => ({
      id: s.id,
      code: s.code || '',
      name: s.name || '',
      sector_name: s.sectors?.name || '-',
      owner_name: s.stall_owners?.name || '-',
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

  if (error || !market) {
    return (
      <div className="market-landing-error">
        <div className="error-card">
          <h1>🏪 Pasar Tidak Ditemukan</h1>
          <p>{error || 'Pasar dengan kode tersebut tidak ditemukan.'}</p>
          <a href="/" className="btn-back">← Kembali ke Beranda</a>
        </div>
      </div>
    )
  }

  return (
    <div className="market-landing">
      {/* Hero Section */}
      <div className="landing-hero" style={{
        backgroundImage: `url(${market.photo_url || '/pasar.jpeg'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>{market.name}</h1>
            <p className="hero-subtitle">{market.address}, {market.city}</p>
            <div className="hero-badges">
              <span className="badge badge-code">Kode: {market.code}</span>
              <span className="badge badge-status">{market.status}</span>
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
            <div className="info-card">
              <h3>📍 Alamat</h3>
              <p>{market.address || '-'}</p>
            </div>
            <div className="info-card">
              <h3>🏙️ Kota</h3>
              <p>{market.city || '-'}</p>
            </div>
            <div className="info-card">
              <h3>🔢 Kode Pasar</h3>
              <p>{market.code || '-'}</p>
            </div>
            <div className="info-card">
              <h3>📊 Status</h3>
              <p className={`status-${(market.status || '').toLowerCase()}`}>{market.status}</p>
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
            {sectors.length === 0 ? (
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
            {stalls.length === 0 ? (
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
        <p>Data pasar {market.name} - {market.city}</p>
      </div>
    </div>
  )
}