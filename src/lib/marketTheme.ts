import { getSupabaseClient } from './supabase'

export interface MarketTheme {
  id: string
  name: string
  primary_color: string
  secondary_color: string
  accent_color: string
  description?: string
  is_active?: boolean
}

export const DEFAULT_MARKET_THEMES: MarketTheme[] = [
  {
    id: 'default',
    name: 'Navy (Default)',
    primary_color: '#1e3a8a',
    secondary_color: '#23406b',
    accent_color: '#60a5fa',
    description: 'Tema navy dengan aksen biru muda untuk semua pasar',
    is_active: true
  },
  {
    id: 'ocean',
    name: 'Biru Laut',
    primary_color: '#0ea5e9',
    secondary_color: '#0284c7',
    accent_color: '#06b6d4',
    description: 'Tema biru yang menenangkan',
    is_active: false
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    primary_color: '#ea580c',
    secondary_color: '#c2410c',
    accent_color: '#f97316',
    description: 'Tema oranye cerah',
    is_active: false
  },
  {
    id: 'purple',
    name: 'Ungu Royal',
    primary_color: '#7c3aed',
    secondary_color: '#6d28d9',
    accent_color: '#a855f7',
    description: 'Tema ungu elegan',
    is_active: false
  },
  {
    id: 'amber',
    name: 'Kuning Keemasan',
    primary_color: '#a16207',
    secondary_color: '#854d0e',
    accent_color: '#facc15',
    description: 'Tema kuning keemasan yang hangat',
    is_active: false
  },
  {
    id: 'red',
    name: 'Merah Marun',
    primary_color: '#b91c1c',
    secondary_color: '#7f1d1d',
    accent_color: '#ef4444',
    description: 'Tema merah marun yang tegas',
    is_active: false
  },
  {
    id: 'teal',
    name: 'Teal Tosca',
    primary_color: '#0f766e',
    secondary_color: '#115e59',
    accent_color: '#2dd4bf',
    description: 'Tema teal tosca yang segar',
    is_active: false
  },
  {
    id: 'olive',
    name: 'Olive Zaitun',
    primary_color: '#556b2f',
    secondary_color: '#3f4f21',
    accent_color: '#9caa63',
    description: 'Tema olive zaitun yang natural',
    is_active: false
  },
  {
    id: 'rose',
    name: 'Rose Anggrek',
    primary_color: '#be185d',
    secondary_color: '#9d174d',
    accent_color: '#f472b6',
    description: 'Tema rose anggrek yang lembut',
    is_active: false
  },
  {
    id: 'indigo',
    name: 'Indigo Malam',
    primary_color: '#4338ca',
    secondary_color: '#3730a3',
    accent_color: '#818cf8',
    description: 'Tema indigo malam yang kalem',
    is_active: false
  },
  {
    id: 'coffee',
    name: 'Kopi Tanah',
    primary_color: '#6f4e37',
    secondary_color: '#55392a',
    accent_color: '#c19a6b',
    description: 'Tema kopi tanah yang membumi',
    is_active: false
  },
  {
    id: 'graphite',
    name: 'Grafit Batu',
    primary_color: '#334155',
    secondary_color: '#1e293b',
    accent_color: '#94a3b8',
    description: 'Tema grafit netral tanpa warna mencolok',
    is_active: false
  }
]

const NAVY_FALLBACK = DEFAULT_MARKET_THEMES[0]

type Rgb = [number, number, number]

function parseHex(value: string | undefined | null): Rgb | null {
  if (!value) return null
  const hex = value.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$/.test(hex) && !/^[0-9a-fA-F]{6}$/.test(hex)) return null
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ]
}

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`
}

function mix(from: string, to: string, weight: number): string {
  const a = parseHex(from)
  const b = parseHex(to)
  if (!a || !b) return from
  return toHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * weight) as Rgb)
}

const tint = (hex: string, amount: number) => mix(hex, '#ffffff', amount)
const shade = (hex: string, amount: number) => mix(hex, '#000000', amount)
const alpha = (rgb: Rgb, value: number) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${value})`

export function applyMarketTheme(theme: MarketTheme | null): void {
  const primary = parseHex(theme?.primary_color) ? (theme as MarketTheme).primary_color : NAVY_FALLBACK.primary_color
  const accent = parseHex(theme?.accent_color) ? (theme as MarketTheme).accent_color : NAVY_FALLBACK.accent_color
  const primaryRgb = parseHex(primary) as Rgb
  const headerText = shade(primary, 0.62)

  const variables: Record<string, string> = {
    '--siaga-primary': primary,
    '--siaga-primary-dark': shade(primary, 0.35),
    '--siaga-primary-light': tint(accent, 0.86),
    '--siaga-primary-rgb': primaryRgb.join(', '),
    '--siaga-primary-shadow': alpha(primaryRgb, 0.16),
    '--siaga-accent': accent,
    '--siaga-accent-light': tint(accent, 0.78),
    '--siaga-header-from': tint(accent, 0.88),
    '--siaga-header-to': tint(accent, 0.72),
    '--siaga-header-text': headerText,
    '--siaga-header-border': tint(accent, 0.6),
    '--primary': primary,
    '--primary-dark': shade(primary, 0.35),
    '--primary-light': tint(accent, 0.86)
  }

  const root = document.documentElement
  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value))
}

// Preset lokal dipakai sebagai cadangan bila baris market_themes tidak terbaca
// (mis. saat offline atau baris tema kustom belum ada di DB).
export async function resolveMarketTheme(themeId: string | null | undefined): Promise<MarketTheme | null> {
  if (!themeId) return null
  const preset = DEFAULT_MARKET_THEMES.find((theme) => theme.id === themeId) || null
  try {
    const { data, error } = await getSupabaseClient()
      .from('market_themes')
      .select('id, name, primary_color, secondary_color, accent_color')
      .eq('id', themeId)
      .maybeSingle()
    if (!error && data) return data as MarketTheme
  } catch {
    // jatuh ke preset
  }
  return preset
}

export async function applyMarketThemeById(themeId: string | null | undefined): Promise<void> {
  applyMarketTheme(await resolveMarketTheme(themeId))
}
