export function NotFoundPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f9fc', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <p style={{ margin: 0, color: '#a26035', fontWeight: 700, letterSpacing: '0.12em', fontSize: 12 }}>SIAGA</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: 56, color: '#0b1f3a' }}>404</h1>
        <p style={{ margin: '0 0 24px', color: '#626a7d' }}>Halaman yang Anda cari tidak ditemukan.</p>
        <a
          href="/"
          style={{ display: 'inline-block', padding: '12px 20px', background: '#1b4b7a', color: '#fff', textDecoration: 'none', borderRadius: 6, fontWeight: 600 }}
        >
          Kembali ke beranda
        </a>
      </div>
    </main>
  )
}
