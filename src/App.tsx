import { useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from './lib/supabase'
import { getUserRole, getImpersonateSession, clearImpersonateSession, UserRole } from './lib/roleUtils'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { SuperAdminDashboardImproved as SuperAdminDashboard } from './pages/SuperAdminDashboardImproved'
import { MarketDashboard } from './pages/MarketDashboard'
import { MarketsManagement } from './pages/MarketsManagement'
import { MarketEditPage } from './pages/MarketEditPage'
import { MarketLandingPage } from './pages/MarketLandingPage'
import { JuriDocumentationPage } from './pages/JuriDocumentationPage'
import { PublicStallPage } from './pages/PublicStallPage'
import './App.css'
import './styles/layout.css'

type Route = 'login' | 'superadmin' | 'market' | 'market-edit' | 'market-landing' | 'public-stall' | 'juri-docs'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeRoleName, setActiveRoleName] = useState<string | null>(null)
  const [impersonate, setImpersonate] = useState<{ originalUserId: string; targetUserId: string; targetRole: UserRole } | null>(null)
  const [editingMarketId, setEditingMarketId] = useState<number | null>(null)

  useEffect(() => {
    // Check URL hash for route
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || ''
      
      // Check for market-edit route
      if (hash.startsWith('superadmin/market-edit/')) {
        const id = parseInt(hash.split('/')[2])
        setEditingMarketId(isNaN(id) ? null : id)
      } else {
        setEditingMarketId(null)
      }
    }
    
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)

    // Check for impersonate session
    const impSession = getImpersonateSession()
    if (impSession) {
      setImpersonate(impSession)
      setActiveRoleName(impSession.targetRole.role_name)
    }

    // Get current user
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
        if (!user) {
          setLoading(false)
          return
        }

        getUserRole(user.id).then((role) => {
          setActiveRoleName(role?.role_name?.toUpperCase() || null)
          setLoading(false)
        })
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setUser(session?.user ?? null)
        
        // Redirect based on user role after auth state change
        if (session?.user) {
          const role = await getUserRole(session.user.id)
          const roleName = role?.role_name?.toUpperCase() || ''
          setActiveRoleName(roleName || null)
          
          if (roleName === 'ADMIN') {
            window.location.hash = 'superadmin/dashboard'
          } else if (['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN', 'TREASURER'].includes(roleName)) {
            window.location.hash = 'market/dashboard'
          }
        }
      })

      return () => {
        subscription.unsubscribe()
        window.removeEventListener('hashchange', handleHashChange)
      }
    }
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  useEffect(() => {
    const marketRoles = ['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN', 'TREASURER']
    if (
      user &&
      activeRoleName &&
      marketRoles.includes(activeRoleName) &&
      window.location.hash.slice(1).startsWith('superadmin')
    ) {
      window.location.hash = 'market/dashboard'
    }
  }, [user, activeRoleName])

  const handleLoginSuccess = async () => {
    const currentUser = await supabase?.auth.getUser()
    if (!currentUser?.data?.user?.id) return
    const role = await getUserRole(currentUser.data.user.id)
    const roleName = role?.role_name?.toUpperCase() || ''
    setActiveRoleName(roleName || null)

    if (roleName === 'ADMIN') {
      window.location.hash = 'superadmin/dashboard'
    } else if (['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN', 'TREASURER'].includes(roleName)) {
      window.location.hash = 'market/dashboard'
    } else {
      window.location.hash = 'login'
    }
  }

  const handleLogout = async () => {
    await supabase?.auth.signOut()
    clearImpersonateSession()
    window.location.hash = ''
    setImpersonate(null)
    setActiveRoleName(null)
  }

  const handleStopImpersonate = () => {
    clearImpersonateSession()
    setImpersonate(null)
    setActiveRoleName(null)
    window.location.hash = 'superadmin/dashboard'
  }

  const handleImpersonate = (targetUserId: string, targetRole: UserRole) => {
    setImpersonate({
      originalUserId: user?.id || '',
      targetUserId,
      targetRole
    })
    setActiveRoleName(targetRole.role_name)
    window.location.hash = 'market/dashboard'
  }

  if (supabaseConfigError) {
    return (
      <div className="loading-screen">
        <h1>⚠️ Error</h1>
        <p>{supabaseConfigError}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <h1>Memuat...</h1>
      </div>
    )
  }

  // URL Router - determines route based on hash
  const getCurrentRoute = (): Route => {
    // Public routes - no auth required, use pathname /@slug
    if (window.location.pathname.startsWith('/@')) {
      return 'market-landing'
    }

    if (/^\/lapak\/\d+\/[^/]+\/?$/.test(window.location.pathname)) {
      return 'public-stall'
    }

    // Public documentation route for judges (no auth required)
    if (window.location.pathname === '/juri' || window.location.pathname === '/docs') {
      return 'juri-docs'
    }
    
    if (!user) return 'login'
    const hash = window.location.hash.slice(1)
    const marketRoles = ['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN', 'TREASURER']

    if (activeRoleName && marketRoles.includes(activeRoleName)) {
      return 'market'
    }
    
    if (hash.startsWith('superadmin/market-edit/')) {
      return 'market-edit'
    }
    if (hash.startsWith('superadmin') || hash.startsWith('admin')) {
      return 'superadmin'
    }
    if (hash.startsWith('market')) {
      return 'market'
    }
    return 'login'
  }

  const currentRoute = getCurrentRoute()

  if (currentRoute === 'public-stall') {
    const pathParts = window.location.pathname.split('/').filter(Boolean)
    return <PublicStallPage marketId={pathParts[1]} stallCode={decodeURIComponent(pathParts[2])} />
  }

  // Determine which user ID to use (impersonated or actual)
  const effectiveUserId = impersonate?.targetUserId || user?.id

  // Market Edit Page
  if (currentRoute === 'market-edit' && user && editingMarketId) {
    return (
      <Dashboard 
        user={user} 
        onLogout={handleLogout} 
        impersonation={impersonate}
        onStopImpersonation={handleStopImpersonate}
        activeRoleName={activeRoleName}
        isDashboardHeader
      >
        <MarketEditPage 
          marketId={editingMarketId} 
          onBack={() => {
            setEditingMarketId(null)
            window.location.hash = 'superadmin/dashboard'
          }} 
        />
      </Dashboard>
    )
  }

  // Render based on route
  if (currentRoute === 'superadmin' && user) {
    return (
      <Dashboard 
        user={user} 
        onLogout={handleLogout} 
        impersonation={impersonate}
        onStopImpersonation={handleStopImpersonate}
        activeRoleName={activeRoleName}
        isDashboardHeader
      >
        <SuperAdminDashboard onImpersonate={handleImpersonate} />
      </Dashboard>
    )
  }

  if (currentRoute === 'market' && user) {
    return (
      <Dashboard 
        user={user} 
        onLogout={handleLogout} 
        impersonation={impersonate}
        onStopImpersonation={handleStopImpersonate}
        activeRoleName={activeRoleName}
        isDashboardHeader
      >
        <MarketDashboard 
          userId={effectiveUserId} 
          impersonating={!!impersonate} 
          onStopImpersonation={handleStopImpersonate} 
          onLogout={handleLogout} 
        />
      </Dashboard>
    )
  }

  // Public judge documentation page (no auth required)
  if (currentRoute === 'juri-docs') {
    return <JuriDocumentationPage />
  }

  // Public market landing page (no auth required)
  if (currentRoute === 'market-landing') {
    const slug = window.location.pathname.slice(2) // Remove '/@' prefix
    return <MarketLandingPage slug={slug} />
  }

  // Default login page
  return <Auth onLoginSuccess={handleLoginSuccess} />
}

export default App