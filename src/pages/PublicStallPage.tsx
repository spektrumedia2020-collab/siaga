import { useEffect, useState } from 'react'
import './PublicStallPage.css'

interface Props {
  marketId: string
  stallCode: string
}

interface StallResponse {
  market: {
    name: string
    code: string | null
    city: string | null
    address: string | null
    photo_url: string | null
  }
  stall: {
    code: string
    number: string | null
    status: string | null
    sector_name: string | null
    owner_name: string | null
  }
}

export function PublicStallPage({ marketId, stallCode }: Props) {
  const [data, setData] = useState<StallResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadStall = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetch(`/api/lapak?marketId=${encodeURIComponent(marketId)}&code=${encodeURIComponent(stallCode)}`)
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Lapak tidak ditemukan')
        setData(result)
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data lapak')
      } finally {
        setLoading(false)
      }
    }

    loadStall()
  }, [marketId, stallCode])

  if (loading) {
    return <main className="public-stall-page"><div className="public-stall-panel">Memuat data lapak...</div></main>
  }

  if (error || !data) {
    return (
      <main className="public-stall-page">
        <div className="public-stall-panel public-stall-error">
          <h1>Lapak tidak ditemukan</h1>
          <p>{error || 'Data lapak tidak tersedia.'}</p>
          <a href="/">Kembali ke halaman utama</a>
        </div>
      </main>
    )
  }

  const { market, stall } = data
  return (
    <main className="public-stall-page">
      <div className="public-stall-panel">
        <div className="public-stall-brand">
          {market.photo_url ? <img src={market.photo_url} alt={`Logo ${market.name}`} /> : <span>SiAga</span>}
          <div>
            <p>Informasi Lapak</p>
            <h1>{market.name}</h1>
          </div>
        </div>

        <section className="public-stall-identity">
          <span className="public-stall-label">Kode Lapak</span>
          <strong>{stall.code}</strong>
          <span className="public-stall-status">{stall.status || 'AKTIF'}</span>
        </section>

        <dl className="public-stall-details">
          <div><dt>Sektor</dt><dd>{stall.sector_name || '-'}</dd></div>
          <div><dt>Nomor Lapak</dt><dd>{stall.number || '-'}</dd></div>
          <div><dt>Pemilik</dt><dd>{stall.owner_name || 'Belum terdaftar'}</dd></div>
          {market.city ? <div><dt>Kota</dt><dd>{market.city}</dd></div> : null}
          {market.address ? <div><dt>Alamat Pasar</dt><dd>{market.address}</dd></div> : null}
        </dl>

        <footer>Data resmi SiAga • {market.code || market.name}</footer>
      </div>
    </main>
  )
}
