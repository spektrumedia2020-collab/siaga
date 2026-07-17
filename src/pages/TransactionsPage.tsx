interface TransactionsPageProps {
  marketId?: string
}

export function TransactionsPage({ marketId }: TransactionsPageProps) {
  return (
    <div className="page-card">
      <h2>🧾 Transaksi</h2>
      <p>Catat dan pantau transaksi yang terjadi di pasar ini.</p>
      <div style={{ marginTop: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <strong>Pasar aktif:</strong> {marketId || 'Belum ditentukan'}
      </div>
      <ul style={{ marginTop: 12, paddingLeft: 20 }}>
        <li>Daftar transaksi harian</li>
        <li>Ringkasan pendapatan</li>
        <li>Filter berdasarkan lapak atau petugas</li>
      </ul>
    </div>
  )
}
