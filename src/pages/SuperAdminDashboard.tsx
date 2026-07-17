import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { setImpersonateSession, getUserRoles } from '../lib/roleUtils'
import { UserManagement } from './UserManagement'
import '../pages/SuperAdminDashboard.css'

interface MarketStats {
  id: number
  name: string
  code: string
  city: string
  address?: string
  stallCount: number
  transactionCount: number
  totalRevenue: number
  status: string
}

interface MarketHeadUser {
  id: string
  email: string
  marketName?: string
  roleName?: string
  roleRowId?: number
}

interface RoleOption {
  id: number
  name: string
}

const DEFAULT_MARKETS = [
  { code: '2-005-01', name: 'Makassar Mall', city: 'Makassar', address: 'Jl. H. Oemar Said Cokroaminoto No.25, Pattunuang, Kec. Wajo, Kota Makassar, Sulawesi Selatan 90174 Makassar Mall', status: 'AKTIF' },
  { code: '2-005-02', name: 'Terong', city: 'Makassar', address: 'Jl. Pasar Terong, Wajo Baru, Kec. Bontoala, Kota Makassar, Sulawesi Selatan 90151 Terong Traditional Market', status: 'AKTIF' },
  { code: '2-005-03', name: 'Butung', city: 'Makassar', address: 'Jl. Butung, Kec. Wajo, Kota Makassar, Sulawesi Selatan Jl. Pasar Butung', status: 'AKTIF' },
  { code: '2-005-04', name: 'Kampung Baru', city: 'Makassar', address: 'Jl. Pattimura No.20, Bulo Gading, Kec. Ujung Pandang, Kota Makassar Pasar Kampung Baru Makassar', status: 'AKTIF' },
  { code: '2-005-05', name: 'Pannampu', city: 'Makassar', address: 'Pannampu, Kec. Tallo, Kota Makassar, Sulawesi Selatan 90215 Pannampu Traditional Market', status: 'AKTIF' },
  { code: '2-005-06', name: 'Kalimbu', city: 'Makassar', address: 'Jl. Veteran Utara No.113, Wajo Baru, Kec. Bontoala, Kota Makassar Pasar Kalimbu', status: 'AKTIF' },
  { code: '2-005-07', name: 'Kerung-Kerung', city: 'Makassar', address: 'Jl. Kerung-Kerung, Maccini Gusung, Kec. Makassar, Kota Makassar Pasar Kerung-kerung', status: 'AKTIF' },
  { code: '2-005-08', name: 'Sambung Jawa', city: 'Makassar', address: 'Tamarunang, Kec. Mariso, Kota Makassar, Sulawesi Selatan Pasar Sambung Jawa', status: 'AKTIF' },
  { code: '2-005-09', name: 'Cenderawasih', city: 'Makassar', address: 'Jl. Tanjung Bunga, Sambung Jawa, Kec. Mamajang, Kota Makassar Pasar Pamos Cendrawasih Kec. Mamajang', status: 'AKTIF' },
  { code: '2-005-10', name: 'Maricaya', city: 'Makassar', address: 'Jl. Harimau No.36, Maricaya, Kec. Makassar, Kota Makassar Pasar', status: 'AKTIF' },
  { code: '2-005-11', name: 'Sawah', city: 'Makassar', address: 'Lajangiru, Kec. Ujung Pandang, Kota Makassar, Sulawesi Selatan Pasar Sawah', status: 'AKTIF' },
  { code: '2-005-12', name: 'Mamajang', city: 'Makassar', address: 'Jl. Onta Baru No.84, Mandala, Kec. Mamajang, Kota Makassar Pasar Mamajang', status: 'AKTIF' },
  { code: '2-005-13', name: 'Pabbaeng-baeng Barat', city: 'Makassar', address: 'Jl. Sultan Alauddin No.10, Pa\'baeng-Baeng, Kec. Tamalate, Kota Makassar (area barat) Pasar Pabaeng-Baeng', status: 'AKTIF' },
  { code: '2-005-14', name: 'Pabbaeng-baeng Timur', city: 'Makassar', address: 'Jl. Sultan Alauddin No.10, Pa\'baeng-Baeng, Kec. Tamalate, Kota Makassar (area timur) Pasar Pabaeng-Baeng', status: 'AKTIF' },
  { code: '2-005-15', name: 'Parang Tambung', city: 'Makassar', address: 'Kel. Parang Tambung, Kec. Tamalate, Kota Makassar 90224 PASAR PARANGTAMBUNG', status: 'AKTIF' },
  { code: '2-005-16', name: 'Panakkukang', city: 'Makassar', address: 'Paropo, Kec. Panakkukang, Kota Makassar 90231 Pasar Panakkukang', status: 'AKTIF' },
  { code: '2-005-17', name: 'Niaga Daya', city: 'Makassar', address: 'Belum ditemukan data lokasi yang dapat dipastikan sebagai pasar yang dikelola Perumda Pasar Makassar Raya.', status: 'AKTIF' },
  { code: '2-005-18', name: 'Mandai', city: 'Makassar', address: 'Jl. Perintis Kemerdekaan Km.19, Sudiang, Kec. Biringkanaya, Kota Makassar 90245 PASAR MANDAI', status: 'AKTIF' }
]

export function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview')
  const [markets, setMarkets] = useState<MarketStats[]>([])
  const [marketHeads, setMarketHeads] = useState<MarketHeadUser[]>([])
  const [marketAdminMap, setMarketAdminMap] = useState<Record<number, MarketHeadUser[]>>({})
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showImpersonate, setShowImpersonate] = useState(false)
  const [impersonateError, setImpersonateError] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [showMarketForm, setShowMarketForm] = useState(false)
  const [editingMarketId, setEditingMarketId] = useState<number | null>(null)
  const [marketForm, setMarketForm] = useState({
    name: '',
    code: '',
    city: '',
    address: '',
    status: 'AKTIF'
  })
  const [assignForm, setAssignForm] = useState({
    userId: '',
    marketId: '',
    roleId: ''
  })
  const [totalStats, setTotalStats] = useState({
    marketCount: 0,
    stallCount: 0,
    transactionCount: 0,
    totalRevenue: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setFormError('')
      setFormSuccess('')
      const supabase = getSupabaseClient()

      let marketsData: any[] = []
      const { data: fetchedMarketsData, error: marketsError } = await supabase
        .from('markets')
        .select('id, name, code, city, address, status')
        .order('name')

      if (marketsError) throw marketsError
      marketsData = fetchedMarketsData || []

      if (marketsData.length === 0) {
        try {
          const missingMarkets = DEFAULT_MARKETS.filter((market) => !marketsData.some((existing) => (existing.code || '').toString().trim().toLowerCase() === market.code.toLowerCase()))
          if (missingMarkets.length > 0) {
            const { error: seedError } = await supabase.from('markets').insert(missingMarkets)
            if (seedError) throw seedError
          }

          const { data: reloadedMarketsData, error: reloadError } = await supabase
            .from('markets')
            .select('id, name, code, city, address, status')
            .order('name')

          if (reloadError) throw reloadError
          marketsData = reloadedMarketsData || []
        } catch (seedErr) {
          console.warn('Failed to seed default markets', seedErr)
        }
      }

      const marketStats = await Promise.all(
        (marketsData || []).map(async (market: any) => {
          const { count: stallCount } = await supabase
            .from('stalls')
            .select('*', { count: 'exact' })
            .eq('market_id', market.id)

          const { data: stallRows } = await supabase
            .from('stalls')
            .select('id')
            .eq('market_id', market.id)

          const stallIds = (stallRows || []).map((s: any) => s.id)

          let transactionCount = 0
          let totalRevenue = 0

          if (stallIds.length > 0) {
            const { count, error: txCountError } = await supabase
              .from('transactions')
              .select('*', { count: 'exact' })
              .in('stall_id', stallIds)

            if (txCountError) throw txCountError

            const { data: revenueData, error: revenueError } = await supabase
              .from('transactions')
              .select('amount_paid')
              .in('stall_id', stallIds)

            if (revenueError) throw revenueError

            transactionCount = count || 0
            totalRevenue = (revenueData || []).reduce(
              (sum, t: any) => sum + (parseFloat(t.amount_paid) || 0),
              0
            )
          }

          return {
            ...market,
            stallCount: stallCount || 0,
            transactionCount,
            totalRevenue
          }
        })
      )

      setMarkets(marketStats)

      const totals = {
        marketCount: marketStats.length,
        stallCount: marketStats.reduce((sum, m) => sum + m.stallCount, 0),
        transactionCount: marketStats.reduce((sum, m) => sum + m.transactionCount, 0),
        totalRevenue: marketStats.reduce((sum, m) => sum + m.totalRevenue, 0)
      }

      setTotalStats(totals)

      const { data: roleRows, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .order('name')

      if (rolesError) throw rolesError
      setRoles(roleRows || [])

      try {
        const currentUser = (await supabase.auth.getUser()).data?.user
        const fallbackUsers: any[] = []

        if (currentUser?.id) {
          fallbackUsers.push({
            id: currentUser.id,
            email: currentUser.email || null,
            display_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || null,
            created_at: currentUser.created_at || ''
          })
        }

        const { data: roleRowsData, error: roleRowsError } = await supabase
          .from('user_roles')
          .select('user_id')

        if (!roleRowsError) {
          const existingUserIds = [...new Set((roleRowsData || []).map((row: any) => row.user_id).filter(Boolean))]
          existingUserIds.forEach((userId: string) => {
            if (!fallbackUsers.some((user) => user.id === userId)) {
              fallbackUsers.push({ id: userId, email: null, display_name: null, created_at: '' })
            }
          })
        }

        setUsers(fallbackUsers)
      } catch (authUsersErr) {
        console.warn('User list fallback unavailable', authUsersErr)
        setUsers([])
      }

      const defaultRoleId = (roleRows || []).find((role: any) => ['MARKET_HEAD', 'ADMIN_PASAR', 'PASAR_ADMIN', 'MARKET_ADMIN'].includes(role.name))?.id
      if (defaultRoleId && !assignForm.roleId) {
        setAssignForm((prev) => ({ ...prev, roleId: String(defaultRoleId) }))
      }

      const { data: marketHeadRows, error: mhError } = await supabase
        .from('user_roles')
        .select('id, user_id, role_id, market_id')
        .order('user_id')

      if (mhError) throw mhError

      const roleIds = [...new Set((marketHeadRows || []).map((row: any) => row.role_id).filter(Boolean))]
      const roleNameMap = new Map<number, string>()

      if (roleIds.length > 0) {
        const { data: roleRowsData, error: roleRowsError } = await supabase
          .from('roles')
          .select('id, name')
          .in('id', roleIds)

        if (!roleRowsError) {
          roleRowsData?.forEach((role: any) => {
            roleNameMap.set(role.id, role.name)
          })
        }
      }

      const adminRows = (marketHeadRows || []).filter((row: any) => {
        const roleName = (roleNameMap.get(row.role_id) || '').toUpperCase()
        const hasMarket = row.market_id != null && row.market_id !== ''
        return hasMarket && ['MARKET_HEAD', 'ADMIN_PASAR', 'PASAR_ADMIN', 'MARKET_ADMIN', 'ADMIN'].includes(roleName)
      })

      const normalizedMarketHeads = adminRows.map((row: any) => ({
        id: row.user_id,
        email: row.user_id,
        marketName: `Pasar #${row.market_id}`,
        roleName: roleNameMap.get(row.role_id) || 'MARKET_HEAD',
        roleRowId: row.id
      }))

      setMarketHeads(normalizedMarketHeads)

      const mappedAdmins: Record<number, MarketHeadUser[]> = {}
      normalizedMarketHeads.forEach((admin) => {
        if (!admin.roleRowId) return
        const assignedMarketId = (marketHeadRows || []).find((row: any) => row.id === admin.roleRowId)?.market_id
        if (assignedMarketId && Number.isFinite(Number(assignedMarketId))) {
          const normalizedMarketId = Number(assignedMarketId)
          if (!mappedAdmins[normalizedMarketId]) {
            mappedAdmins[normalizedMarketId] = []
          }
          mappedAdmins[normalizedMarketId].push(admin)
        }
      })

      const marketIdSet = new Set((marketsData || []).map((market: any) => Number(market.id)))
      marketIdSet.forEach((marketId) => {
        if (!mappedAdmins[marketId]) {
          mappedAdmins[marketId] = []
        }
      })
      setMarketAdminMap(mappedAdmins)
    } catch (err) {
      console.error('Error loading stats:', err)
      setFormError('Gagal memuat data pasar dan admin')
    } finally {
      setLoading(false)
    }
  }

  const resetMarketForm = () => {
    setMarketForm({ name: '', code: '', city: '', address: '', status: 'AKTIF' })
    setEditingMarketId(null)
    setShowMarketForm(false)
  }

  const handleSaveMarket = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!marketForm.name.trim() || !marketForm.code.trim() || !marketForm.city.trim()) {
      setFormError('Nama pasar, kode, dan kota wajib diisi')
      return
    }

    try {
      const supabase = getSupabaseClient()
      const payload = {
        name: marketForm.name.trim(),
        code: marketForm.code.trim(),
        city: marketForm.city.trim(),
        address: marketForm.address.trim() || null,
        status: marketForm.status
      }

      if (editingMarketId) {
        const { error } = await supabase.from('markets').update(payload).eq('id', editingMarketId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('markets').insert([payload])
        if (error) throw error
      }

      setFormSuccess(editingMarketId ? 'Pasar berhasil diperbarui' : 'Pasar berhasil ditambahkan')
      resetMarketForm()
      await loadStats()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan pasar')
    }
  }

  const handleEditMarket = (market: MarketStats) => {
    setEditingMarketId(market.id)
    setMarketForm({
      name: market.name,
      code: market.code,
      city: market.city,
      address: market.address || '',
      status: market.status
    })
    setShowMarketForm(true)
  }

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!assignForm.userId.trim() || !assignForm.marketId || !assignForm.roleId) {
      setFormError('User ID, pasar, dan role wajib dipilih')
      return
    }

    try {
      const supabase = getSupabaseClient()
      const roleId = Number(assignForm.roleId)
      const marketId = Number(assignForm.marketId)

      const { data: existingRows, error: checkError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', assignForm.userId.trim())
        .eq('role_id', roleId)
        .eq('market_id', marketId)

      if (checkError) throw checkError

      if ((existingRows || []).length > 0) {
        setFormSuccess('User sudah ditetapkan sebagai admin untuk pasar ini')
        await loadStats()
        return
      }

      const { data: insertedRows, error } = await supabase
        .from('user_roles')
        .insert([{ user_id: assignForm.userId.trim(), role_id: roleId, market_id: marketId }])
        .select('id, user_id, role_id, market_id')

      if (error) throw error

      const insertedRow = (insertedRows || [])[0]
      if (insertedRow) {
        setMarketHeads((prev) => [
          ...prev,
          {
            id: insertedRow.user_id,
            email: insertedRow.user_id,
            marketName: `Pasar #${insertedRow.market_id}`,
            roleName: roles.find((role) => role.id === roleId)?.name || 'MARKET_HEAD',
            roleRowId: insertedRow.id
          }
        ])
        setMarketAdminMap((prev) => ({
          ...prev,
          [marketId]: [
            ...(prev[marketId] || []),
            {
              id: insertedRow.user_id,
              email: insertedRow.user_id,
              marketName: `Pasar #${insertedRow.market_id}`,
              roleName: roles.find((role) => role.id === roleId)?.name || 'MARKET_HEAD',
              roleRowId: insertedRow.id
            }
          ]
        }))
      }

      setFormSuccess('Admin pasar berhasil ditetapkan')
      setAssignForm({ userId: '', marketId: '', roleId: assignForm.roleId })
      await loadStats()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menetapkan admin pasar')
    }
  }

  const handleRemoveMarketAdmin = async (roleRowId?: number) => {
    if (!roleRowId) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('user_roles').delete().eq('id', roleRowId)
      if (error) throw error
      setFormSuccess('Penetapan admin pasar berhasil dihapus')
      await loadStats()
    } catch (err: any) {
      setFormError(err.message || 'Gagal menghapus penetapan admin')
    }
  }

  const handleSelectMarketForAssignment = (marketId: number) => {
    setAssignForm((prev) => ({
      ...prev,
      marketId: String(marketId),
      roleId: prev.roleId || (roles.find((role) => ['MARKET_HEAD', 'ADMIN_PASAR', 'PASAR_ADMIN', 'MARKET_ADMIN'].includes(role.name))?.id?.toString() || '')
    }))
  }

  const handleImpersonate = async (userId: string) => {
    try {
      setImpersonateError('')
      const roles = await getUserRoles(userId)

      if (roles.length === 0) {
        setImpersonateError('User tidak memiliki role')
        return
      }

      const targetRole = roles.find((r) => r.role_name === 'MARKET_HEAD') || roles[0]
      const supabase = getSupabaseClient()
      const currentUser = (await supabase.auth.getSession()).data.session?.user

      if (currentUser) {
        setImpersonateSession(currentUser.id, userId, targetRole)
        window.location.reload()
      }
    } catch (err: any) {
      setImpersonateError(err.message || 'Error impersonating user')
    }
  }

  if (loading) {
    return <div className="loading">Memuat data...</div>
  }

  return (
    <div className="superadmin-dashboard">
      <div className="dashboard-header-content">
        <h2>📊 Dashboard Superadmin</h2>
        <p>Overview Sistem SiAga</p>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Manajemen User
        </button>
        <button
          className="tab-button impersonate-btn"
          onClick={() => setShowImpersonate(!showImpersonate)}
          title="Impersonate sebagai Admin Pasar"
        >
          🔀 Impersonate
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📍</div>
              <div className="stat-content">
                <div className="stat-label">Total Pasar</div>
                <div className="stat-value">{totalStats.marketCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏪</div>
              <div className="stat-content">
                <div className="stat-label">Total Lapak</div>
                <div className="stat-value">{totalStats.stallCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-label">Total Transaksi</div>
                <div className="stat-value">{totalStats.transactionCount}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💵</div>
              <div className="stat-content">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value">Rp {totalStats.totalRevenue.toLocaleString('id-ID')}</div>
              </div>
            </div>
          </div>

          <div className="section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h3>🏬 Kelola Pasar & Admin</h3>
              <button onClick={() => { setShowMarketForm(true); setEditingMarketId(null); setMarketForm({ name: '', code: '', city: '', address: '', status: 'AKTIF' }) }} className="btn-primary">
                + Tambah Pasar
              </button>
            </div>

            {formError && <div className="error-message" style={{ marginTop: 12 }}>{formError}</div>}
            {formSuccess && <div style={{ marginTop: 12, color: '#047857', fontWeight: 600 }}>{formSuccess}</div>}

            {showMarketForm && (
              <div className="form-section" style={{ marginTop: 16 }}>
                <h4>{editingMarketId ? 'Edit Pasar' : 'Tambah Pasar Baru'}</h4>
                <form onSubmit={handleSaveMarket} style={{ display: 'grid', gap: 12 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nama Pasar</label>
                      <input value={marketForm.name} onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Kode Pasar</label>
                      <input value={marketForm.code} onChange={(e) => setMarketForm({ ...marketForm, code: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Kota</label>
                      <input value={marketForm.city} onChange={(e) => setMarketForm({ ...marketForm, city: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={marketForm.status} onChange={(e) => setMarketForm({ ...marketForm, status: e.target.value })}>
                        <option value="AKTIF">AKTIF</option>
                        <option value="NONAKTIF">NONAKTIF</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Alamat</label>
                    <input value={marketForm.address} onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })} placeholder="Alamat pasar" />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">{editingMarketId ? 'Simpan Perubahan' : 'Tambah Pasar'}</button>
                    <button type="button" onClick={resetMarketForm} className="btn-secondary">Batal</button>
                  </div>
                </form>
              </div>
            )}

            <div className="table-wrapper" style={{ marginTop: 16 }}>
              <table className="markets-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Pasar</th>
                    <th>Kota</th>
                    <th>Lapak</th>
                    <th>Transaksi</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th>Admin Pasar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((market) => (
                    <tr key={market.id}>
                      <td>{market.code}</td>
                      <td>{market.name}</td>
                      <td>{market.city}</td>
                      <td>{market.stallCount}</td>
                      <td>{market.transactionCount}</td>
                      <td>Rp {market.totalRevenue.toLocaleString('id-ID')}</td>
                      <td>
                        <span className={`status-badge status-${market.status.toLowerCase()}`}>
                          {market.status}
                        </span>
                      </td>
                      <td>
                        {marketAdminMap[market.id]?.length ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                            <strong>{marketAdminMap[market.id][0].email}</strong>
                            <span style={{ color: '#6b7280', fontSize: 12 }}>{marketAdminMap[market.id][0].roleName}</span>
                          </div>
                        ) : (
                          <button type="button" className="btn-primary" onClick={() => handleSelectMarketForAssignment(market.id)}>
                            Tetapkan Admin
                          </button>
                        )}
                      </td>
                      <td>
                        <button type="button" className="btn-secondary" onClick={() => handleEditMarket(market)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section">
            <h3>🔐 Tetapkan Admin Pasar</h3>
            <form onSubmit={handleAssignAdmin} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>User</label>
                  <select value={assignForm.userId} onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })} required>
                    <option value="">-- Pilih User --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.display_name || user.email || user.id}
                        {user.email ? ` (${user.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Pasar</label>
                  <select value={assignForm.marketId} onChange={(e) => setAssignForm({ ...assignForm, marketId: e.target.value })} required>
                    <option value="">-- Pilih Pasar --</option>
                    {markets.map((market) => (
                      <option key={market.id} value={market.id}>{market.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={assignForm.roleId} onChange={(e) => setAssignForm({ ...assignForm, roleId: e.target.value })} required>
                  <option value="">-- Pilih Role --</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>Tetapkan Admin</button>
            </form>
          </div>

          <div className="section">
            <h3>👤 Admin Pasar Saat Ini</h3>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {marketHeads.length === 0 ? (
                <p>Tidak ada admin pasar yang ditetapkan.</p>
              ) : (
                marketHeads.map((user) => (
                  <div key={`${user.id}-${user.roleRowId}`} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{user.email}</strong>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{user.roleName} • {user.marketName}</div>
                    </div>
                    <button type="button" className="btn-delete-user" onClick={() => handleRemoveMarketAdmin(user.roleRowId)}>
                      Hapus
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && <UserManagement />}

      {showImpersonate && (
        <div className="impersonate-panel">
          <div className="impersonate-header">
            <h3>🔀 Impersonate Admin Pasar</h3>
            <button onClick={() => setShowImpersonate(false)} className="close-btn">✕</button>
          </div>

          {impersonateError && (
            <div className="error-message">{impersonateError}</div>
          )}

          <div className="market-heads-list">
            {marketHeads.length === 0 ? (
              <p>Tidak ada Admin Pasar</p>
            ) : (
              marketHeads.map((user) => (
                <div key={user.id} className="market-head-card">
                  <div>
                    <h4>{user.email}</h4>
                    <p className="market-assignment">{user.marketName}</p>
                  </div>
                  <button
                    onClick={() => handleImpersonate(user.id)}
                    className="btn-impersonate"
                  >
                    Login sebagai
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
