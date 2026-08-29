import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { DateRangePicker } from '../components/DateRangePicker'
import { ExportButtons } from '../components/ExportButtons'

interface ReconciliationsPageProps {
  marketId?: number | string
}

interface StallSummary {
  stall_id: number
  stall_code: string
  stall_number: string
  sector_id: number | null
  sector_name: string
  owner_name: string
  expected_amount: number
  actual_amount: number
  difference: number
  transaction_count: number
}

export function ReconciliationsPage({ marketId }: ReconciliationsPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stallSummaries, setStallSummaries] = useState<StallSummary[]>([])
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [showOnlyDiscrepancy, setShowOnlyDiscrepancy] = useState(false)
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  const marketIdNum = Number(marketId) || 0

  useEffect(() => {
    if (marketIdNum > 0) {
      loadReconciliation()
    }
  }, [marketIdNum, dateFrom, dateTo])

  const loadReconciliation = async () => {
    try {
      setLoading(true)
      setError('')
      const supabase = getSupabaseClient()

      // Get all stalls for this market
      const { data: stallsData, error: stallsErr } = await supabase
        .from('stalls')
        .select('id, code, number, sector_id, owner_id')
        .eq('market_id', marketIdNum)
        .order('number')

      if (stallsErr) throw stallsErr

      // Get sector and owner names
      const { data: sectorsData, error: sectorsErr } = await supabase
        .from('market_sectors')
        .select('id, name')
        .eq('market_id', marketIdNum)
      if (sectorsErr) throw sectorsErr

      const { data: ownersData, error: ownersErr } = await supabase
        .from('stall_owners')
        .select('id, name')
        .order('name')
      if (ownersErr) throw ownersErr

      const sectorMap = new Map((sectorsData || []).map(s => [s.id, s.name]))
      const ownerMap = new Map((ownersData || []).map(o => [o.id, o.name]))

      // Get all retribution rates for these stalls
      const stallIds = (stallsData || []).map(s => s.id)
      if (stallIds.length === 0) {
        setStallSummaries([])
        return
      }

      const { data: ratesData, error: ratesErr } = await supabase
        .from('retribution_rates')
        .select('stall_id, amount')
        .in('stall_id', stallIds)
      if (ratesErr) throw ratesErr

      // Group rates by stall_id and sum
      const ratesByStall: Record<number, number> = {}
      for (const rate of ratesData || []) {
        ratesByStall[rate.stall_id] = (ratesByStall[rate.stall_id] || 0) + Number(rate.amount)
      }

      // Get transactions for these stalls within date range
      const { data: transactionsData, error: transactionsErr } = await supabase
        .from('transactions')
        .select('stall_id, amount')
        .in('stall_id', stallIds)
        .eq('status', 'paid')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
      if (transactionsErr) throw transactionsErr

      // Group transactions by stall_id and sum
      const actualByStall: Record<number, { total: number; count: number }> = {}
      for (const t of transactionsData || []) {
        if (!actualByStall[t.stall_id]) {
          actualByStall[t.stall_id] = { total: 0, count: 0 }
        }
        actualByStall[t.stall_id].total += Number(t.amount || 0)
        actualByStall[t.stall_id].count += 1
      }

      // Build summaries
      const summaries: StallSummary[] = (stallsData || []).map((stall: any) => {
        const expected = ratesByStall[stall.id] || 0
        const actualData = actualByStall[stall.id]
        const actual = actualData?.total || 0
        return {
          stall_id: stall.id,
          stall_code: stall.code || '',
          stall_number: stall.number || '',
          sector_id: stall.sector_id ?? null,
          sector_name: sectorMap.get(stall.sector_id) || '-',
          owner_name: ownerMap.get(stall.owner_id) || '-',
          expected_amount: expected,
          actual_amount: actual,
          difference: expected - actual,
          transaction_count: actualData?.count || 0
        }
      })

      setStallSummaries(summaries)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data rekonsiliasi')
    } finally {
      setLoading(false)
    }
  }

  const filteredSummaries = showOnlyDiscrepancy
    ? stallSummaries.filter(s => s.difference !== 0)
    : stallSummaries

  const sectorSummaries = selectedSectorId
    ? filteredSummaries.filter(s => String(s.sector_id) === selectedSectorId)
    : filteredSummaries

  const sectors = Array.from(
    new Map(
      stallSummaries
        .filter(s => s.sector_id !== null)
        .map(s => [s.sector_id, s.sector_name])
    ).entries()
  )

  const totalExpected = sectorSummaries.reduce((sum, s) => sum + s.expected_amount, 0)
  const totalActual = sectorSummaries.reduce((sum, s) => sum + s.actual_amount, 0)
  const totalDiff = totalExpected - totalActual
  const totalPages = Math.max(1, Math.ceil(sectorSummaries.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedSummaries = sectorSummaries.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [showOnlyDiscrepancy, selectedSectorId, dateFrom, dateTo, marketIdNum])

  if (!marketId || marketIdNum === 0) {
    return (
      <div className="page-card">
        <h2>✅ Rekonsiliasi</h2>
        <p style={{ color: '#b91c1c' }}>Pilih pasar terlebih dahulu.</p>
      </div>
    )
  }

  return (
    <div className="page-card">
      <h2>✅ Rekonsiliasi</h2>
      <p>Perbandingan antara tagihan retribusi (rates) dengan realisasi transaksi per lapak.</p>

      {/* Summary Cards */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#166534' }}>Total Tagihan</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#166534' }}>Rp {totalExpected.toLocaleString('id-ID')}</div>
        </div>
        <div style={{ padding: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#1e40af' }}>Total Realisasi</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1e40af' }}>Rp {totalActual.toLocaleString('id-ID')}</div>
        </div>
        <div style={{ padding: 16, background: totalDiff === 0 ? '#f0fdf4' : '#fff7ed', border: `1px solid ${totalDiff === 0 ? '#bbf7d0' : '#fed7aa'}`, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: totalDiff === 0 ? '#166534' : '#9a3412' }}>Selisih</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalDiff === 0 ? '#166534' : '#9a3412' }}>
            {totalDiff === 0 ? '✓ LUNAS' : `Rp ${Math.abs(totalDiff).toLocaleString('id-ID')} (${totalDiff > 0 ? 'Kurang' : 'Lebih'})`}
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <label style={{ display: 'grid', gap: 4, fontSize: 14, color: '#555' }}>
          <span>Sektor</span>
          <select
            value={selectedSectorId}
            onChange={(e) => setSelectedSectorId(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          >
            <option value="">Semua sektor</option>
            {sectors.map(([id, name]) => (
              <option key={id} value={id ?? ''}>{name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingBottom: 6 }}>
          <input
            type="checkbox"
            checked={showOnlyDiscrepancy}
            onChange={(e) => setShowOnlyDiscrepancy(e.target.checked)}
          />
          <span style={{ fontSize: 14, color: '#555' }}>Hanya tampilkan yang ada selisih</span>
        </label>
        <button onClick={loadReconciliation} className="btn-secondary" style={{ padding: '6px 16px' }}>
          ↻ Muat Ulang
        </button>
        <ExportButtons
          data={paginatedSummaries.map(s => ({
            'Lapak': s.stall_code || s.stall_number || `#${s.stall_id}`,
            'Sektor': s.sector_name,
            'Pemilik': s.owner_name,
            'Tagihan (Rp)': s.expected_amount,
            'Realisasi (Rp)': s.actual_amount,
            'Selisih (Rp)': s.difference,
            'Transaksi': s.transaction_count,
            'Status': s.difference === 0 ? 'LUNAS' : 'SELISIH'
          }))}
          filename={`Rekonsiliasi_${dateFrom}_${dateTo}`}
          sheetName="Rekonsiliasi"
        />
      </div>

      {error && <div style={{ marginTop: 12, color: '#b91c1c', padding: 8, background: '#fee', borderRadius: 6 }}>{error}</div>}

      {/* Table */}
      <div style={{ marginTop: 20, overflowX: 'auto' }}>
        {loading ? (
          <p>Memuat data rekonsiliasi...</p>
        ) : sectorSummaries.length === 0 ? (
          <p style={{ color: '#6b7280', padding: '20px 0' }}>
            {showOnlyDiscrepancy ? 'Semua lapak sudah lunas! ✅' : 'Belum ada data untuk periode ini.'}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #2D5016' }}>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Lapak</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Sektor</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'left' }}>Pemilik</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right' }}>Tagihan (Rp)</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right' }}>Realisasi (Rp)</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right' }}>Selisih (Rp)</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>Transaksi</th>
                <th style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSummaries.map((s) => {
                const diffColor = s.difference === 0 ? '#166534' : s.difference > 0 ? '#9a3412' : '#1e40af'
                const diffBg = s.difference === 0 ? '#f0fdf4' : s.difference > 0 ? '#fff7ed' : '#f0f9ff'

                return (
                  <tr key={s.stall_id} style={{ borderBottom: '1px solid #e5e7eb', background: s.difference !== 0 ? '#fffbeb' : undefined }}>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', fontWeight: 600 }}>
                      {s.stall_code || s.stall_number || `#${s.stall_id}`}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{s.sector_name}</td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>{s.owner_name}</td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right' }}>
                      Rp {s.expected_amount.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right' }}>
                      Rp {s.actual_amount.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600, color: diffColor, background: diffBg }}>
                      {s.difference === 0 ? '0' : `${s.difference > 0 ? '-' : '+'} Rp ${Math.abs(s.difference).toLocaleString('id-ID')}`}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>{s.transaction_count}</td>
                    <td style={{ padding: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 4,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: s.difference === 0 ? '#C8E6C9' : '#FFCCBC',
                        color: s.difference === 0 ? '#2D5016' : '#D84315'
                      }}>
                        {s.difference === 0 ? 'LUNAS' : 'SELISIH'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {sectorSummaries.length > pageSize && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, color: '#475569' }}>
            Menampilkan {Math.min((safeCurrentPage - 1) * pageSize + 1, sectorSummaries.length)}-{Math.min(safeCurrentPage * pageSize, sectorSummaries.length)} dari {sectorSummaries.length} data
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              style={{
                padding: '8px 16px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: safeCurrentPage === 1 ? 0.5 : 1,
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              ← Sebelumnya
            </button>
            <span style={{ fontSize: 14, color: '#475569', minWidth: 90, textAlign: 'center', fontWeight: 600 }}>
              Halaman {safeCurrentPage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              style={{
                padding: '8px 16px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}