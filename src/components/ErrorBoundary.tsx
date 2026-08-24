import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  /** Fallback ditampilkan saat render gagal (default: pesan generik) */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * ErrorBoundary — menangkap error render tak tertangkap di seluruh pohon React.
 * Audit item 3.4.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Log ke console untuk debugging (bisa diganti ke Sentry/SDK error tracking)
    console.error('React error boundary caught:', error, info)
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: 32,
            textAlign: 'center',
            color: '#475569',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 48, marginBottom: 16 }}>
            ⚠️
          </span>
          <h2 style={{ fontSize: 20, margin: 0, marginBottom: 8 }}>
            Terjadi Kesalahan
          </h2>
          <p style={{ margin: 0, marginBottom: 16, maxWidth: 480 }}>
            Halaman ini tidak dapat dimuat. Silakan muat ulang atau kembali ke
            beranda.
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            className="btn-primary"
            style={{ padding: '8px 24px' }}
          >
            Kembali ke Beranda
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
