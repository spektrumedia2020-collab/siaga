const PRODUCTION_ORIGIN = 'https://siaga.app'

const isLocalHost = (host: string) => host === 'localhost' || host === '127.0.0.1'

export function getPublicBaseUrl() {
  const configured = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  if (isLocalHost(window.location.hostname)) return window.location.origin

  return PRODUCTION_ORIGIN
}
