import { useNavigation } from '../hooks/useNavigation'

interface NavigationProps {
  showMarketNav?: boolean
}

export function Navigation({ showMarketNav = false }: NavigationProps) {
  const { currentPage, navigateTo } = useNavigation()

  const superadminNavItems = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'markets', label: '🏪 Manajemen Pasar', icon: '🏪' },
    { id: 'analytics', label: '📈 Analytics', icon: '📈' },
    { id: 'users', label: '👥 Manajemen User', icon: '👥' }
  ]

  const marketNavItems = [
    { id: 'dashboard', label: '🏠 Dashboard', icon: '🏠' },
    { id: 'stalls', label: '🏪 Lapak', icon: '🏪' },
    { id: 'officers', label: '👮 Petugas', icon: '👮' },
    { id: 'transactions', label: '💰 Transaksi', icon: '💰' },
    { id: 'reconciliations', label: '📊 Rekonsiliasi', icon: '📊' },
    { id: 'sectors', label: '🗂️ Sektor', icon: '🗂️' },
    { id: 'owners', label: '👥 Pemilik', icon: '👥' }
  ]

  const navItems = showMarketNav ? marketNavItems : superadminNavItems

  return (
    <aside className="siaga-sidebar">
      <nav>
        <ul className="siaga-nav-list">
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${showMarketNav ? 'market' : 'superadmin'}/${item.id}`}
                className={`siaga-nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  navigateTo(item.id as any)
                }}
              >
                <span className="siaga-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}