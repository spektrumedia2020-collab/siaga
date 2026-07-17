import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { getUserRole, getImpersonateSession, clearImpersonateSession, UserRole } from './lib/roleUtils'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { SuperAdminDashboard } from './pages/SuperAdminDashboard'
import { MarketDashboard } from './pages/MarketDashboard'
import './App.css'

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

  useEffect(() => {
    checkConnection()
    checkSession()

    // Listen to auth state changes so UI updates when user logs in/out
    const { data } = supabase.auth.onAuthStateChange(() => {
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
    try {
      const { error } = await supabase.from('roles').select('*').limit(1)
      if (error) {
        setStatus('✗ Database belum di-setup')
      } else {
        setStatus('✓ Terhubung ke Supabase - Database siap!')
      }
    } catch (error) {
      setStatus('✗ Error koneksi')
    }
  }

  const checkSession = async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const impersonationSession = getImpersonateSession()
      setImpersonation(impersonationSession)

      if (data.session?.user) {
        setUser(data.session.user)

        if (impersonationSession) {
          setUserRole(impersonationSession.targetRole)
        } else {
          const role = await getUserRole(data.session.user.id)
          setUserRole(role)
        }
      } else {
        // no active session
        setUser(null)
        setUserRole(null)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
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

  const activeRoleName = impersonation?.targetRole.role_name || userRole?.role_name
  const activeUserId = impersonation?.targetUserId || user?.id

  if (activeRoleName === 'ADMIN') {
    return (
      <div className="app">
        <Dashboard 
          user={user} 
          onLogout={handleLogout}
          isDashboardHeader={true}
          impersonation={impersonation}
          onStopImpersonation={handleStopImpersonation}
        >
          <SuperAdminDashboard />
        </Dashboard>
      </div>
    )
  }

  if (activeRoleName === 'MARKET_HEAD' && activeUserId) {
    return (
      <div className="app">
        <Dashboard 
          user={user} 
          onLogout={handleLogout}
          isDashboardHeader={true}
          impersonation={impersonation}
          onStopImpersonation={handleStopImpersonation}
        >
          <MarketDashboard 
            userId={activeUserId} 
            impersonating={!!impersonation}
            onStopImpersonation={handleStopImpersonation}
          />
        </Dashboard>
      </div>
    )
  }

  return (
    <div className="app">
      <Dashboard user={user} onLogout={handleLogout} impersonation={impersonation} onStopImpersonation={handleStopImpersonation} />
    </div>
  )
}

export default App
