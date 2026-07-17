import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { getUserMarket } from '../lib/roleUtils'
import { OfficersPage } from './OfficersPage'
import { StallsPage } from './StallsPage'
import { SectorsPage } from './SectorsPage'
import { OwnersPage } from './OwnersPage'
import { CategoriesPage } from './CategoriesPage'
import { RetribusiPage } from './RetribusiPage'
import { TransactionsPage } from './TransactionsPage'
import { ReconciliationsPage } from './ReconciliationsPage'
import { MarketDetailPage } from './MarketDetailPage'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import {
  IconOverview,
  IconStalls,
  IconSectors,
  IconOwners,
  IconCategories,
  IconRetribusi,
  IconTransactions,
  IconReconciliations,
  IconOfficers
} from '../components/Icons'
import '../pages/MarketDashboard.css'
import { compressImageFile } from '../lib/imageUtils'
import { saveUserProfileToUsersTable } from '../lib/userProfile'

interface MarketStats {
  market: any
  stallCount: number
  officerCount: number
  transactionCount: number
  totalRevenue: number
}

interface Props {
  userId: string
  impersonating?: boolean
  onStopImpersonation?: () => void
  onLogout?: () => void
}

type PageType = 'overview' | 'officers' | 'stalls' | 'sectors' | 'owners' | 'categories' | 'retribusi' | 'transactions' | 'reconciliations' | 'marketDetail'

export function MarketDashboard({ userId, impersonating = false, onStopImpersonation, onLogout }: Props) {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<PageType>('overview')
  const [editingMarket, setEditingMarket] = useState(false)
  const [marketForm, setMarketForm] = useState<any>({ name: '', code: '', address: '', city: '', status: '' })
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('')
  const [profileRole, setProfileRole] = useState('Administrator')
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    loadMarketStats()
    loadUserProfile()
  }, [userId])

  useEffect(() => {
    if (stats?.market) {
      setMarketForm({
        name: stats.market.name || '',
        code: stats.market.code || '',
        address: stats.market.address || '',
        city: stats.market.city || '',
        status: stats.market.status || ''
      })
    }
  }, [stats])

  const loadUserProfile = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error

      const storedName = localStorage.getItem('siaga_profile_name') || ''
      const storedPhoto = localStorage.getItem('siaga_profile_photo_preview') || ''
      const storedRole = localStorage.getItem('siaga_profile_role') || ''

      const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
      const metadataAvatar = user?.user_metadata?.avatar_url || ''
      const metadataRole = user?.user_metadata?.role || ''

      const displayName = metadataName || storedName || user?.email?.split('@')[0] || 'User'
      const avatarUrl = metadataAvatar || storedPhoto || ''
      const role = metadataRole || storedRole || 'Administrator'

      setProfileName(displayName)
      setProfilePhotoUrl(avatarUrl)
      setProfileRole(role)

      if (storedName !== displayName) {
        localStorage.setItem('siaga_profile_name', displayName)
      }
      if (storedPhoto !== avatarUrl) {
        localStorage.setItem('siaga_profile_photo_preview', avatarUrl)
      }
      if (storedRole !== role) {
        localStorage.setItem('siaga_profile_role', role)
      }
    } catch (err) {
      console.error('Error loading user profile', err)
      const storedName = localStorage.getItem('siaga_profile_name') || ''
      const storedPhoto = localStorage.getItem('siaga_profile_photo_preview') || ''
      const storedRole = localStorage.getItem('siaga_profile_role') || ''
      if (storedName || storedPhoto || storedRole) {
        setProfileName(storedName || 'User')
        setProfilePhotoUrl(storedPhoto || '')
        setProfileRole(storedRole || 'Administrator')
      }
    }
  }

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'))
    reader.readAsDataURL(file)
  })

  const uploadProfilePhoto = async (file: File) => {
    try {
      const compressedFile = await compressImageFile(file, { maxWidth: 900, maxHeight: 900, quality: 0.8, maxBytes: 700 * 1024 })
      const fileExt = compressedFile.name.split('.').pop() || 'jpg'
      const filePath = `profile-photos/${userId}/${Date.now()}.${fileExt}`

      const supabaseClient = getSupabaseClient()
      const { error: uploadError } = await supabaseClient.storage.from('Data Siaga').upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: true
      })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabaseClient.storage.from('Data Siaga').getPublicUrl(filePath)
      return { url: publicUrlData.publicUrl, stored: true }
    } catch (err) {
      console.warn('Storage upload blocked, using inline avatar fallback', err)
      return { url: await readFileAsDataUrl(file), stored: false }
    }
  }

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true)
      setProfileError('')

      const nextName = profileName.trim()
      let avatarUrl = profilePhotoUrl

      if (profilePhotoFile) {
        const uploadResult = await uploadProfilePhoto(profilePhotoFile)
        avatarUrl = uploadResult.url
      }

      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: nextName,
          name: nextName,
          avatar_url: avatarUrl || ''
        }
      })

      if (error) {
        console.warn('Profile update failed, using local fallback', error)
      }

      try {
        await saveUserProfileToUsersTable(supabase, userId, {
          email: '',
          full_name: nextName || 'User',
          photo_url: avatarUrl || ''
        })
      } catch (dbError) {
        console.warn('Users table save failed from dashboard', dbError)
      }

      localStorage.setItem('siaga_profile_name', nextName || 'User')
      localStorage.setItem('siaga_profile_photo_preview', avatarUrl || '')
      localStorage.setItem('siaga_profile_role', profileRole || 'Administrator')

      setProfileName(nextName || 'User')
      setProfilePhotoUrl(avatarUrl || '')
      setProfilePhotoFile(null)
      setProfileOpen(false)
      await loadUserProfile()
    } catch (err: any) {
      setProfileError(err.message || 'Gagal menyimpan profil')
    } finally {
      setProfileSaving(false)
    }
  }

  const loadMarketStats = async () => {
    try {
      // Get user's market
      const market = await getUserMarket(userId)
      if (!market) {
        console.error('No market assigned')
        setLoading(false)
        return
      }

      // Count stalls in this market
      const supabaseClient = getSupabaseClient()
      const { count: stallCount } = await supabaseClient
        .from('stalls')
        .select('*', { count: 'exact' })
        .eq('market_id', market.id)

      // Count officers in this market
      const { count: officerCount } = await supabaseClient
        .from('officers')
        .select('*', { count: 'exact' })
        .eq('market_id', market.id)

      // Get transactions for stalls in this market
      const { data: stallsData } = await supabaseClient
        .from('stalls')
        .select('id')
        .eq('market_id', market.id)

      const stallIds = stallsData?.map(s => s.id) || []

      let transactionCount = 0
      let totalRevenue = 0

      if (stallIds.length > 0) {
        const { count, data: transactionData } = await supabaseClient
          .from('transactions')
          .select('amount_paid', { count: 'exact' })
          .in('stall_id', stallIds)

        transactionCount = count || 0
        totalRevenue = (transactionData || []).reduce(
          (sum, t: any) => sum + (parseFloat(t.amount_paid) || 0),
          0
        )
      }

      setStats({
        market,
        stallCount: stallCount || 0,
        officerCount: officerCount || 0,
        transactionCount,
        totalRevenue
      })
    } catch (err) {
      console.error('Error loading market stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Memuat data pasar...</div>
  }

  if (!stats) {
    return (
      <div className="error-message">
        <h2>❌ Tidak Ada Pasar</h2>
        <p>Anda belum di-assign ke pasar manapun.</p>
      </div>
    )
  }

  const { market, stallCount, officerCount, transactionCount, totalRevenue } = stats

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'stalls':
        return <StallsPage marketId={stats.market.id} />
      case 'officers':
        return <OfficersPage marketId={stats.market.id} />
      case 'sectors':
        return <SectorsPage marketId={stats.market.id} />
      case 'owners':
        return <OwnersPage marketId={stats.market.id} />
      case 'marketDetail':
        return <MarketDetailPage marketId={stats.market.id} onBack={() => setCurrentPage('overview')} onSaved={() => loadMarketStats()} />
      case 'categories':
        return <CategoriesPage marketId={stats.market.id} />
      case 'retribusi':
        return <RetribusiPage />
      case 'transactions':
        return <TransactionsPage marketId={stats.market.id} />
      case 'reconciliations':
        return <ReconciliationsPage marketId={stats.market.id} />
      default:
        const avgRevenuePerTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0
        const chartData = [
          { name: 'Sen', revenue: totalRevenue * 0.14, transactions: Math.round(transactionCount * 0.12) },
          { name: 'Sel', revenue: totalRevenue * 0.18, transactions: Math.round(transactionCount * 0.15) },
          { name: 'Rab', revenue: totalRevenue * 0.2, transactions: Math.round(transactionCount * 0.17) },
          { name: 'Kam', revenue: totalRevenue * 0.22, transactions: Math.round(transactionCount * 0.2) },
          { name: 'Jum', revenue: totalRevenue * 0.16, transactions: Math.round(transactionCount * 0.18) },
          { name: 'Sab', revenue: totalRevenue * 0.06, transactions: Math.round(transactionCount * 0.1) },
          { name: 'Min', revenue: totalRevenue * 0.04, transactions: Math.round(transactionCount * 0.08) }
        ]

        const topCards = [
          {
            label: 'Total Revenue',
            value: `Rp ${totalRevenue.toLocaleString('id-ID')}`,
            detail: 'Total pendapatan semua transaksi',
            color: '#fff3b0'
          },
          {
            label: 'Transaksi',
            value: transactionCount.toLocaleString('id-ID'),
            detail: 'Jumlah transaksi hari ini',
            color: '#fff0a2'
          },
          {
            label: 'Lapak',
            value: stallCount.toLocaleString('id-ID'),
            detail: 'Lapak aktif di pasar',
            color: '#fff6c1'
          }
        ]

        return (
          <>
            <div className="overview-top-row">
              {topCards.map((card) => (
                <div key={card.label} className="mini-card" style={{ background: card.color }}>
                  <div className="mini-card-title">{card.label}</div>
                  <div className="mini-card-value">{card.value}</div>
                  <div className="mini-card-note">{card.detail}</div>
                </div>
              ))}
            </div>

            <div className="overview-grid">
              <div className="chart-panel">
                <div className="chart-card-header">
                  <div>
                    <h4>Ringkasan Pasar</h4>
                    <p>Grafik kinerja dan aktivitas pasar hari ini.</p>
                  </div>
                </div>
                <div className="chart-display">
                  <div className="chart-legend">
                    <span className="legend-dot green" /> Pendapatan
                    <span className="legend-dot yellow" /> Transaksi
                  </div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(29, 61, 7, 0.12)" />
                        <XAxis dataKey="name" stroke="#3d5224" tickLine={false} axisLine={false} />
                        <YAxis stroke="#3d5224" tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value: number | string | Array<number | string>) => typeof value === 'number' ? value.toLocaleString('id-ID') : value} />
                        <Legend verticalAlign="top" height={36} />
                        <Line type="monotone" dataKey="revenue" stroke="#1f4e12" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="transactions" stroke="#f4c300" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="overview-summary-row">
                  <div>
                    <div className="summary-label">Pendapatan rata-rata</div>
                    <div className="summary-value">Rp {Number(avgRevenuePerTransaction.toFixed(0)).toLocaleString('id-ID')}</div>
                  </div>
                  <div>
                    <div className="summary-label">Lapak aktif</div>
                    <div className="summary-value">{stallCount}</div>
                  </div>
                  <div>
                    <div className="summary-label">Petugas terdaftar</div>
                    <div className="summary-value">{officerCount}</div>
                  </div>
                </div>
              </div>

              <div className="side-panel">
                <div className="side-card">
                    <div className="side-card-header">
                      <div>
                        <span>Info Pasar</span>
                        <strong>{market.name}</strong>
                      </div>
                      <div className="card-actions">
                        <button className="icon-action" title="Lihat detail" aria-label="Lihat detail pasar" onClick={() => setCurrentPage('marketDetail')}>
                          <span className="sidebar-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </span>
                        </button>
                        <button className="icon-action" title="Edit pasar" aria-label="Edit pasar" onClick={() => setEditingMarket(true)}>
                          <span className="sidebar-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 21l4-1 11-11a2.1 2.1 0 10-3-3L4 17l-1 4z" />
                              <path d="M14.5 6.5l3 3" />
                            </svg>
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="side-kpi">
                      {editingMarket ? (
                        <div className="market-edit-form">
                          <div className="form-group">
                            <label>Nama</label>
                            <input value={marketForm.name} onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label>Alamat</label>
                            <input value={marketForm.address} onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })} />
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Kota</label>
                              <input value={marketForm.city} onChange={(e) => setMarketForm({ ...marketForm, city: e.target.value })} />
                            </div>
                            <div className="form-group">
                              <label>Status</label>
                              <select value={marketForm.status} onChange={(e) => setMarketForm({ ...marketForm, status: e.target.value })}>
                                <option value="AKTIF">AKTIF</option>
                                <option value="NONAKTIF">NONAKTIF</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-actions">
                            <button className="btn-primary" onClick={async () => {
                              try {
                                const payload: any = {
                                  name: marketForm.name,
                                  address: marketForm.address,
                                  city: marketForm.city,
                                  status: marketForm.status
                                }
                                const supabase = getSupabaseClient()
      const { error } = await supabase.from('markets').update(payload).eq('id', market.id)
                                if (error) throw error
                                await loadMarketStats()
                                setEditingMarket(false)
                              } catch (err) {
                                console.error('Error updating market', err)
                              }
                            }}>Simpan</button>
                            <button className="btn-secondary" onClick={() => { setEditingMarket(false); setMarketForm({ name: market.name, code: market.code, address: market.address, city: market.city, status: market.status }) }}>Batal</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span>Alamat</span>
                            <strong>{market.address}, {market.city}</strong>
                          </div>
                          <div>
                            <span>Kode Pasar</span>
                            <strong>{market.code}</strong>
                          </div>
                          <div>
                            <span>Status Pasar</span>
                            <strong>{market.status}</strong>
                          </div>
                        </>
                      )}
                    </div>
                </div>
                <div className="side-card compact-card">
                  <div className="status-block">
                    <span>Ringkasan</span>
                    <strong>{stallCount.toLocaleString('id-ID')} Lapak</strong>
                  </div>
                  <p>Terdaftar {transactionCount.toLocaleString('id-ID')} transaksi dengan total pendapatan Rp {totalRevenue.toLocaleString('id-ID')}.</p>
                </div>
              </div>
            </div>
          </>
        )
    }
  }

  return (
    <div className="market-dashboard">
      {impersonating && (
        <div className="impersonation-banner">
          <span>🔐 Sedang impersonate sebagai Admin Pasar</span>
          {onStopImpersonation && (
            <button onClick={onStopImpersonation} className="btn-stop-impersonation">
              Kembali ke Superadmin
            </button>
          )}
        </div>
      )}

      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-nav">
            <div className="sidebar-group">
              <div className="sidebar-group-title">Overview</div>
              <button
                className={`sidebar-item ${currentPage === 'overview' ? 'active' : ''}`}
                onClick={() => setCurrentPage('overview')}
              >
                <span className="sidebar-icon"><IconOverview /></span>
                <span>Overview</span>
              </button>
            </div>
          <div className="sidebar-group">
            <div className="sidebar-group-title">Data Pasar</div>
            <button
              className={`sidebar-item ${currentPage === 'stalls' ? 'active' : ''}`}
              onClick={() => setCurrentPage('stalls')}
            >
              <span className="sidebar-icon"><IconStalls /></span>
              <span>Lapak</span>
            </button>
            <button
              className={`sidebar-item ${currentPage === 'sectors' ? 'active' : ''}`}
              onClick={() => setCurrentPage('sectors')}
            >
              <span className="sidebar-icon"><IconSectors /></span>
              <span>Sektor</span>
            </button>
            <button
              className={`sidebar-item ${currentPage === 'owners' ? 'active' : ''}`}
              onClick={() => setCurrentPage('owners')}
            >
              <span className="sidebar-icon"><IconOwners /></span>
              <span>Pemilik</span>
            </button>
          </div>
          <div className="sidebar-group">
            <div className="sidebar-group-title">Konfigurasi</div>
            <button
              className={`sidebar-item ${currentPage === 'categories' ? 'active' : ''}`}
              onClick={() => setCurrentPage('categories')}
            >
              <span className="sidebar-icon"><IconCategories /></span>
              <span>Kategori</span>
            </button>
            <button
              className={`sidebar-item ${currentPage === 'retribusi' ? 'active' : ''}`}
              onClick={() => setCurrentPage('retribusi')}
            >
              <span className="sidebar-icon"><IconRetribusi /></span>
              <span>Retribusi</span>
            </button>
          </div>
          <div className="sidebar-group">
            <div className="sidebar-group-title">Keuangan</div>
            <button
              className={`sidebar-item ${currentPage === 'transactions' ? 'active' : ''}`}
              onClick={() => setCurrentPage('transactions')}
            >
              <span className="sidebar-icon"><IconTransactions /></span>
              <span>Transaksi</span>
            </button>
            <button
              className={`sidebar-item ${currentPage === 'reconciliations' ? 'active' : ''}`}
              onClick={() => setCurrentPage('reconciliations')}
            >
              <span className="sidebar-icon"><IconReconciliations /></span>
              <span>Rekonsiliasi</span>
            </button>
          </div>
            <div className="sidebar-group">
              <div className="sidebar-group-title">Operasional</div>
              <button
                className={`sidebar-item ${currentPage === 'officers' ? 'active' : ''}`}
                onClick={() => setCurrentPage('officers')}
              >
                <span className="sidebar-icon"><IconOfficers /></span>
                <span>Petugas</span>
              </button>
            </div>
          </div>

          <div className="sidebar-footer">
            <button className="sidebar-profile" type="button" onClick={() => setProfileOpen((open) => !open)}>
              <div className="sidebar-profile-avatar">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="avatar" className="sidebar-profile-photo" />
                ) : (
                  <span>{profileName.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase() || 'U'}</span>
                )}
              </div>
              <div>
                <div className="sidebar-profile-name">{profileName || 'Admin Pasar'}</div>
                <div className="sidebar-profile-role">{profileRole}</div>
              </div>
            </button>

            {profileOpen && (
              <div className="sidebar-profile-modal-backdrop" onClick={() => { setProfileOpen(false); setProfilePhotoFile(null); setProfileError('') }}>
                <div className="sidebar-profile-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="sidebar-profile-modal-header">
                    <h4>Profil Pengguna</h4>
                    <button className="sidebar-profile-close" type="button" onClick={() => { setProfileOpen(false); setProfilePhotoFile(null); setProfileError('') }}>×</button>
                  </div>
                  <label className="sidebar-profile-label">Nama</label>
                  <input
                    className="sidebar-profile-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Masukkan nama"
                  />
                  <label className="sidebar-profile-label">Foto Profil</label>
                  <input
                    className="sidebar-profile-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                  />
                  {profileError && <div className="sidebar-profile-error">{profileError}</div>}
                  <div className="sidebar-profile-actions">
                    <button className="btn-primary" type="button" onClick={handleSaveProfile} disabled={profileSaving}>
                      {profileSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => { setProfileOpen(false); setProfilePhotoFile(null); setProfileError('') }}>
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button className="sidebar-item sidebar-logout" type="button" onClick={() => onLogout?.()}>
              <span className="sidebar-icon sidebar-logout-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </span>
              <span>Logout</span>
            </button>
            <div className="sidebar-copyright">Siaga oleh Spektrumedia</div>
          </div>
        </aside>

        <main className="page-panel">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  )
}
