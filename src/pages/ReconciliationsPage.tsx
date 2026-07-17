interface ReconciliationsPageProps {
  marketId?: string
}

export function ReconciliationsPage({ marketId }: ReconciliationsPageProps) {
  return (
    <div className="page-card">
      <h2>✅ Rekonsiliasi</h2>
      <p>Bandingkan pencatatan transaksi dengan dokumen pendukung dan hasil pelaporan.</p>
      <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <strong>Pasar aktif:</strong> {marketId || 'Belum ditentukan'}
      </div>
      <ul style={{ marginTop: 12, paddingLeft: 20 }}>
        <li>Audit transaksi</li>
        <li>Sinkronisasi data harian</li>
        <li>Catatan selisih dan koreksi</li>
      </ul>
    </div>
  )
}
