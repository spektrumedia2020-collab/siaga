interface MarketDetailPageProps {
  marketId?: string
  onBack?: () => void
  onSaved?: () => void
}

export function MarketDetailPage({ marketId, onBack, onSaved }: MarketDetailPageProps) {
  return (
    <div className="page-card">
      <h2>Detail Pasar</h2>
      <p>Halaman detail pasar sedang disiapkan.</p>
      {marketId && <p>Market ID: {marketId}</p>}
      {onBack && <button onClick={onBack}>Kembali</button>}
      {onSaved && <button onClick={onSaved}>Simpan</button>}
    </div>
  )
}
