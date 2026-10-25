import { useEffect, useState } from 'react'
import { supabase, supabaseConfigError } from './lib/supabase'
import { getUserRole } from './lib/roleUtils'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { SuperAdminDashboardImproved as SuperAdminDashboard } from './pages/SuperAdminDashboardImproved'
import { MarketDashboard } from './pages/MarketDashboard'
import { MarketEditPage } from './pages/MarketEditPage'
import { MarketLandingPage } from './pages/MarketLandingPage'
import { PublicStallPage } from './pages/PublicStallPage'
import './App.css'
import './styles/layout.css'

type Route = 'login' | 'superadmin' | 'market' | 'market-edit' | 'market-landing' | 'public-stall'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeRoleName, setActiveRoleName] = useState<string | null>(null)
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

    // Bersihkan sesi impersonation lama (fitur sudah dihapus).
    localStorage.removeItem('impersonate_original_user_id')
    localStorage.removeItem('impersonate_target_user_id')
    localStorage.removeItem('impersonate_target_role')

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
          } else if (['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN', 'OFFICER'].includes(roleName)) {
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
    const marketRoles = ['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN', 'OFFICER']
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
    } else if (['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN', 'OFFICER'].includes(roleName)) {
      window.location.hash = 'market/dashboard'
    } else {
      window.location.hash = 'login'
    }
  }

  const handleLogout = async () => {
    await supabase?.auth.signOut()
    window.location.hash = ''
    setActiveRoleName(null)
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

    if (/^\/lapak\/[^/]+(?:\/[^/]+)?\/?$/.test(window.location.pathname)) {
      return 'public-stall'
    }

    if (!user) return 'login'
    const hash = window.location.hash.slice(1)
    const marketRoles = ['MARKET_HEAD', 'MARKET_ADMIN', 'ADMIN_PASAR', 'PASAR_ADMIN', 'OFFICER']

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
    const token = pathParts.length === 2 ? decodeURIComponent(pathParts[1]) : undefined
    const stallCode = pathParts[2] ? decodeURIComponent(pathParts[2]) : undefined
    return <PublicStallPage token={token} marketId={pathParts[1]} stallCode={stallCode} />
  }

  // Market Edit Page
  if (currentRoute === 'market-edit' && user && editingMarketId) {
    return (
      <Dashboard 
        user={user} 
        onLogout={handleLogout} 
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
        activeRoleName={activeRoleName}
        isDashboardHeader
      >
        <SuperAdminDashboard />
      </Dashboard>
    )
  }

  if (currentRoute === 'market' && user) {
    return (
      <Dashboard 
        user={user} 
        onLogout={handleLogout} 
        activeRoleName={activeRoleName}
        isDashboardHeader
      >
        <MarketDashboard 
          userId={user.id} 
          onLogout={handleLogout} 
        />
      </Dashboard>
    )
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