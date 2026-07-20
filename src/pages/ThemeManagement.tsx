import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import '../pages/SuperAdminDashboardImproved.css'

interface Theme {
  id: string
  name: string
  primary_color: string
  secondary_color: string
  accent_color: string
  description: string
  is_active: boolean
  created_at?: string
}

const DEFAULT_THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Hijau (Default)',
    primary_color: '#1f7a1f',
    secondary_color: '#3d5224',
    accent_color: '#f4c300',
    description: 'Tema hijau klasik untuk semua pasar',
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
  }
]

export function ThemeManagement() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    primary_color: '#1f7a1f',
    secondary_color: '#3d5224',
    accent_color: '#f4c300',
    description: ''
  })

  useEffect(() => {
    loadThemes()
  }, [])

  const loadThemes = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('market_themes')
        .select('*')
        .order('name')
      
      if (data && data.length > 0) {
        setThemes(data || [])
      } else {
        // Use default themes if no data
        setThemes(DEFAULT_THEMES)
      }
    } catch (err) {
      console.error('Error loading themes:', err)
      setThemes(DEFAULT_THEMES)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('market_themes').insert([{
        ...formData,
        is_active: true
      }])
      
      if (error) throw error
      
      setFormData({
        name: '',
        primary_color: '#1f7a1f',
        secondary_color: '#3d5224',
        accent_color: '#f4c300',
        description: ''
      })
      setShowForm(false)
      loadThemes()
    } catch (err) {
      console.error('Error saving theme:', err)
      alert('Gagal menyimpan tema')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyTheme = async (themeId: string, marketId: number) => {
    if (!confirm('Terapkan tema ini ke pasar?')) return
    
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('markets')
        .update({ theme_id: themeId })
        .eq('id', marketId)
      
      if (error) throw error
      alert('Tema berhasil diterapkan!')
    } catch (err) {
      console.error('Error applying theme:', err)
      alert('Gagal menerapkan tema')
    }
  }

  if (loading) {
    return <div className="siaga-loading">Memuat tema...</div>
  }

  return (
    <div className="siaga-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>🎨 Manajemen Tema Pasar</h3>
        <button 
          className="siaga-btn siaga-btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Tutup' : '+ Tambah Tema'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Nama Tema</label>
              <input
                type="text"
                className="siaga-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Tema Merah"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Warna Utama</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  className="siaga-input"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#1f7a1f"
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Warna Sekunder</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  className="siaga-input"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  placeholder="#3d5224"
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Warna Aksen</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  className="siaga-input"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  placeholder="#f4c300"
                />
              </div>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Deskripsi</label>
              <textarea
                className="siaga-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi tema..."
                rows={2}
              />
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="siaga-btn siaga-btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Tema'}
            </button>
          </div>
        </form>
      )}

      <div className="themes-grid">
        {themes.map((theme) => (
          <div key={theme.id} className="theme-card" style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                borderRadius: '8px'
              }} />
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{theme.name}</h4>
              {theme.is_active && (
                <span style={{
                  padding: '2px 8px',
                  background: '#dcfce7',
                  color: '#166534',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>Aktif</span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              {theme.description || 'Tema untuk pasar'}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="siaga-btn siaga-btn-primary"
                style={{ flex: 1, fontSize: '13px', padding: '8px' }}
                onClick={() => {
                  const marketId = prompt('Masukkan ID Pasar:')
                  if (marketId) handleApplyTheme(theme.id, parseInt(marketId))
                }}
              >
                🔄 Terapkan ke Pasar
              </button>
              <button
                className="siaga-btn siaga-btn-outline"
                style={{ fontSize: '13px', padding: '8px' }}
              >
                ✏️ Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}