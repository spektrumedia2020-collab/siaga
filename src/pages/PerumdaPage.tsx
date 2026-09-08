import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './PerumdaPage.css'

interface MarketReport {
  id: number
  name: string
  status: string | null
  stallCount: number
  activeStallCount: number
  touchedStallCount: number
  transactionCount: number
  revenue: number
  deposited: number
  pendingDepositCount: number
  revenueShare: number
  averageTransaction: number
  collectionRate: number
  collectionCoverage: number
  unsettledBalance: number
}

interface AlertItem {
  level: string
  title: string
  message: string
}

interface ReportResponse {
  period: { from: string; to: string }
  previousPeriod?: { from: string; to: string }
  summary: {
    marketCount: number
    stallCount: number
    activeStallCount: number
    touchedStallCount: number
    transactionCount: number
    revenue: number
    deposited: number
    pendingDepositCount: number
    averageTransaction: number
    collectionRate: number
    collectionCoverage: number
    unsettledBalance: number
    previousRevenue: number
    revenueDelta: number
    revenueDeltaPercent: number
    alerts: AlertItem[]
  }
  dailyTrend: Array<{ date: string; transactions: number; revenue: number }>
  markets: MarketReport[]
}

const TOKEN_KEY = 'siaga-perumda-token'
const REPORT_KEY = 'siaga-perumda-report'
const today = new Date().toISOString().slice(0, 10)
const firstDay = `${today.slice(0, 8)}01`
const currentMonthValue = `${today.slice(0, 7)}`

const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(new Date().getFullYear(), index, 1)
  return {
    value: `${date.getFullYear()}-${String(index + 1).padStart(2, '0')}`,
    label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  }
})

const getShortcutMonths = () => {
  const now = new Date()

  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)

    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('id-ID', { month: 'long' })
    }
  })
}

type PeriodPreset = 'day' | 'week' | 'month' | 'custom'

const formatDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getPresetRange = (preset: Exclude<PeriodPreset, 'custom'>) => {
  const currentDate = new Date()

  if (preset === 'day') {
    return { from: formatDateInput(currentDate), to: formatDateInput(currentDate) }
  }

  if (preset === 'week') {
    const startDate = new Date(currentDate)
    startDate.setDate(startDate.getDate() - 6)
    return { from: formatDateInput(startDate), to: formatDateInput(currentDate) }
  }

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  return { from: formatDateInput(startOfMonth), to: formatDateInput(currentDate) }
}

const getMonthRange = (monthValue: string) => {
  const [yearPart, monthPart] = monthValue.split('-').map(Number)
  const year = Number(yearPart)
  const month = Number(monthPart)
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)

  return {
    from: formatDateInput(from),
    to: formatDateInput(to)
  }
}

const getStoredReport = (): ReportResponse | null => {
  try {
    const rawReport = sessionStorage.getItem(REPORT_KEY)
    if (!rawReport) return null
    return JSON.parse(rawReport) as ReportResponse
  } catch {
    return null
  }
}

const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const formatShortDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

export function PerumdaPage() {
  const [pin, setPin] = useState('')
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [from, setFrom] = useState(firstDay)
  const [to, setTo] = useState(today)
  const [month, setMonth] = useState(currentMonthValue)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month')
  const [report, setReport] = useState<ReportResponse | null>(() => getStoredReport())
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
      sessionStorage.setItem(REPORT_KEY, JSON.stringify(result))
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
    sessionStorage.removeItem(REPORT_KEY)
    setToken('')
    setReport(null)
    setError('')
  }

  const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextPreset = event.target.value as PeriodPreset
    setPeriodPreset(nextPreset)

    if (nextPreset === 'custom') {
      return
    }

    const nextRange = getPresetRange(nextPreset)
    setFrom(nextRange.from)
    setTo(nextRange.to)

    if (nextPreset === 'month') {
      setMonth(currentMonthValue)
    }
  }

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextMonth = event.target.value
    setMonth(nextMonth)
    setPeriodPreset('month')

    const nextRange = getMonthRange(nextMonth)
    setFrom(nextRange.from)
    setTo(nextRange.to)
  }

  const handleMonthShortcut = (nextMonth: string) => {
    setMonth(nextMonth)
    setPeriodPreset('month')

    const nextRange = getMonthRange(nextMonth)
    setFrom(nextRange.from)
    setTo(nextRange.to)
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
            <label>
              Rentang
              <select value={periodPreset} onChange={handlePresetChange}>
                <option value="day">Hari ini</option>
                <option value="week">Minggu ini</option>
                <option value="month">Bulan ini</option>
                <option value="custom">Tanggal khusus</option>
              </select>
            </label>
            <label>
              Bulan
              <select value={month} onChange={handleMonthChange}>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="perumda-month-shortcuts-wrap">
              <span className="perumda-month-shortcuts-label">Shortcut</span>
              <div className="perumda-month-shortcuts">
                {getShortcutMonths().map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`perumda-month-shortcut${month === option.value ? ' active' : ''}`}
                    onClick={() => handleMonthShortcut(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label>Mulai<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPeriodPreset('custom') }} /></label>
            <label>Sampai<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPeriodPreset('custom') }} /></label>
            <button type="submit" disabled={loading}>{loading ? 'Memuat...' : 'Terapkan'}</button>
          </form>
        </div>

        {error && <p className="perumda-error">{error}</p>}
        {loading && !report ? (
          <div className="perumda-loading-shell" aria-live="polite">
            <div className="perumda-loading-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`metric-skeleton-${index}`} className="perumda-skeleton-card perumda-skeleton-metric">
                  <div className="perumda-skeleton-line short" />
                  <div className="perumda-skeleton-line tall" />
                  <div className="perumda-skeleton-line medium" />
                </div>
              ))}
            </div>
            <div className="perumda-loading-insight-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`insight-skeleton-${index}`} className="perumda-skeleton-card perumda-skeleton-insight">
                  <div className="perumda-skeleton-line short" />
                  <div className="perumda-skeleton-line medium" />
                  <div className="perumda-skeleton-line small" />
                </div>
              ))}
            </div>
            <div className="perumda-loading-charts">
              <div className="perumda-skeleton-card perumda-skeleton-chart large" />
              <div className="perumda-skeleton-card perumda-skeleton-chart" />
            </div>
          </div>
        ) : report && (
          <>
            <p className="perumda-period">Periode {formatDate(report.period.from)} sampai {formatDate(report.period.to)}</p>
            <section className="perumda-metrics perumda-metrics-primary">
              <article><span>Belum setor</span><strong>{formatRupiah(report.summary.unsettledBalance)}</strong><small>{report.summary.pendingDepositCount} setoran menunggu</small></article>
              <article className="accent"><span>Total retribusi</span><strong>{formatRupiah(report.summary.revenue)}</strong><small>{formatRupiah(report.summary.deposited)} sudah disetor</small></article>
            </section>

            <section className="perumda-metrics perumda-metrics-secondary">
              <article><span>Pasar</span><strong>{report.summary.marketCount}</strong><small>terdaftar</small></article>
              <article><span>Lapak aktif</span><strong>{report.summary.activeStallCount}</strong><small>{report.summary.stallCount} total lapak</small></article>
              <article><span>Lapak tertarik</span><strong>{report.summary.touchedStallCount}</strong><small>lapak yang menarik retribusi</small></article>
              <article><span>Cakupan penarikan</span><strong>{report.summary.collectionCoverage.toFixed(1)}%</strong><small>{report.summary.touchedStallCount} dari {report.summary.activeStallCount} lapak aktif</small></article>
            </section>

            <section className="perumda-insight-grid">
              <article><span>Transaksi lunas</span><strong>{report.summary.transactionCount}</strong><small>pada periode ini</small></article>
              <article><span>Rata-rata transaksi</span><strong>{formatRupiah(report.summary.averageTransaction)}</strong><small>nilai per transaksi lunas</small></article>
              <article><span>Rasio setoran</span><strong>{report.summary.collectionRate.toFixed(1)}%</strong><small>retribusi yang sudah disetujui</small></article>
              <article>
                <span>Perubahan vs periode sebelumnya</span>
                <strong className={report.summary.revenueDelta >= 0 ? 'perumda-positive' : 'perumda-negative'}>
                  {report.summary.revenueDelta >= 0 ? '+' : '-'}{formatRupiah(Math.abs(report.summary.revenueDelta))}
                </strong>
                <small>{report.summary.revenueDeltaPercent >= 0 ? '+' : '-'}{Math.abs(report.summary.revenueDeltaPercent).toFixed(1)}% dibanding periode sebelumnya</small>
              </article>
            </section>

            {report.summary.alerts.length > 0 && (
              <section className="perumda-alerts" aria-label="Peringatan operasional">
                {report.summary.alerts.map((alert) => (
                  <div key={`${alert.title}-${alert.message}`} className={`perumda-alert perumda-alert-${alert.level}`}>
                    <strong>{alert.title}</strong>
                    <span>{alert.message}</span>
                  </div>
                ))}
              </section>
            )}

            <section className="perumda-charts">
              <article className="perumda-chart-card">
                <div className="perumda-chart-heading"><div><p className="perumda-eyebrow">Tren waktu</p><h3>Pendapatan harian</h3></div><span>{report.dailyTrend.length} hari aktif</span></div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={report.dailyTrend} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e3d8" />
                    <XAxis dataKey="date" tickFormatter={formatShortDate} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} />
                    <Tooltip labelFormatter={(value) => formatDate(String(value))} formatter={(value: number | string | readonly (number | string)[] | undefined) => formatRupiah(Number(value || 0))} />
                    <Line type="monotone" dataKey="revenue" name="Pendapatan" stroke="#1f614b" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </article>
              <article className="perumda-chart-card">
                <div className="perumda-chart-heading"><div><p className="perumda-eyebrow">Kontribusi</p><h3>Pendapatan per pasar</h3></div><span>pangsa global</span></div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={report.markets.slice(0, 8)} layout="vertical" margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#d9e3d8" />
                    <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}jt`} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} tick={{ fill: '#53645a', fontSize: 12 }} />
                    <Tooltip formatter={(value: number | string | readonly (number | string)[] | undefined) => formatRupiah(Number(value || 0))} />
                    <Bar dataKey="revenue" name="Pendapatan" fill="#a26035" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            </section>

            <section className="perumda-table-section">
              <div className="perumda-section-heading"><div><p className="perumda-eyebrow">Perbandingan</p><h2>Kinerja per pasar</h2></div><span>{report.summary.pendingDepositCount} setoran belum disetujui</span></div>
              <div className="perumda-table-wrap">
                <table>
                  <thead><tr><th>Pasar</th><th>Lapak aktif</th><th>Lapak tertarik</th><th>Transaksi</th><th>Retribusi</th><th>Pangsa</th><th>Belum setor</th><th>Setoran disetujui</th></tr></thead>
                  <tbody>{report.markets.map((market) => <tr key={market.id}><td><strong>{market.name}</strong><small>{market.status || 'Status tidak tersedia'}</small></td><td>{market.activeStallCount} / {market.stallCount}</td><td>{market.touchedStallCount}</td><td>{market.transactionCount}</td><td>{formatRupiah(market.revenue)}</td><td>{market.revenueShare.toFixed(1)}%</td><td>{formatRupiah(market.unsettledBalance)}<small>{market.collectionCoverage.toFixed(1)}% cakupan</small></td><td>{formatRupiah(market.deposited)}<small>{market.collectionRate.toFixed(1)}% tersetor</small>{market.pendingDepositCount > 0 && <small className="pending">{market.pendingDepositCount} menunggu</small>}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}
