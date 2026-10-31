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
    transactions: { amount: number; payment_method: string | null; created_at: string; transaction_date: string | null; status: string; bill_id?: number | null; period_year?: number | null; rate_name?: string | null }[]
  }
  summary: {
    total_paid: number
    paid_count: number
    last_paid_at: string | null
    today: { date: string; amount: number; count: number; daily_due: number; daily_names: string[]; daily_items: Array<{ name: string; amount: number; paid: boolean }>; paid_names: string[]; status: 'SUDAH' | 'BELUM' | 'TIDAK_ADA_TARIF' }
    bills_outstanding: number
    bills_count: number
    pin_is_default: boolean
    owner_has_phone: boolean
  }
  bills: Array<{
    bill_id: number
    period_year: number
    type_name: string
    amount_due: number
    amount_paid: number
    outstanding: number
    status: string
    due_date: string | null
    installments: Array<{ amount: number; payment_method: string | null; date: string }>
  }>
}

export function PublicStallPage({ token, marketId, stallCode }: Props) {
  const [data, setData] = useState<StallResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'rates' | 'transactions'>('rates')
  const [pinInput, setPinInput] = useState('')
  const [unlockedPin, setUnlockedPin] = useState<string | null>(null)
  const [pinError, setPinError] = useState('')
  const [pinIsDefault, setPinIsDefault] = useState<boolean | null>(null)
  const [marketContact, setMarketContact] = useState('')
  const [marketContactName, setMarketContactName] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetPhone, setResetPhone] = useState('')
  const [resetPin, setResetPin] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerPhoneError, setOwnerPhoneError] = useState('')
  const [ownerPhoneSaving, setOwnerPhoneSaving] = useState(false)
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

  useEffect(() => {
    if (!token && !marketId) return
    const controller = new AbortController()
    const query = token
      ? `token=${encodeURIComponent(token)}`
      : `marketId=${encodeURIComponent(String(marketId || ''))}&code=${encodeURIComponent(String(stallCode || ''))}`

    fetch(`/api/lapak?${query}&pin_status=1`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        setPinIsDefault(typeof result?.pin_is_default === 'boolean' ? result.pin_is_default : null)
        setMarketContact(String(result?.contact_phone || '').trim())
        setMarketContactName(String(result?.market_name || '').trim())
      })
      .catch(() => {})

    return () => controller.abort()
  }, [token, marketId, stallCode])

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('PIN harus 4 angka')
      return
    }
    setPinError('')
    setUnlockedPin(pinInput)
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage('')

    if (!/^\d{4}$/.test(resetPin)) {
      setResetMessage('PIN baru harus 4 angka')
      return
    }
    if (resetPin !== resetConfirm) {
      setResetMessage('Konfirmasi PIN tidak sama')
      return
    }
    if (resetPhone.replace(/\D/g, '').length < 8) {
      setResetMessage('Nomor HP tidak valid')
      return
    }

    setResetSaving(true)
    try {
      const response = await fetch('/api/lapak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_pin',
          token,
          marketId,
          code: stallCode,
          phone: resetPhone,
          new_pin: resetPin
        })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gagal mengganti PIN')

      setPinInput(resetPin)
      setUnlockedPin(resetPin)
      setPinIsDefault(false)
      setForgotOpen(false)
      setResetPhone('')
      setResetPin('')
      setResetConfirm('')
    } catch (err: any) {
      setResetMessage(err?.message || 'Gagal mengganti PIN')
    } finally {
      setResetSaving(false)
    }
  }

  const handleSaveOwnerPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setOwnerPhoneError('')

    const digits = ownerPhone.replace(/\D/g, '').replace(/^62/, '0')
    if (digits.length < 10) {
      setOwnerPhoneError('Nomor HP tidak valid')
      return
    }
    if (!unlockedPin) return

    setOwnerPhoneSaving(true)
    try {
      const response = await fetch('/api/lapak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_phone',
          token,
          marketId,
          code: stallCode,
          pin: unlockedPin,
          phone: ownerPhone
        })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan nomor HP')

      setData((previous) => (
        previous
          ? { ...previous, summary: { ...previous.summary, owner_has_phone: true } }
          : previous
      ))
      setOwnerPhone('')
    } catch (err: any) {
      setOwnerPhoneError(err?.message || 'Gagal menyimpan nomor HP')
    } finally {
      setOwnerPhoneSaving(false)
    }
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

  const contactDigits = marketContact.replace(/\D/g, '')
  const contactNumber = contactDigits.startsWith('0') ? `62${contactDigits.slice(1)}` : contactDigits

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
              <span>
                {pinIsDefault === true
                  ? 'PIN awal 7777. Segera ganti setelah berhasil masuk.'
                  : 'Masukkan PIN pemilik lapak Anda.'}
              </span>
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
            <button
              type="button"
              className="public-stall-pin-forgot"
              onClick={() => setForgotOpen((value) => !value)}
            >
              {forgotOpen ? 'Batal' : 'Lupa PIN?'}
            </button>
            {forgotOpen && (
              <form className="public-stall-pin-reset" onSubmit={handleResetPin}>
                <p className="public-stall-pin-forgot-note">
                  Masukkan nomor HP pemilik yang terdaftar di pasar, lalu buat PIN baru.
                </p>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Nomor HP pemilik"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                />
                <input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="PIN baru (4 angka)"
                  value={resetPin}
                  onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
                <input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Ulangi PIN baru"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
                <button type="submit" disabled={resetSaving}>
                  {resetSaving ? 'Memproses...' : 'Ganti PIN'}
                </button>
                <span className="public-stall-pin-forgot-note">
                  Jika nomor HP belum terdaftar, hubungi pengelola pasar.
                </span>
                {marketContact ? (
                  <div className="public-stall-pin-contact">
                    <span>Hubungi pengelola {marketContactName || 'pasar'}:</span>
                    <a href={`https://wa.me/${contactNumber}`} target="_blank" rel="noreferrer">WhatsApp</a>
                    <a href={`tel:+${contactNumber}`}>Telepon</a>
                    <span className="public-stall-pin-contact-number">{marketContact}</span>
                  </div>
                ) : (
                  <span className="public-stall-pin-forgot-note">
                    Nomor kontak pengelola belum diatur. Silakan hubungi petugas pasar.
                  </span>
                )}
                {resetMessage && <p className="public-stall-pin-error">{resetMessage}</p>}
              </form>
            )}
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

  const { market, stall, summary, bills } = data
  const sortedTransactions = [...stall.transactions].sort((a, b) => {
    const aTime = new Date(a.transaction_date || a.created_at).getTime()
    const bTime = new Date(b.transaction_date || b.created_at).getTime()
    return bTime - aTime
  })
  const formatRupiah = (value: number) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`
  const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('id-ID') : '-')
  const todayLabel = summary.today.status === 'SUDAH'
    ? 'Sudah ditarik'
    : summary.today.status === 'BELUM'
      ? 'Belum ditarik'
      : 'Tanpa tarif harian'
  const todayTone = summary.today.status === 'SUDAH' ? 'paid' : summary.today.status === 'BELUM' ? 'unpaid' : 'none'
  const billStatusLabel = (status: string) => (
    status === 'LUNAS' ? 'Lunas' : status === 'CICILAN' ? 'Cicilan' : status === 'DIBATALKAN' ? 'Dibatalkan' : 'Belum lunas'
  )
  const billStatusClass = (status: string) => (
    status === 'LUNAS' ? 'lunas' : status === 'CICILAN' ? 'cicilan' : 'belum'
  )

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

        <section className={`public-stall-today public-stall-today--${todayTone}`} aria-live="polite">
          <div>
            <span className="public-stall-today-label">Hari ini · {formatDate(summary.today.date)}</span>
            <strong className="public-stall-today-status">{todayLabel}</strong>
          </div>
          <div className="public-stall-today-meta">
            {summary.today.daily_items.length > 1 ? (
              <ul className="public-stall-today-list">
                {summary.today.daily_items.map((item) => (
                  <li key={`${item.name}-${item.amount}`}>
                    <span>{item.name}</span>
                    <strong>{formatRupiah(item.amount)}</strong>
                    <em className={item.paid ? 'is-paid' : 'is-unpaid'}>{item.paid ? 'lunas' : 'belum'}</em>
                  </li>
                ))}
              </ul>
            ) : summary.today.amount > 0 ? (
              <>
                Dibayar <strong>{formatRupiah(summary.today.amount)}</strong>
                {summary.today.paid_names.length > 0 ? ` · ${summary.today.paid_names.join(', ')}` : ''}
              </>
            ) : summary.today.daily_due > 0 ? (
              <>
                {summary.today.daily_names.length > 0 ? `${summary.today.daily_names.join(', ')} · ` : ''}
                Tarif <strong>{formatRupiah(summary.today.daily_due)}</strong>
              </>
            ) : (
              'Tidak ada tarif harian'
            )}
          </div>
        </section>

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

        <div className="public-stall-summary-row public-stall-summary-row--three">
          <div className="public-stall-summary-card">
            <span>Total dibayar</span>
            <strong>{formatRupiah(summary.total_paid)}</strong>
          </div>
          <div className="public-stall-summary-card">
            <span>Tunggakan</span>
            <strong>{summary.bills_count === 0 ? 'Belum ada' : formatRupiah(summary.bills_outstanding)}</strong>
          </div>
          <div className="public-stall-summary-card">
            <span>Terakhir bayar</span>
            <strong>{summary.last_paid_at ? formatDate(summary.last_paid_at) : '-'}</strong>
          </div>
        </div>

        <section className="public-stall-bills">
          <div className="public-stall-section-heading">
            <h2>Tagihan Tahunan (Jaspro)</h2>
            <span>{bills.length} tagihan</span>
          </div>
          {bills.length === 0 ? (
            <p className="public-stall-muted">Belum ada tagihan tahunan yang diterbitkan.</p>
          ) : (
            bills.map((bill) => (
              <article className="public-stall-bill" key={bill.bill_id}>
                <div className="public-stall-bill-head">
                  <span className="public-stall-bill-title">{bill.period_year} · {bill.type_name}</span>
                  <span className={`public-stall-bill-status ${billStatusClass(bill.status)}`}>{billStatusLabel(bill.status)}</span>
                </div>
                <div className="public-stall-bill-meta">
                  <div><span>Tagihan</span><strong>{formatRupiah(bill.amount_due)}</strong></div>
                  <div><span>Dibayar</span><strong>{formatRupiah(bill.amount_paid)}</strong></div>
                  <div><span>Sisa</span><strong>{formatRupiah(bill.outstanding)}</strong></div>
                </div>
                <p className="public-stall-muted">Jatuh tempo: {formatDate(bill.due_date)}</p>
                {bill.installments.length > 0 && (
                  <div className="public-stall-installments">
                    {bill.installments.map((installment, index) => (
                      <div className="public-stall-installment" key={`${bill.bill_id}-${index}`}>
                        <span>{formatDate(installment.date)} · {installment.payment_method || 'Pembayaran'}</span>
                        <strong>{formatRupiah(installment.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        <div className="public-stall-tabs" role="tablist" aria-label="Informasi lapak">
          <button type="button" className={activeTab === 'rates' ? 'active' : ''} onClick={() => setActiveTab('rates')} role="tab" aria-selected={activeTab === 'rates'}>
            Jenis Retribusi <span>{stall.rates.length}</span>
          </button>
          <button type="button" className={activeTab === 'transactions' ? 'active' : ''} onClick={() => setActiveTab('transactions')} role="tab" aria-selected={activeTab === 'transactions'}>
            Riwayat Transaksi{' '}
            <span>{summary.paid_count > 50 ? `50 dari ${summary.paid_count}` : summary.paid_count}</span>
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
                {sortedTransactions.map((transaction, index) => <div className="public-stall-list-row" key={`${transaction.created_at}-${index}`}><span>{new Date(transaction.transaction_date || transaction.created_at).toLocaleDateString('id-ID')}<small>{transaction.rate_name ? `${transaction.rate_name} · ` : ''}{transaction.payment_method || 'Pembayaran'}{transaction.period_year ? ` • ${transaction.period_year}` : ''}</small></span><strong>Rp {Number(transaction.amount).toLocaleString('id-ID')}</strong></div>)}
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
            <p className="public-stall-muted">
              {summary.pin_is_default
                ? 'PIN awal 7777. Segera ganti agar hanya Anda yang mengetahuinya.'
                : 'PIN sudah diganti. Simpan PIN Anda dengan aman.'}
            </p>
          )}
          {pinMessage && <p className="public-stall-pin-manage-message">{pinMessage}</p>}
        </section>

        <footer>Data resmi SiAga • {market.code || market.name}</footer>
      </div>

      {!data.summary.owner_has_phone && (
        <div className="public-stall-phone-overlay" role="dialog" aria-modal="true" aria-labelledby="owner-phone-title">
          <form className="public-stall-phone-card" onSubmit={handleSaveOwnerPhone}>
            <h2 id="owner-phone-title">Lengkapi Nomor HP Pemilik</h2>
            <p>Nomor HP wajib diisi. Nomor ini dipakai untuk memverifikasi Anda saat lupa PIN.</p>
            <input
              inputMode="tel"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={ownerPhoneSaving}>
              {ownerPhoneSaving ? 'Menyimpan...' : 'Simpan nomor HP'}
            </button>
            <span className="public-stall-muted">Administrator juga dapat mengisi nomor ini dari dashboard.</span>
            {ownerPhoneError && <p className="public-stall-pin-error">{ownerPhoneError}</p>}
          </form>
        </div>
      )}
    </main>
  )
}
