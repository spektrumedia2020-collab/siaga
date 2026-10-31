import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import './PublicStallPage.css'

interface Props {
  token?: string
  marketId?: string
  stallCode?: string
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

export function PublicStallPage({ token, marketId, stallCode }: Props) {
  const [data, setData] = useState<StallResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'rates' | 'transactions'>('rates')
  const [pinInput, setPinInput] = useState('')
  const [unlockedPin, setUnlockedPin] = useState<string | null>(null)
  const [pinError, setPinError] = useState('')
  const [changeOpen, setChangeOpen] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  const [pinSaving, setPinSaving] = useState(false)

  useEffect(() => {
    if (!unlockedPin) return
    const controller = new AbortController()

    const loadStall = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/lapak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, marketId, code: stallCode, pin: unlockedPin }),
          signal: controller.signal
        })
        const result = await response.json().catch(() => ({}))

        if (response.status === 401 || response.status === 503) {
          setUnlockedPin(null)
          setPinError(result.error || (response.status === 401 ? 'PIN salah' : 'Fitur PIN lapak belum aktif di server'))
          return
        }

        if (!response.ok) throw new Error(result.error || 'Lapak tidak ditemukan')
        setData(result)
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setError(err?.message || 'Gagal memuat data lapak')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadStall()
    return () => controller.abort()
  }, [token, marketId, stallCode, unlockedPin])

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('PIN harus 4 angka')
      return
    }
    setPinError('')
    setUnlockedPin(pinInput)
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinMessage('')

    if (!/^\d{4}$/.test(newPin)) {
      setPinMessage('PIN baru harus 4 angka')
      return
    }
    if (newPin !== confirmPin) {
      setPinMessage('Konfirmasi PIN tidak sama')
      return
    }
    if (!token || !unlockedPin) {
      setPinMessage('Ganti PIN hanya bisa lewat tautan QR pemilik')
      return
    }

    setPinSaving(true)
    try {
      const supabase = getSupabaseClient()
      const { error: rpcError } = await supabase.rpc('set_stall_pin', {
        p_token: token,
        p_old_pin: unlockedPin,
        p_new_pin: newPin
      })
      if (rpcError) throw rpcError

      setUnlockedPin(newPin)
      setPinInput(newPin)
      setNewPin('')
      setConfirmPin('')
      setChangeOpen(false)
      setPinMessage('PIN berhasil diganti.')
    } catch (err: any) {
      setPinMessage(err?.message || 'Gagal mengganti PIN')
    } finally {
      setPinSaving(false)
    }
  }

  if (!unlockedPin) {
    return (
      <main className="public-stall-page public-stall-login-page">
        <div className="public-stall-login-shell">
          <div className="public-stall-login-visual">
            <img src="/logo.jpeg" alt="" />
            <div className="public-stall-login-overlay" />
            <div className="public-stall-login-copy">
              <p>Portal Pemilik Lapak</p>
              <h1>Informasi lapak, tarif, dan riwayat pembayaran.</h1>
              <span>Masukkan PIN untuk membuka data lapak Anda.</span>
            </div>
          </div>
          <div className="public-stall-panel public-stall-pin-panel">
            <div className="public-stall-pin-heading">
              <p>Akses pemilik</p>
              <h2>Masukkan PIN</h2>
              <span>PIN awal 7777. Segera ganti setelah berhasil masuk.</span>
            </div>
            <form className="public-stall-pin-form" onSubmit={handleUnlock}>
              <label htmlFor="stall-pin">PIN 4 angka</label>
              <input
                id="stall-pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                autoFocus
              />
              <button type="submit" disabled={pinInput.length !== 4}>
                Buka data lapak
              </button>
            </form>
            {pinError && <p className="public-stall-pin-error">{pinError}</p>}
          </div>
        </div>
      </main>
    )
  }

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
  const sortedTransactions = [...stall.transactions].sort((a, b) => {
    const aTime = new Date(a.transaction_date || a.created_at).getTime()
    const bTime = new Date(b.transaction_date || b.created_at).getTime()
    return bTime - aTime
  })
  const totalRevenue = sortedTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const latestTransaction = sortedTransactions[0]

  return (
    <main className="public-stall-page">
      <div className="public-stall-panel">
        <div className="public-stall-brand">
          <img src={market.photo_url || '/logo.jpeg'} alt={`Logo Pasar ${market.name}`} />
          <div>
            <h1>Pasar {market.name}</h1>
            {market.address ? <p>{market.address}</p> : null}
          </div>
        </div>

        <div className="public-stall-body-title">Informasi Lapak</div>

        <section className="public-stall-identity">
          <span className="public-stall-label">Kode Lapak</span>
          <strong>{stall.code}</strong>
          <span className="public-stall-status">{stall.status || 'AKTIF'}</span>
        </section>

        <dl className="public-stall-details">
          <div><dt>Sektor</dt><dd>{stall.sector_name || '-'}</dd></div>
          <div><dt>Nomor Lapak</dt><dd>{stall.number || '-'}</dd></div>
          <div><dt>Pemilik</dt><dd>{stall.owner_name || 'Belum terdaftar'}</dd></div>
          <div><dt>Kota</dt><dd>{market.city || '-'}</dd></div>
        </dl>

        <div className="public-stall-summary-row">
          <div className="public-stall-summary-card">
            <span>Total pendapatan</span>
            <strong>Rp {totalRevenue.toLocaleString('id-ID')}</strong>
          </div>
          <div className="public-stall-summary-card">
            <span>Transaksi</span>
            <strong>{sortedTransactions.length}</strong>
          </div>
          <div className="public-stall-summary-card">
            <span>Tarif aktif</span>
            <strong>{stall.rates.length}</strong>
          </div>
          <div className="public-stall-summary-card">
            <span>Terakhir</span>
            <strong>{latestTransaction ? new Date(latestTransaction.transaction_date || latestTransaction.created_at).toLocaleDateString('id-ID') : '-'}</strong>
          </div>
        </div>

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

        <section className="public-stall-pin-manage">
          <div className="public-stall-section-heading">
            <h2>PIN Pemilik</h2>
            <button type="button" className="public-stall-pin-toggle" onClick={() => setChangeOpen((value) => !value)}>
              {changeOpen ? 'Batal' : 'Ganti PIN'}
            </button>
          </div>
          {changeOpen ? (
            <form className="public-stall-pin-manage-form" onSubmit={handleChangePin}>
              <input
                inputMode="numeric"
                maxLength={4}
                placeholder="PIN baru (4 angka)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <input
                inputMode="numeric"
                maxLength={4}
                placeholder="Ulangi PIN baru"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              <button type="submit" disabled={pinSaving || !token}>
                {pinSaving ? 'Menyimpan...' : 'Simpan PIN baru'}
              </button>
              {!token && <span className="public-stall-muted">Ganti PIN hanya lewat tautan QR pemilik.</span>}
            </form>
          ) : (
            <p className="public-stall-muted">Gunakan PIN untuk membuka halaman ini. PIN awal 7777.</p>
          )}
          {pinMessage && <p className="public-stall-pin-manage-message">{pinMessage}</p>}
        </section>

        <footer>Data resmi SiAga • {market.code || market.name}</footer>
      </div>
    </main>
  )
}
