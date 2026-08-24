import './Loading.css'

interface LoadingProps {
  /** Teks opsional di bawah spinner */
  label?: string
  /** 'spinner' = lingkaran berputar, 'skeleton' = placeholder abu-abu */
  variant?: 'spinner' | 'skeleton'
  /** Untuk variant skeleton: jumlah baris placeholder */
  rows?: number
  /** Tinggi area loading (default memenuhi layar) */
  fullHeight?: boolean
}

/**
 * Komponen loading konsisten untuk seluruh aplikasi.
 *
 * Contoh pemakaian:
 * ```tsx
 * {loading ? <Loading label="Memuat data lapak..." /> : <DataTable ... />}
 * {loading ? <Loading variant="skeleton" rows={5} /> : <List ... />}
 * ```
 */
export function Loading({ label, variant = 'spinner', rows = 3, fullHeight = true }: LoadingProps) {
  if (variant === 'skeleton') {
    return (
      <div className={`loading-skeleton ${fullHeight ? 'full-height' : ''}`} role="status" aria-label="Memuat data">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-row" style={{ width: `${100 - i * 8}%`, animationDelay: `${i * 0.12}s` }} />
        ))}
        <span className="sr-only">Memuat...</span>
      </div>
    )
  }

  return (
    <div className={`loading-spinner-wrap ${fullHeight ? 'full-height' : ''}`} role="status" aria-label="Memuat data">
      <div className="loading-spinner" aria-hidden="true" />
      {label && <p className="loading-label">{label}</p>}
      {!label && <span className="sr-only">Memuat...</span>}
    </div>
  )
}

export default Loading