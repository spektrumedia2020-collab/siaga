import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { DEFAULT_MARKET_THEMES, applyMarketTheme, type MarketTheme } from '../lib/marketTheme'
import { Loading } from '../components/Loading'
import '../pages/MarketDashboard.css'

interface MarketThemePageProps {
  marketId: number
  readOnly?: boolean
  onSaved?: () => void
}

export function MarketThemePage({ marketId, readOnly = false, onSaved }: MarketThemePageProps) {
  const [themes, setThemes] = useState<MarketTheme[]>(DEFAULT_MARKET_THEMES)
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadThemes()
  }, [marketId])

  const loadThemes = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      const [{ data: market }, { data: themeRows }] = await Promise.all([
        supabase.from('markets').select('theme_id').eq('id', marketId).maybeSingle(),
        supabase
          .from('market_themes')
          .select('id, name, primary_color, secondary_color, accent_color, is_active')
          .order('name')
      ])

      if (themeRows && themeRows.length > 0) {
        setThemes(themeRows as MarketTheme[])
      }
      setSelected(market?.theme_id || '')
    } catch (err) {
      console.error('Error loading market themes:', err)
      setError('Gagal memuat tema pasar')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { error: updateError } = await getSupabaseClient()
        .from('markets')
        .update({ theme_id: selected || null })
        .eq('id', marketId)

      if (updateError) throw updateError

      applyMarketTheme(themes.find((theme) => theme.id === selected) || null)
      setMessage('Tema pasar tersimpan')
      onSaved?.()
    } catch (err: any) {
      console.error('Error saving market theme:', err)
      setError(err?.message || 'Gagal menyimpan tema pasar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading label="Memuat tema pasar..." fullHeight={false} />
  }

  return (
    <div className="content-editor-panel">
      <div className="content-editor-header">
        <div>
          <span className="content-editor-kicker">Tampilan pasar</span>
          <h2>Tema Pasar</h2>
        </div>
        {!readOnly && (
          <div className="content-editor-header-actions">
            <button
              type="button"
              className="siaga-btn siaga-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Tema'}
            </button>
          </div>
        )}
      </div>

      <p className="theme-page-hint">
        Tema ini dipakai halaman publik pasar dan dashboard pasar yang sedang dikelola.
        {readOnly && ' Akun ini hanya dapat melihat tema.'}
      </p>

      <div className="theme-choice-grid" role="radiogroup" aria-label="Tema tampilan pasar">
        {themes.map((theme) => {
          const isActive = selected === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`theme-choice${isActive ? ' active' : ''}`}
              onClick={() => {
                if (readOnly) return
                setSelected(theme.id)
                setMessage('')
              }}
              disabled={readOnly}
            >
              <span
                className="theme-choice-swatch"
                style={{ background: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.secondary_color} 100%)` }}
              >
                <span className="theme-choice-accent" style={{ background: theme.accent_color }} />
              </span>
              <span className="theme-choice-name">{theme.name}</span>
            </button>
          )
        })}
      </div>

      {error && <div className="content-editor-error">{error}</div>}
      {message && <p className="theme-page-success">{message}</p>}
    </div>
  )
}
