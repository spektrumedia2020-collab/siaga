import { useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from './lib/supabase'
import { getUserRole, getImpersonateSession, clearImpersonateSession, UserRole } from './lib/roleUtils'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { SuperAdminDashboard } from './pages/SuperAdminDashboard'
import { MarketDashboard } from './pages/MarketDashboard'
import { saveUserProfileToUsersTable } from './lib/userProfile'
import './App.css'

interface ProfileSetupState {
  open: boolean
  name: string
  email: string
  photoUrl: string
  saving: boolean
  error: string
}

interface ImpersonationSession {
  originalUserId: string
  targetUserId: string
  targetRole: UserRole
}

function App() {
  const [status, setStatus] = useState<string>('Checking connection...')
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [profileSetup, setProfileSetup] = useState<ProfileSetupState>({ open: false, name: '', email: '', photoUrl: '', saving: false, error: '' })
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)
  const [showProfileEditor, setShowProfileEditor] = useState(false)

  useEffect(() => {
    if (supabaseConfigError) {
      setError(supabaseConfigError)
      setStatus('✗ Supabase belum dikonfigurasi')
      setLoading(false)
      return
    }

    checkConnection()
    checkSession()

    // Listen to auth state changes so UI updates when user logs in/out
    const { data } = supabase!.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => {
      // unsubscribe if available
      try {
        // data may contain a subscription with unsubscribe()
        // @ts-ignore
        data?.subscription?.unsubscribe?.()
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const checkConnection = async () => {
    if (!supabase) {
      setError(supabaseConfigError || 'Supabase client belum siap')
      setStatus('✗ Supabase belum dikonfigurasi')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.from('roles').select('*').limit(1)
      if (error) {
        setStatus('✗ Database belum di-setup')
      } else {
        setStatus('✓ Terhubung ke Supabase - Database siap!')
      }
    } catch (error) {
      setStatus('✗ Error koneksi')
      setError(error instanceof Error ? error.message : 'Error koneksi ke Supabase')
    }
  }

  const checkSession = async () => {
    if (!supabase) {
      setError(supabaseConfigError || 'Supabase client belum siap')
      setLoading(false)
      return
    }

    try {
      const { data } = await supabase.auth.getSession()
      const impersonationSession = getImpersonateSession()
      setImpersonation(impersonationSession)

      console.debug('checkSession: supabase session:', data)
      console.debug('checkSession: impersonationSession:', impersonationSession)

      if (data.session?.user) {
        const currentUser = data.session.user
        setUser(currentUser)

        if (impersonationSession) {
          setUserRole(impersonationSession.targetRole)
        } else {
          const role = await getUserRole(currentUser.id)
          console.debug('getUserRole result for', currentUser.id, role)
          setUserRole(role)
        }

        const hasProfileData = Boolean(
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          currentUser.user_metadata?.avatar_url ||
          currentUser.email
        )

        setNeedsProfileSetup(!hasProfileData)
        if (!hasProfileData) {
          setProfileSetup({
            open: true,
            name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '',
            email: currentUser.email || '',
            photoUrl: currentUser.user_metadata?.avatar_url || '',
            saving: false,
            error: ''
          })
        } else {
          setProfileSetup((prev) => ({ ...prev, open: false, error: '' }))
        }
      } else {
        setUser(null)
        setUserRole(null)
        setNeedsProfileSetup(false)
        setProfileSetup({ open: false, name: '', email: '', photoUrl: '', saving: false, error: '' })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenProfileEditor = async () => {
    if (!user?.id) return

    try {
      const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ''
      const fallbackEmail = user.email || ''
      const fallbackPhotoUrl = user.user_metadata?.avatar_url || ''

      setProfileSetup({
        open: true,
        name: fallbackName,
        email: fallbackEmail,
        photoUrl: fallbackPhotoUrl,
        saving: false,
        error: ''
      })
      setNeedsProfileSetup(false)
      setShowProfileEditor(true)
    } catch (error: any) {
      console.error('Error loading profile data:', error)
      setProfileSetup((prev) => ({ ...prev, open: true, saving: false, error: error.message || 'Gagal memuat profil' }))
      setShowProfileEditor(true)
    }
  }

  const handleSaveProfileSetup = async () => {
    if (!user?.id) return

    try {
      setProfileSetup((prev) => ({ ...prev, saving: true, error: '' }))
      const name = profileSetup.name.trim()
      if (!name) {
        setProfileSetup((prev) => ({ ...prev, saving: false, error: 'Nama wajib diisi' }))
        return
      }

      const email = (profileSetup.email || user.email || '').trim().toLowerCase()
      const photoUrl = (profileSetup.photoUrl || '').trim()

      const { error: authError } = await supabase!.auth.updateUser({
        email,
        data: {
          full_name: name,
          name,
          avatar_url: photoUrl
        }
      })

      if (authError) {
        console.warn('Auth profile update failed, trying users table fallback', authError)
      }

      try {
        await saveUserProfileToUsersTable(supabase!, user.id, {
          email,
          full_name: name,
          photo_url: photoUrl
        })
      } catch (dbError) {
        console.warn('Users table save failed', dbError)
      }

      setProfileSetup({ open: false, name, email, photoUrl, saving: false, error: '' })
      setNeedsProfileSetup(false)
      setShowProfileEditor(false)
      await checkSession()
    } catch (error: any) {
      console.error('Error saving profile setup:', error)
      setProfileSetup((prev) => ({ ...prev, saving: false, error: error.message || 'Gagal menyimpan profil' }))
    }
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    clearImpersonateSession()
    setImpersonation(null)
  }

  const handleStopImpersonation = () => {
    clearImpersonateSession()
    setImpersonation(null)
    checkSession()
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <h1>SIAGA</h1>
          <p>{status}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth onLoginSuccess={() => checkSession()} />
  }

  if ((needsProfileSetup && profileSetup.open) || showProfileEditor) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
          <h2 style={{ marginBottom: 8 }}>Lengkapi Profil Anda</h2>
          <p style={{ marginBottom: 16, color: '#6b7280' }}>Sebelum masuk ke dashboard, silakan isi nama Anda terlebih dahulu.</p>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Nama Lengkap</label>
          <input
            value={profileSetup.name}
            onChange={(e) => setProfileSetup((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nama lengkap"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 12 }}
          />
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Email</label>
          <input
            value={profileSetup.email}
            placeholder="Email"
            type="email"
            readOnly
            disabled
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 12, backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
          />
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>URL Foto Profil (opsional)</label>
          <input
            value={profileSetup.photoUrl}
            onChange={(e) => setProfileSetup((prev) => ({ ...prev, photoUrl: e.target.value }))}
            placeholder="https://..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 12 }}
          />
          {profileSetup.error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{profileSetup.error}</div>}
          <button
            onClick={handleSaveProfileSetup}
            disabled={profileSetup.saving}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {profileSetup.saving ? 'Menyimpan...' : 'Simpan dan Lanjut'}
          </button>
        </div>
      </div>
    )
  }

  const activeRoleName = impersonation?.targetRole.role_name || userRole?.role_name
  const activeUserId = impersonation?.targetUserId || user?.id

  if (activeRoleName === 'ADMIN') {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0' }}>
          <button onClick={() => handleOpenProfileEditor()} className="btn-primary" style={{ borderRadius: 999, padding: '8px 14px' }}>
            Edit Profil
          </button>
        </div>
        <Dashboard
          user={user}
          onLogout={handleLogout}
          impersonation={impersonation}
          onStopImpersonation={handleStopImpersonation}
          activeRoleName={activeRoleName}
        >
          <SuperAdminDashboard />
        </Dashboard>
      </div>
    )
  }

  const marketAdminRoles = ['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN']
  if (activeRoleName && marketAdminRoles.includes(activeRoleName) && activeUserId) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0' }}>
          <button onClick={() => handleOpenProfileEditor()} className="btn-primary" style={{ borderRadius: 999, padding: '8px 14px' }}>
            Edit Profil
          </button>
        </div>
        <Dashboard
          user={user}
          onLogout={handleLogout}
          impersonation={impersonation}
          onStopImpersonation={handleStopImpersonation}
          activeRoleName={activeRoleName}
          isDashboardHeader={true}
        >
          <MarketDashboard 
            userId={activeUserId} 
            impersonating={!!impersonation}
            onStopImpersonation={handleStopImpersonation}
            onLogout={handleLogout}
          />
        </Dashboard>
      </div>
    )
  }

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0' }}>
        <button onClick={() => handleOpenProfileEditor()} className="btn-primary" style={{ borderRadius: 999, padding: '8px 14px' }}>
          Edit Profil
        </button>
      </div>
      <Dashboard user={user} onLogout={handleLogout} impersonation={impersonation} onStopImpersonation={handleStopImpersonation} activeRoleName={activeRoleName} />
    </div>
  )
}

export default App
