import { useState, useEffect } from 'react'

type PageType = 'dashboard' | 'pasar' | 'users' | 'transaksi' | 'rekonsiliasi' | 'laporan' | 'overview' | 'markets' | 'settings'

interface NavigationState {
  currentPage: PageType
  currentPath: string
  pageTitle: string
  pageDescription: string
  navigateTo: (page: PageType) => void
}

const PAGE_METADATA: Record<PageType, { title: string; description: string }> = {
  dashboard: { title: 'Dashboard', description: 'Ringkasan sistem SIAGA' },
  overview: { title: 'Overview', description: 'Statistik dan analitik pasar' },
  pasar: { title: 'Manajemen Pasar', description: 'Kelola data pasar tradisional' },
  markets: { title: 'Daftar Pasar', description: 'Semua pasar yang terdaftar' },
  users: { title: 'Manajemen User', description: 'Kelola pengguna sistem' },
  transaksi: { title: 'Transaksi', description: 'Data transaksi retribusi' },
  rekonsiliasi: { title: 'Rekonsiliasi', description: 'Rekonsiliasi keuangan' },
  laporan: { title: 'Laporan', description: 'Laporan dan export data' },
  settings: { title: 'Pengaturan', description: 'Konfigurasi sistem' }
}

export function useNavigation(): NavigationState {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [currentPath, setCurrentPath] = useState<string>('/')

  // Parse URL hash to get current page - gunakan hash-based routing
  useEffect(() => {
    const parseCurrentPage = () => {
      const hash = window.location.hash.slice(1) || 'dashboard'
      const validPage = (Object.keys(PAGE_METADATA).includes(hash) ? hash : 'dashboard') as PageType
      setCurrentPage(validPage)
      
      const path = window.location.pathname + window.location.hash
      setCurrentPath(path)
    }

    // Parse on mount
    parseCurrentPage()

    // Listen to hash changes
    const handleHashChange = () => parseCurrentPage()
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const navigateTo = (page: PageType) => {
    // Update URL hash
    window.location.hash = page
    setCurrentPage(page)
    setCurrentPath(window.location.pathname + `#${page}`)
  }

  const metadata = PAGE_METADATA[currentPage] || PAGE_METADATA.dashboard

  return {
    currentPage,
    currentPath,
    pageTitle: metadata.title,
    pageDescription: metadata.description,
    navigateTo
  }
}

// Breadcrumb hook
export function useBreadcrumb() {
  const { currentPage, pageTitle } = useNavigation()
  
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: pageTitle, path: `#${currentPage}` }
  ]
  
  return breadcrumbs
}

// URL parameter parsing hook
export function useUrlParams<T extends Record<string, string>>(): T {
  const [params, setParams] = useState<T>({} as T)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const newParams = {} as T
    
    searchParams.forEach((value, key) => {
      ;(newParams as any)[key] = value
    })
    
    setParams(newParams)
  }, [])

  return params
}

// Hook untuk menampilkan path aktif di browser
export function useActivePath() {
  const { currentPage, currentPath } = useNavigation()
  
  return {
    isActive: (page: PageType) => currentPage === page,
    currentPath,
    currentPage
  }
}

// Example usage:
// const { currentPage, currentPath, pageTitle, navigateTo } = useNavigation()
// const breadcrumbs = useBreadcrumb()
// const params = useUrlParams<{ marketId: string; tab: string }>()
// const { isActive, currentPath } = useActivePath()