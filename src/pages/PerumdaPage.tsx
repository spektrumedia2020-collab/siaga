import { FormEvent, useEffect, useState } from 'react'
import './PerumdaPage.css'

interface MarketReport {
  id: number
  name: string
  status: string | null
  stallCount: number
  activeStallCount: number
  transactionCount: number
  revenue: number
  deposited: number
  pendingDepositCount: number
}

interface ReportResponse {
  period: { from: string; to: string }
  summary: {
    marketCount: number
    stallCount: number
    transactionCount: number
    revenue: number
    deposited: number
    pendingDepositCount: number
  }
  markets: MarketReport[]
}

const TOKEN_KEY = 'siaga-perumda-token'
const today = new Date().toISOString().slice(0, 10)
const firstDay = `${today.slice(0, 8)}01`

const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export function PerumdaPage() {
  const [pin, setPin] = useState('')
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [from, setFrom] = useState(firstDay)
  const [to, setTo] = useState(today)
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadReport = async (accessToken: string, start = from, end = to) => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`/api/perumda?from=${start}&to=${end}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY)
          setToken('')
        }
        throw new Error(result.error || 'Gagal memuat laporan')
      }
      setReport(result)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat laporan Perumda')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadReport(token)
  }, [token])

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/perumda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'PIN tidak valid')
      sessionStorage.setItem(TOKEN_KEY, result.token)
      setPin('')
      setToken(result.token)
    } catch (err: any) {
      setError(err.message || 'PIN tidak valid')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setReport(null)
    setError('')
  }

  const handleFilter = (event: FormEvent) => {
    event.preventDefault()
    if (token) loadReport(token, from, to)
  }

  if (!token) {
    return (
      <main className="perumda-page perumda-login-page">
        <div className="perumda-login-shell">
          <aside className="perumda-login-visual">
            <img src="/pdpasar.jpeg" alt="Aktivitas pasar" />
            <div className="perumda-login-visual-overlay" />
            <div className="perumda-login-visual-copy">
              <div className="perumda-mark"><img src="/logo.jpeg" alt="Logo SiAga" /></div>
              <p className="perumda-eyebrow">SIAGA • PERUMDA</p>
              <h1>Melihat seluruh pasar dengan lebih jernih.</h1>
              <p>Ringkasan operasional untuk memantau denyut pasar dari satu tempat.</p>
            </div>
          </aside>
          <section className="perumda-login-panel">
            <p className="perumda-eyebrow">Akses laporan global</p>
            <h2>Laporan Perumda</h2>
            <p className="perumda-muted">Masukkan PIN untuk membuka ringkasan seluruh pasar.</p>
            <form onSubmit={handleLogin} className="perumda-pin-form">
              <label htmlFor="perumda-pin">PIN akses</label>
              <input
                id="perumda-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
              />
              <button type="submit" disabled={loading || pin.length !== 6}>{loading ? 'Memverifikasi...' : 'Buka laporan'}</button>
            </form>
            {error && <p className="perumda-error">{error}</p>}
            <p className="perumda-login-footnote">Akses ini hanya menampilkan data agregat.</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="perumda-page">
      <header className="perumda-header">
        <div className="perumda-brand-lockup">
          <div className="perumda-mark small">S</div>
          <div><p className="perumda-eyebrow">SIAGA • PERUMDA</p><h1>Laporan Global</h1></div>
        </div>
        <button type="button" className="perumda-logout" onClick={handleLogout}>Keluar</button>
      </header>

      <section className="perumda-content">
        <div className="perumda-intro">
          <div><p className="perumda-eyebrow">Ringkasan kinerja</p><h2>Semua pasar, satu pandangan.</h2></div>
          <form className="perumda-filter" onSubmit={handleFilter}>
            <label>Mulai<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label>Sampai<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
            <button type="submit" disabled={loading}>{loading ? 'Memuat...' : 'Terapkan'}</button>
          </form>
        </div>

        {error && <p className="perumda-error">{error}</p>}
        {report && (
          <>
            <p className="perumda-period">Periode {formatDate(report.period.from)} sampai {formatDate(report.period.to)}</p>
            <section className="perumda-metrics">
              <article><span>Pasar</span><strong>{report.summary.marketCount}</strong><small>terdaftar</small></article>
              <article><span>Lapak</span><strong>{report.summary.stallCount}</strong><small>di seluruh pasar</small></article>
              <article><span>Transaksi lunas</span><strong>{report.summary.transactionCount}</strong><small>pada periode ini</small></article>
              <article className="accent"><span>Total retribusi</span><strong>{formatRupiah(report.summary.revenue)}</strong><small>{formatRupiah(report.summary.deposited)} sudah disetor</small></article>
            </section>

            <section className="perumda-table-section">
              <div className="perumda-section-heading"><div><p className="perumda-eyebrow">Perbandingan</p><h2>Kinerja per pasar</h2></div><span>{report.summary.pendingDepositCount} setoran belum disetujui</span></div>
              <div className="perumda-table-wrap">
                <table>
                  <thead><tr><th>Pasar</th><th>Lapak aktif</th><th>Transaksi</th><th>Retribusi</th><th>Setoran disetujui</th></tr></thead>
                  <tbody>{report.markets.map((market) => <tr key={market.id}><td><strong>{market.name}</strong><small>{market.status || 'Status tidak tersedia'}</small></td><td>{market.activeStallCount} / {market.stallCount}</td><td>{market.transactionCount}</td><td>{formatRupiah(market.revenue)}</td><td>{formatRupiah(market.deposited)}{market.pendingDepositCount > 0 && <small className="pending">{market.pendingDepositCount} menunggu</small>}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}
