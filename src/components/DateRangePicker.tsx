import { useState, useRef, useEffect } from 'react'

interface DateRangePickerProps {
  dateFrom: string
  dateTo: string
  onDateFromChange: (val: string) => void
  onDateToChange: (val: string) => void
}

type PresetKey = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom'

const presets: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'this_week', label: 'Minggu Ini' },
  { key: 'this_month', label: 'Bulan Ini' },
  { key: 'last_month', label: 'Bulan Lalu' },
  { key: 'this_year', label: 'Tahun Ini' },
  { key: 'custom', label: 'Custom' }
]

function getDateRange(key: PresetKey): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon...

  const fmt = (date: Date) => date.toISOString().split('T')[0]

  switch (key) {
    case 'today':
      return { from: fmt(now), to: fmt(now) }

    case 'this_week': {
      // Monday as first day of week
      const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const mon = new Date(y, m, d + monOffset)
      const sun = new Date(y, m, d + monOffset + 6)
      return { from: fmt(mon), to: fmt(sun) }
    }

    case 'this_month':
      return {
        from: fmt(new Date(y, m, 1)),
        to: fmt(new Date(y, m + 1, 0))
      }

    case 'last_month':
      return {
        from: fmt(new Date(y, m - 1, 1)),
        to: fmt(new Date(y, m, 0))
      }

    case 'this_year':
      return {
        from: fmt(new Date(y, 0, 1)),
        to: fmt(new Date(y, 11, 31))
      }

    default:
      return { from: fmt(now), to: fmt(now) }
  }
}

export function DateRangePicker({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateRangePickerProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Determine active preset label
  const activePreset = presets.find(p => {
    if (p.key === 'custom') return false
    const range = getDateRange(p.key)
    return range.from === dateFrom && range.to === dateTo
  })

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handlePreset = (key: PresetKey) => {
    if (key === 'custom') {
      setMenuOpen(false)
      return
    }
    const range = getDateRange(key)
    onDateFromChange(range.from)
    onDateToChange(range.to)
    setMenuOpen(false)
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }} ref={menuRef}>
      {/* Preset Dropdown */}
      <div style={{ position: 'relative' }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#555' }}>Periode</label>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 140
          }}
        >
          <span>{activePreset?.label || 'Custom'}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10 }}>{menuOpen ? '▲' : '▼'}</span>
        </button>
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 100,
              minWidth: 160,
              overflow: 'hidden'
            }}
          >
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePreset(p.key)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: activePreset?.key === p.key ? '#f0fdf4' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  textAlign: 'left',
                  color: activePreset?.key === p.key ? '#2D5016' : '#333',
                  fontWeight: activePreset?.key === p.key ? 600 : 400
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = activePreset?.key === p.key ? '#f0fdf4' : 'transparent')}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date inputs */}
      <div>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#555' }}>Dari</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#555' }}>Sampai</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
        />
      </div>
    </div>
  )
}