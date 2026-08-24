import './EmptyState.css'

interface EmptyStateProps {
  /** Emoji atau karakter ikon (misal: '🏪', '📋', '🔍') */
  icon?: string
  title: string
  subtitle?: string
  /** Label tombol aksi opsional */
  actionLabel?: string
  onAction?: () => void
}

/**
 * Komponen empty state konsisten untuk seluruh aplikasi.
 *
 * Contoh pemakaian:
 * ```tsx
 * {items.length === 0 ? (
 *   <EmptyState
 *     icon="🏪"
 *     title="Belum ada data lapak"
 *     subtitle="Tambahkan lapak pertama untuk mulai mencatat transaksi."
 *     actionLabel="+ Tambah Lapak"
 *     onAction={() => setShowForm(true)}
 *   />
 * ) : (
 *   <DataTable ... />
 * )}
 * ```
 */
export function EmptyState({ icon = '📭', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      {actionLabel && onAction && (
        <button type="button" className="empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState