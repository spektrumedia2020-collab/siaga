import { useState } from 'react'
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
    rates: { amount: number; name: string | null; unit: string | null }[]
    transactions: { amount: number; payment_method: string | null; created_at: string; transaction_date: string | null; status: string }[]
  }
}

export function PublicStallPage({ marketId, stallCode }: Props) {
  const [data, setData] = useState<StallResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [activeTab, setActiveTab] = useState<'rates' | 'transactions'>('rates')

  const loadStall = async (accessPin: string) => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/lapak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, code: stallCode, pin: accessPin })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Lapak tidak ditemukan')
      setData(result)
      setUnlocked(true)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data lapak')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <main className="public-stall-page"><div className="public-stall-panel">Memuat data lapak...</div></main>
  }

  if (!unlocked) {
    return (
      <main className="public-stall-page">
        <div className="public-stall-panel public-stall-pin-panel">
          <div className="public-stall-brand">
            <span>SiAga</span>
            <div><p>Akses pemilik lapak</p><h1>Informasi Lapak</h1></div>
          </div>
          <form className="public-stall-pin-form" onSubmit={(event) => { event.preventDefault(); loadStall(pin) }}>
            <label htmlFor="stall-pin">Masukkan PIN</label>
            <input
              id="stall-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              autoFocus
              required
            />
            <button type="submit" disabled={loading || pin.length !== 4}>Buka informasi</button>
          </form>
          {error ? <p className="public-stall-pin-error">{error}</p> : null}
          <footer>Masukkan PIN untuk melihat tarif dan riwayat transaksi.</footer>
        </div>
      </main>
    )
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
          <div><dt>Alamat Pasar</dt><dd>{market.address || 'Alamat belum diatur'}</dd></div>
        </dl>

        <div className="public-stall-tabs" role="tablist" aria-label="Informasi lapak">
          <button type="button" className={activeTab === 'rates' ? 'active' : ''} onClick={() => setActiveTab('rates')} role="tab" aria-selected={activeTab === 'rates'}>
            Tarif <span>{stall.rates.length}</span>
          </button>
          <button type="button" className={activeTab === 'transactions' ? 'active' : ''} onClick={() => setActiveTab('transactions')} role="tab" aria-selected={activeTab === 'transactions'}>
            Riwayat Transaksi <span>{stall.transactions.length}</span>
          </button>
        </div>

        {activeTab === 'rates' ? (
          <section className="public-stall-section" role="tabpanel">
            <div className="public-stall-section-heading"><h2>Tarif Retribusi</h2><span>{stall.rates.length} tarif</span></div>
            {stall.rates.length === 0 ? <p className="public-stall-muted">Belum ada tarif terdaftar.</p> : (
              <div className="public-stall-list">
                {stall.rates.map((rate, index) => <div className="public-stall-list-row" key={`${rate.name}-${index}`}><span>{rate.name || 'Tarif retribusi'}{rate.unit ? ` / ${rate.unit}` : ''}</span><strong>Rp {Number(rate.amount).toLocaleString('id-ID')}</strong></div>)}
              </div>
            )}
          </section>
        ) : (
          <section className="public-stall-section" role="tabpanel">
            <div className="public-stall-section-heading"><h2>Riwayat Transaksi</h2><span>{stall.transactions.length} transaksi</span></div>
            {stall.transactions.length === 0 ? <p className="public-stall-muted">Belum ada transaksi pembayaran.</p> : (
              <div className="public-stall-list">
                {stall.transactions.map((transaction, index) => <div className="public-stall-list-row" key={`${transaction.created_at}-${index}`}><span>{new Date(transaction.transaction_date || transaction.created_at).toLocaleDateString('id-ID')}<small>{transaction.payment_method || 'Pembayaran'}</small></span><strong>Rp {Number(transaction.amount).toLocaleString('id-ID')}</strong></div>)}
              </div>
            )}
          </section>
        )}

        <footer>Data resmi SiAga • {market.code || market.name}</footer>
      </div>
    </main>
  )
}
