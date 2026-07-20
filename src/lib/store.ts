import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { getSupabaseClient } from './supabase'

// Auth Store Types
interface User {
  id: string
  email?: string
  user_metadata?: any
}

interface AuthState {
  user: User | null
  role: string | null
  loading: boolean
  setUser: (user: User | null) => void
  setRole: (role: string | null) => void
  setLoading: (loading: boolean) => void
  logout: () => Promise<void>
}

// Market Store Types
interface Market {
  id: number
  name: string
  code: string
  city: string
  address?: string
  status: string
}

interface MarketState {
  markets: Market[]
  selectedMarket: Market | null
  loading: boolean
  fetchMarkets: () => Promise<void>
  setSelectedMarket: (market: Market | null) => void
}

// Officer Store Types
interface Officer {
  id: number
  code: string
  name: string
  phone?: string
  status: string
}

interface OfficerState {
  officers: Officer[]
  loading: boolean
  fetchOfficers: (marketId: number) => Promise<void>
}

// Auth Store
export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      role: null,
      loading: false,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setLoading: (loading) => set({ loading }),
      logout: async () => {
        try {
          const supabase = getSupabaseClient()
          await supabase.auth.signOut()
          set({ user: null, role: null })
        } catch (error) {
          console.error('Logout error:', error)
        }
      }
    }),
    { name: 'auth-store' }
  )
)

// Market Store
export const useMarketStore = create<MarketState>()(
  devtools(
    (set, get) => ({
      markets: [],
      selectedMarket: null,
      loading: false,
      fetchMarkets: async () => {
        set({ loading: true })
        try {
          const supabase = getSupabaseClient()
          const { data, error } = await supabase
            .from('markets')
            .select('*')
            .order('name')

          if (error) throw error
          set({ markets: data || [] })
        } catch (error) {
          console.error('Error fetching markets:', error)
          set({ markets: [] })
        } finally {
          set({ loading: false })
        }
      },
      setSelectedMarket: (market) => set({ selectedMarket: market })
    }),
    { name: 'market-store' }
  )
)

// Officer Store
export const useOfficerStore = create<OfficerState>()(
  devtools(
    (set) => ({
      officers: [],
      loading: false,
      fetchOfficers: async (marketId) => {
        set({ loading: true })
        try {
          const supabase = getSupabaseClient()
          const { data, error } = await supabase
            .from('officers')
            .select('*')
            .eq('market_id', marketId)
            .order('name')

          if (error) throw error
          set({ officers: data || [] })
        } catch (error) {
          console.error('Error fetching officers:', error)
          set({ officers: [] })
        } finally {
          set({ loading: false })
        }
      }
    }),
    { name: 'officer-store' }
  )
)

// Usage examples:
// const { user, loading, logout } = useAuthStore()
// const { markets, fetchMarkets } = useMarketStore()
// const { officers, fetchOfficers } = useOfficerStore()