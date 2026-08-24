import { useEffect } from 'react'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** true = tombol konfirmasi merah (aksi destruktif seperti hapus) */
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Dialog konfirmasi reusable menggantikan `confirm()` bawaan browser.
 * Gaya konsisten dengan modal aplikasi (brand hijau #2D5016).
 *
 * Contoh pemakaian:
 * ```tsx
 * const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
 *
 * <ConfirmDialog
 *   open={!!deleteTarget}
 *   title="Hapus Data"
 *   message={`Yakin hapus ${deleteTarget?.name}? Tindakan ini tidak bisa dibatalkan.`}
 *   confirmLabel="Hapus"
 *   danger
 *   onConfirm={() => { handleDelete(deleteTarget!.id); setDeleteTarget(null) }}
 *   onCancel={() => setDeleteTarget(null)}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      className="confirm-dialog-backdrop"
      onClick={() => {
        if (!loading) onCancel()
      }}
      role="presentation"
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-dialog-icon ${danger ? 'danger' : ''}`} aria-hidden="true">
          {danger ? '🗑️' : '❓'}
        </div>
        <h3 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        <p id="confirm-dialog-message" className="confirm-dialog-message">
          {message}
        </p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog-btn ${danger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog