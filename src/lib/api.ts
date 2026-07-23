import { getSupabaseClient } from './supabase'
import { SupabaseClient } from '@supabase/supabase-js'

// API Response Types
interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

// Market Types
export interface Market {
  id: number
  name: string
  code: string
  city: string
  address?: string
  status: string
  created_at?: string
}

export interface MarketStats extends Market {
  stallCount: number
  officerCount: number
  transactionCount: number
  totalRevenue: number
}

// Officer Types
export interface Officer {
  id: number
  code: string
  name: string
  phone?: string
  market_id: number
  status: string
  created_at?: string
}

// Stall Types
export interface Stall {
  id: number
  code: string
  number: string
  market_id: number
  sector_id?: number
  owner_id?: number
  status: string
}

// Transaction Types
export interface Transaction {
  id: number
  stall_id: number
  payer_name: string
  amount: number
  payment_method?: string
  status: string
  note?: string
  created_at?: string
}

// API Client Class
class ApiClient {
  public supabase: SupabaseClient

  constructor() {
    this.supabase = getSupabaseClient()
  }

  // Markets API
  async getMarkets(): Promise<Market[]> {
    const { data, error } = await this.supabase
      .from('markets')
      .select('*')
      .order('name')

    if (error) throw new Error(error.message)
    return data || []
  }

  async getMarketsWithStats(): Promise<MarketStats[]> {
    const markets = await this.getMarkets()
    
    const marketsWithStats = await Promise.all(
      markets.map(async (market) => {
        const { count: stallCount } = await this.supabase
          .from('stalls')
          .select('*', { count: 'exact' })
          .eq('market_id', market.id)

        const { count: officerCount } = await this.supabase
          .from('users')
          .select('*', { count: 'exact' })
          .eq('market_id', market.id)

        const { data: stallRows } = await this.supabase
          .from('stalls')
          .select('id')
          .eq('market_id', market.id)

        const stallIds = stallRows?.map(s => s.id) || []
        
        let transactionCount = 0
        let totalRevenue = 0

        if (stallIds.length > 0) {
          const { count } = await this.supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .in('stall_id', stallIds)

          const { data: revenueData } = await this.supabase
            .from('transactions')
            .select('amount')
            .in('stall_id', stallIds)

          transactionCount = count || 0
          totalRevenue = (revenueData || []).reduce(
            (sum, t) => sum + (parseFloat(t.amount) || 0),
            0
          )
        }

        return {
          ...market,
          stallCount: stallCount || 0,
          officerCount: officerCount || 0,
          transactionCount,
          totalRevenue
        }
      })
    )

    return marketsWithStats
  }

  async createMarket(market: Partial<Market>): Promise<Market> {
    const { data, error } = await this.supabase
      .from('markets')
      .insert([market])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  // Users/Officers API
  async getOfficers(marketId: number): Promise<Officer[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('market_id', marketId)
      .order('name')

    if (error) throw new Error(error.message)
    return data || []
  }

  async createOfficer(officer: Partial<Officer>): Promise<Officer> {
    const { data, error } = await this.supabase
      .from('users')
      .insert([officer])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  // Stalls API
  async getStalls(marketId: number): Promise<Stall[]> {
    const { data, error } = await this.supabase
      .from('stalls')
      .select(`
        *,
        stall_owners (id, name),
        stall_categories (id, name)
      `)
      .eq('market_id', marketId)
      .order('number')

    if (error) throw new Error(error.message)
    return data || []
  }

  // Transactions API
  async getTransactions(stallId?: number): Promise<Transaction[]> {
    let query = this.supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (stallId) {
      query = query.eq('stall_id', stallId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  }

  async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  // Auth API
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error) throw new Error(error.message)
    return user
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw new Error(error.message)
    return data
  }

  async logout() {
    await this.supabase.auth.signOut()
  }
}

// Export singleton instance
export const api = new ApiClient()

export default api