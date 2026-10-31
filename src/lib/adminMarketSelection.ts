export const ADMIN_MARKET_KEY = 'siaga_admin_market_id'

export function getSelectedAdminMarketId(): number | null {
  const id = Number(localStorage.getItem(ADMIN_MARKET_KEY) || 0)
  return id > 0 ? id : null
}

export function setSelectedAdminMarketId(id: number) {
  localStorage.setItem(ADMIN_MARKET_KEY, String(id))
}

export function clearSelectedAdminMarketId() {
  localStorage.removeItem(ADMIN_MARKET_KEY)
}
