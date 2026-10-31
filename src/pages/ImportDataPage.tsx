import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import {
  buildImportRows,
  buildMarketRows,
  buildRateRows,
  detectImportKind,
  detectMarketHints,
  deriveColumnMap,
  downloadCsv,
  FIELD_LABELS,
  headerLabel,
  parseCsv,
  retributionTypeSpecs,
  type ColumnMap,
  type CsvField,
  type ImportKind,
  type ImportRow,
  type MarketInput,
  type ParsedCsv,
  type RateInput
} from '../lib/csvImport'
import {
  runCsvImport,
  runMarketImport,
  runRateImport,
  runStallImport,
  type ImportSummary
} from '../lib/csvImportRunner'
import '../styles/layout.css'
import './ImportDataPage.css'

interface MarketOption {
  id: number
  code: string | null
  name: string
}

interface FileJob {
  id: string
  fileName: string
  kind: ImportKind
  parsed: ParsedCsv
  mapping: ColumnMap
  stallRows: ImportRow[]
  marketRows: MarketInput[]
  rateRows: RateInput[]
  hintCode: string
  hintName: string
  target: string
  newCode: string
  newName: string
  status: 'ready' | 'running' | 'done' | 'failed'
  phase: string
  summary?: ImportSummary
  error?: string
  showMapping: boolean
}

interface PreviewData {
  columns: string[]
  rows: Array<{ key: number; cells: string[] }>
}

interface StatItem {
  value: number | string
  label: string
  warn?: boolean
}

interface RowProblem {
  line: number
  label: string
  errors: string[]
}

const KIND_LABELS: Record<ImportKind, string> = {
  markets: 'Data pasar',
  stalls: 'Data lapak',
  rates: 'Tarif retribusi',
  combined: 'Pasar + lapak + tarif'
}

const KIND_ORDER: Record<ImportKind, number> = {
  markets: 0,
  stalls: 1,
  rates: 2,
  combined: 3
}

const buildJobId = () =>
  `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const KNOWN_MARKET_FILES = [
  { pattern: /niaga\s*daya/i, code: 'NGD', name: 'Niaga Daya' },
  { pattern: /sawah/i, code: 'SWH', name: 'Sawah' },
  { pattern: /panakkukang/i, code: 'PNK', name: 'Panakkukang' },
  { pattern: /terong/i, code: 'TRG', name: 'Terong' }
]

const marketLabel = (market: MarketOption) =>
  `${market.code ? `${market.code} · ` : ''}${market.name}`

const rowsFor = (kind: ImportKind, parsed: ParsedCsv, mapping: ColumnMap) => {
  if (kind === 'markets') {
    return { stallRows: [] as ImportRow[], marketRows: buildMarketRows(parsed, mapping), rateRows: [] as RateInput[] }
  }
  if (kind === 'rates') {
    const hints = detectMarketHints(parsed, mapping)
    return { stallRows: [] as ImportRow[], marketRows: [] as MarketInput[], rateRows: buildRateRows(parsed, mapping, hints.code) }
  }
  return { stallRows: buildImportRows(parsed, mapping), marketRows: [] as MarketInput[], rateRows: [] as RateInput[] }
}

const readyCount = (job: FileJob) => {
  if (job.kind === 'markets') return job.marketRows.filter((row) => !row.skip).length
  if (job.kind === 'rates') return job.rateRows.filter((row) => !row.skip).length
  return job.stallRows.filter((row) => !row.skip).length
}

const totalCount = (job: FileJob) => {
  if (job.kind === 'markets') return job.marketRows.length
  if (job.kind === 'rates') return job.rateRows.length
  return job.stallRows.length
}

const statsOf = (job: FileJob): StatItem[] => {
  const total = totalCount(job)
  const ready = readyCount(job)
  const base: StatItem[] = [
    { value: total, label: 'Baris data' },
    { value: ready, label: 'Siap diimpor' },
    { value: total - ready, label: 'Dilewati', warn: true }
  ]

  if (job.kind === 'markets') {
    const marketsReady = job.marketRows.filter((row) => !row.skip)
    return [...base, { value: new Set(marketsReady.map((row) => row.city).filter(Boolean)).size, label: 'Kota' }]
  }
  if (job.kind === 'rates') {
    const ratesReady = job.rateRows.filter((row) => !row.skip)
    return [
      ...base,
      { value: new Set(ratesReady.map((row) => row.typeCode)).size, label: 'Jenis' },
      { value: new Set(ratesReady.map((row) => row.stallCode)).size, label: 'Lapak' }
    ]
  }

  const stallsReady = job.stallRows.filter((row) => !row.skip)
  return [
    ...base,
    { value: new Set(stallsReady.map((row) => row.sectorName)).size, label: 'Sektor' },
    { value: new Set(stallsReady.map((row) => row.ownerName)).size, label: 'Pemilik' },
    { value: job.stallRows.filter((row) => row.warnings.length > 0).length, label: 'Peringatan' }
  ]
}

const previewOf = (job: FileJob): PreviewData => {
  if (job.kind === 'markets') {
    return {
      columns: ['Kode', 'Nama', 'Kota', 'Alamat', 'Status'],
      rows: job.marketRows
        .filter((row) => !row.skip)
        .slice(0, 6)
        .map((row) => ({
          key: row.line,
          cells: [row.code, row.name, row.city || '—', row.address || '—', row.status]
        }))
    }
  }
  if (job.kind === 'rates') {
    return {
      columns: ['Kode lapak', 'Jenis', 'Periode', 'Jumlah', 'Kode jenis'],
      rows: job.rateRows
        .filter((row) => !row.skip)
        .slice(0, 6)
        .map((row) => ({
          key: row.line,
          cells: [
            row.stallCode,
            row.typeName,
            row.unit,
            row.amount === null ? '—' : row.amount.toLocaleString('id-ID'),
            row.typeCode
          ]
        }))
    }
  }
  return {
    columns: ['Kode', 'Lokasi', 'Sektor', 'Pemilik', 'Jastem/Sewa', 'Harian', 'Status'],
    rows: job.stallRows
      .filter((row) => !row.skip)
      .slice(0, 6)
      .map((row) => ({
        key: row.line,
        cells: [
          row.stallCode || '—',
          row.stallNumber || '—',
          row.sectorName,
          row.ownerName,
          row.annualAmount === null ? '—' : row.annualAmount.toLocaleString('id-ID'),
          row.dailyAmount === null ? '—' : row.dailyAmount.toLocaleString('id-ID'),
          row.status
        ]
      }))
  }
}

const problemsOf = (job: FileJob): RowProblem[] => {
  if (job.kind === 'markets') {
    return job.marketRows
      .filter((row) => row.errors.length > 0)
      .map((row) => ({ line: row.line, label: row.code, errors: row.errors }))
  }
  if (job.kind === 'rates') {
    return job.rateRows
      .filter((row) => row.errors.length > 0)
      .map((row) => ({ line: row.line, label: row.stallCode, errors: row.errors }))
  }
  return job.stallRows
    .filter((row) => row.errors.length > 0)
    .map((row) => ({ line: row.line, label: row.stallCode, errors: row.errors }))
}

const noticeText = (summary: ImportSummary): string => {
  if (summary.kind === 'markets') {
    return `${summary.marketsCreated} pasar baru, ${summary.marketsUpdated} pasar diperbarui.`
  }
  if (summary.kind === 'stalls') {
    return `${summary.stallsCreated} lapak baru, ${summary.stallsUpdated} lapak diperbarui.`
  }
  if (summary.kind === 'rates') {
    return `${summary.ratesCreated} tarif baru, ${summary.ratesUpdated} tarif diperbarui.`
  }
  return `${summary.importedRows} lapak diproses.`
}

export function ImportDataPage() {
  const [markets, setMarkets] = useState<MarketOption[]>([])
  const [marketsLoading, setMarketsLoading] = useState(true)
  const [jobs, setJobs] = useState<FileJob[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const runningRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadMarkets = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error: loadError } = await supabase
        .from('markets')
        .select('id, code, name')
        .order('name')
      if (loadError) throw loadError
      setMarkets((data || []) as MarketOption[])
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar pasar')
    } finally {
      setMarketsLoading(false)
    }
  }

  useEffect(() => {
    loadMarkets()
  }, [])

  const patchJob = (id: string, patch: Partial<FileJob>) => {
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...patch } : job)))
  }

  const addFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList) return
    const files = Array.from(fileList).filter((file) => /\.csv$/i.test(file.name))
    if (files.length === 0) {
      setError('Pilih berkas CSV (.csv).')
      return
    }

    setError('')
    setNotice('')
    const nextJobs: FileJob[] = []

    for (const file of files) {
      try {
        const text = await file.text()
        const parsed = parseCsv(text)
        const mapping = deriveColumnMap(parsed)
        const kind = detectImportKind(parsed, mapping)
        const built = rowsFor(kind, parsed, mapping)
        const count = kind === 'markets'
          ? built.marketRows.length
          : kind === 'rates'
            ? built.rateRows.length
            : built.stallRows.length

        if (count === 0) {
          setError(`Berkas "${file.name}" tidak memuat baris data yang bisa dibaca.`)
          continue
        }

        const hints = detectMarketHints(parsed, mapping)
        const fileHint = KNOWN_MARKET_FILES.find((item) => item.pattern.test(file.name))
        const hintCode = (hints.code || fileHint?.code || '').toUpperCase()
        const hintName = hints.name || fileHint?.name || ''
        const matched =
          markets.find((market) => (market.code || '').toUpperCase() === hintCode) ||
          markets.find((market) => market.name.toLowerCase() === hintName.toLowerCase())

        const target = kind === 'markets'
          ? 'self'
          : matched
            ? String(matched.id)
            : kind === 'rates'
              ? (hintCode ? 'auto' : '')
              : (hintCode ? 'new' : '')

        nextJobs.push({
          id: buildJobId(),
          fileName: file.name,
          kind,
          parsed,
          mapping,
          stallRows: built.stallRows,
          marketRows: built.marketRows,
          rateRows: built.rateRows,
          hintCode,
          hintName,
          target,
          newCode: hintCode,
          newName: hintName || hintCode,
          status: 'ready',
          phase: '',
          showMapping: false
        })
      } catch (err: any) {
        setError(`Gagal membaca "${file.name}": ${err?.message || 'format tidak dikenali'}`)
      }
    }

    if (nextJobs.length > 0) setJobs((prev) => [...prev, ...nextJobs])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const updateMapping = (jobId: string, field: CsvField, value: string) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job
        const mapping: ColumnMap = { ...job.mapping, [field]: Number(value) }
        return {
          ...job,
          ...rowsFor(job.kind, job.parsed, mapping),
          mapping,
          status: 'ready',
          phase: '',
          summary: undefined,
          error: undefined
        }
      })
    )
  }

  const updateTarget = (jobId: string, value: string) => {
    patchJob(jobId, {
      target: value,
      status: 'ready',
      phase: '',
      summary: undefined,
      error: undefined
    })
  }

  const removeJob = (jobId: string) => {
    if (runningRef.current) return
    setJobs((prev) => prev.filter((job) => job.id !== jobId))
  }

  const isReady = (job: FileJob) => {
    if (job.status === 'running' || job.status === 'done') return false
    if (readyCount(job) === 0) return false
    if (job.kind === 'markets') return true
    if (!job.target) return false
    if (job.kind === 'rates') return job.target === 'auto' ? Boolean(job.hintCode) : true
    if (job.target === 'new' && (!job.newCode.trim() || !job.newName.trim())) return false
    return true
  }

  const runJob = async (job: FileJob) => {
    if (runningRef.current) return
    runningRef.current = true
    setRunning(true)
    setError('')
    setNotice('')

    const targetMarket = markets.find((market) => String(market.id) === job.target)
    const marketCode = (targetMarket?.code || job.newCode || job.hintCode).trim()

    if (job.kind !== 'markets' && !marketCode) {
      patchJob(job.id, {
        status: 'failed',
        phase: 'Gagal',
        error: 'Kode pasar kosong. Pilih pasar yang memiliki kode atau isi kode pasar.'
      })
      runningRef.current = false
      setRunning(false)
      return
    }

    patchJob(job.id, { status: 'running', phase: 'Menyiapkan…', summary: undefined, error: undefined })
    const onProgress = (phase: string) => patchJob(job.id, { phase })

    try {
      const client = getSupabaseClient()
      let summary: ImportSummary

      if (job.kind === 'markets') {
        summary = await runMarketImport(client, { rows: job.marketRows, onProgress })
      } else if (job.kind === 'rates') {
        summary = await runRateImport(client, {
          marketId: job.target === 'auto' ? null : Number(job.target),
          marketCode,
          marketName: targetMarket?.name || '',
          rows: job.rateRows,
          onProgress
        })
      } else if (job.kind === 'stalls') {
        summary = await runStallImport(client, {
          marketId: job.target === 'new' ? null : Number(job.target),
          marketCode,
          marketName: targetMarket?.name || job.newName,
          rows: job.stallRows,
          onProgress
        })
      } else {
        summary = await runCsvImport(client, {
          marketId: job.target === 'new' ? null : Number(job.target),
          marketCode,
          marketName: targetMarket?.name || job.newName,
          rows: job.stallRows,
          typeSpecs: retributionTypeSpecs(
            marketCode,
            headerLabel(job.parsed, job.mapping.annualAmount),
            headerLabel(job.parsed, job.mapping.dailyAmount)
          ),
          onProgress
        })
      }

      patchJob(job.id, { status: 'done', phase: 'Selesai', summary })
      setNotice(`Import "${job.fileName}" selesai: ${noticeText(summary)}`)
      await loadMarkets()
    } catch (err: any) {
      patchJob(job.id, {
        status: 'failed',
        phase: 'Gagal',
        error: err?.message || 'Import gagal'
      })
    } finally {
      runningRef.current = false
      setRunning(false)
    }
  }

  const handleImportAll = async () => {
    const queue = jobs
      .filter(isReady)
      .sort((left, right) => KIND_ORDER[left.kind] - KIND_ORDER[right.kind])
    for (const job of queue) {
      await runJob(job)
    }
  }

  const handleDownloadErrors = (job: FileJob) => {
    if (!job.summary) return
    downloadCsv(
      job.summary.errors.map((item) => ({
        Baris: item.line,
        Kode: item.label,
        Masalah: item.message
      })),
      `import-errors-${job.fileName.replace(/\.csv$/i, '')}.csv`
    )
  }

  return (
    <section className="import-page">
      <div className="section-header">
        <h2>📥 Import Data CSV</h2>
        <p>Pindahkan data pasar, lapak, dan tarif dari aplikasi sebelumnya tanpa input ulang.</p>
      </div>

      <div className="import-alert">
        <strong>Idempoten.</strong> Impor ulang tidak menggandakan data: pasar dicocokkan lewat kode,
        lapak lewat kode lapak, pemilik lewat nama, tarif lewat pasangan lapak + jenis retribusi.
        Data transaksi lama tidak termasuk dalam berkas CSV ini.
      </div>

      <div
        className={`import-upload ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          addFiles(event.dataTransfer.files)
        }}
      >
        <div className="import-upload-icon" aria-hidden="true">📄</div>
        <div>
          <p className="import-upload-title">Tarik berkas CSV ke sini</p>
          <p className="import-upload-hint">
            Jenis berkas dideteksi otomatis: data pasar, data lapak, tarif retribusi, atau format
            gabungan legacy (Sawah, Panakkukang, Terong, Niaga Daya). Bisa pilih beberapa berkas sekaligus.
          </p>
        </div>
        <input
          ref={fileInputRef}
          id="import-csv-input"
          className="import-upload-input"
          type="file"
          accept=".csv,text/csv"
          multiple
          onChange={(event) => addFiles(event.target.files)}
        />
        <label htmlFor="import-csv-input" className="siaga-btn siaga-btn-primary import-upload-button">
          Pilih berkas CSV
        </label>
      </div>

      <p className="import-templates">
        Belum punya berkas? Unduh template:{' '}
        <a href="/templates/contoh-pasar.csv" download>data pasar</a>{' '}
        · <a href="/templates/contoh-lapak.csv" download>data lapak</a>{' '}
        · <a href="/templates/contoh-tarif.csv" download>tarif retribusi</a>
      </p>
      <p className="import-templates">
        Format gabungan lama:{' '}
        <a href="/templates/contoh-import-pasar.csv" download>jastem + retribusi harian</a>{' '}
        · <a href="/templates/contoh-import-sewa.csv" download>sewa tahunan + sewa harian</a>
      </p>

      {marketsLoading && <p className="import-muted">Memuat daftar pasar…</p>}
      {error && <div className="import-alert is-error" role="alert">{error}</div>}
      {notice && <div className="import-alert is-success" role="status">{notice}</div>}

      {jobs.length > 0 && (
        <div className="import-toolbar">
          <span className="import-muted">
            {jobs.length} berkas · {jobs.reduce((sum, job) => sum + readyCount(job), 0)} baris siap
          </span>
          <button
            type="button"
            className="siaga-btn siaga-btn-primary"
            onClick={handleImportAll}
            disabled={running || jobs.filter(isReady).length === 0}
          >
            {running ? 'Sedang mengimpor…' : 'Import semua berkas'}
          </button>
        </div>
      )}

      <div className="import-jobs">
        {jobs.map((job) => {
          const jobStats = statsOf(job)
          const jobProblems = problemsOf(job)
          const preview = previewOf(job)
          const targetMarket = markets.find((market) => String(market.id) === job.target)
          const resolvedMarketCode = (targetMarket?.code || job.newCode || job.hintCode).trim()
          const typeSpecs = retributionTypeSpecs(
            resolvedMarketCode,
            headerLabel(job.parsed, job.mapping.annualAmount),
            headerLabel(job.parsed, job.mapping.dailyAmount)
          )

          return (
            <article key={job.id} className={`import-job is-${job.status}`}>
              <header className="import-job-head">
                <div>
                  <h3 className="import-job-title">📄 {job.fileName}</h3>
                  <p className="import-job-sub">
                    <span className={`import-kind is-${job.kind}`}>{KIND_LABELS[job.kind]}</span> · Header
                    terdeteksi di baris {job.parsed.headerRowIndex + 1} · {job.parsed.headers.length} kolom
                  </p>
                </div>
                <div className="import-job-head-actions">
                  <span className={`import-badge is-${job.status}`}>
                    {job.status === 'ready' && 'Siap'}
                    {job.status === 'running' && 'Berjalan'}
                    {job.status === 'done' && 'Selesai'}
                    {job.status === 'failed' && 'Gagal'}
                  </span>
                  <button
                    type="button"
                    className="import-remove"
                    onClick={() => removeJob(job.id)}
                    disabled={running}
                    aria-label={`Hapus ${job.fileName}`}
                  >
                    ✕
                  </button>
                </div>
              </header>

              <div className="import-stats">
                {jobStats.map((stat) => (
                  <div key={stat.label} className={`import-stat ${stat.warn ? 'is-warn' : ''}`}>
                    <span>{stat.value}</span>
                    <small>{stat.label}</small>
                  </div>
                ))}
              </div>

              {job.kind === 'markets' ? (
                <p className="import-type-note">
                  Berkas ini menambah pasar baru atau memperbarui nama, kota, alamat, dan status
                  pasar yang sudah ada. Pasar dicocokkan lewat kode.
                </p>
              ) : (
                <div className="import-controls">
                  <div className="form-group">
                    <label htmlFor={`target-${job.id}`}>Pasar tujuan</label>
                    <select
                      id={`target-${job.id}`}
                      className="siaga-input"
                      value={job.target}
                      onChange={(event) => updateTarget(job.id, event.target.value)}
                      disabled={job.status === 'running'}
                    >
                      <option value="">— pilih pasar —</option>
                      {markets.map((market) => (
                        <option key={market.id} value={market.id}>
                          {marketLabel(market)}
                        </option>
                      ))}
                      {job.kind === 'rates' ? (
                        job.hintCode && (
                          <option value="auto">+ Kode dari berkas ({job.hintCode})</option>
                        )
                      ) : (
                        <option value="new">+ Buat pasar baru</option>
                      )}
                    </select>
                  </div>

                  {job.kind !== 'rates' && job.target === 'new' && (
                    <>
                      <div className="form-group">
                        <label htmlFor={`code-${job.id}`}>Kode pasar baru</label>
                        <input
                          id={`code-${job.id}`}
                          className="siaga-input"
                          value={job.newCode}
                          onChange={(event) => patchJob(job.id, { newCode: event.target.value.toUpperCase() })}
                          placeholder="mis. NGD"
                          maxLength={10}
                          disabled={job.status === 'running'}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`name-${job.id}`}>Nama pasar baru</label>
                        <input
                          id={`name-${job.id}`}
                          className="siaga-input"
                          value={job.newName}
                          onChange={(event) => patchJob(job.id, { newName: event.target.value })}
                          placeholder="mis. Niaga Daya"
                          disabled={job.status === 'running'}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {job.kind === 'combined' && (
                resolvedMarketCode ? (
                  <p className="import-type-note">
                    Jenis retribusi yang disiapkan: <code>{typeSpecs.annual.code}</code> (tahunan) dan{' '}
                    <code>{typeSpecs.daily.code}</code> (harian).
                  </p>
                ) : (
                  <p className="import-type-note">Pilih pasar atau isi kode pasar untuk melihat jenis retribusi.</p>
                )
              )}

              {job.kind === 'rates' && (
                <p className="import-type-note">
                  Jenis retribusi dibuat otomatis bila belum ada. Kode jenis mengikuti pola{' '}
                  <code>KODE-JENIS</code>, mis. <code>{job.hintCode || 'NGD'}-RETRIBUSI-HARIAN</code>.
                </p>
              )}

              <button
                type="button"
                className="import-mapping-toggle"
                onClick={() => patchJob(job.id, { showMapping: !job.showMapping })}
              >
                {job.showMapping ? '▾' : '▸'} Pemetaan kolom
              </button>

              {job.showMapping && (
                <div className="import-mapping">
                  {FIELD_LABELS.filter((field) => field.kinds.includes(job.kind)).map((field) => (
                    <div key={field.key} className="form-group">
                      <label htmlFor={`map-${field.key}-${job.id}`}>
                        {field.label}
                        {field.hint && <span className="import-field-hint"> ({field.hint})</span>}
                      </label>
                      <select
                        id={`map-${field.key}-${job.id}`}
                        className="siaga-input"
                        value={job.mapping[field.key]}
                        onChange={(event) => updateMapping(job.id, field.key, event.target.value)}
                        disabled={job.status === 'running'}
                      >
                        <option value={-1}>— tidak dipakai —</option>
                        {job.parsed.headers.map((_, index) => (
                          <option key={index} value={index}>
                            {headerLabel(job.parsed, index)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="import-table-wrap">
                <table className="siaga-table import-table">
                  <thead>
                    <tr>
                      {preview.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={`${job.id}-${row.key}`}>
                        {row.cells.map((cell, index) => (
                          <td key={index}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {jobProblems.length > 0 && (
                <div className="import-errors">
                  <strong>{jobProblems.length} baris dilewati:</strong>
                  <ul>
                    {jobProblems.slice(0, 3).map((problem) => (
                      <li key={`${job.id}-err-${problem.line}`}>
                        Baris {problem.line} ({problem.label || 'tanpa kode'}): {problem.errors.join('; ')}
                      </li>
                    ))}
                  </ul>
                  {jobProblems.length > 3 && <p>…dan {jobProblems.length - 3} baris lainnya.</p>}
                </div>
              )}

              <div className="import-actions">
                <button
                  type="button"
                  className="siaga-btn siaga-btn-primary"
                  onClick={() => runJob(job)}
                  disabled={running || !isReady(job)}
                >
                  {job.status === 'running' ? job.phase || 'Mengimpor…' : 'Import ke database'}
                </button>
                {job.status === 'running' && <span className="import-progress">{job.phase}</span>}
                {job.error && <span className="import-error-text" role="alert">{job.error}</span>}
              </div>

              {job.summary && (
                <div className="import-summary">
                  <h4>Ringkasan import</h4>
                  <div className="import-summary-grid">
                    <div>
                      <strong>{job.summary.importedRows}</strong>
                      <span>{job.summary.kind === 'rates' ? 'tarif diimpor' : 'baris diimpor'}</span>
                    </div>
                    <div><strong>{job.summary.skippedRows}</strong><span>baris dilewati</span></div>
                    {(job.summary.kind === 'markets' || job.summary.kind === 'stalls' || job.summary.kind === 'combined') && (
                      <>
                        <div><strong>{job.summary.marketsCreated}</strong><span>pasar baru</span></div>
                        <div><strong>{job.summary.marketsUpdated}</strong><span>pasar diperbarui</span></div>
                      </>
                    )}
                    {(job.summary.kind === 'stalls' || job.summary.kind === 'combined') && (
                      <>
                        <div><strong>{job.summary.sectorsCreated}</strong><span>sektor baru</span></div>
                        <div><strong>{job.summary.ownersCreated}</strong><span>pemilik baru</span></div>
                        <div><strong>{job.summary.stallsCreated}</strong><span>lapak baru</span></div>
                        <div><strong>{job.summary.stallsUpdated}</strong><span>lapak diperbarui</span></div>
                      </>
                    )}
                    {(job.summary.kind === 'rates' || job.summary.kind === 'combined') && (
                      <>
                        <div><strong>{job.summary.typesCreated}</strong><span>jenis baru</span></div>
                        <div><strong>{job.summary.ratesCreated}</strong><span>tarif baru</span></div>
                        <div><strong>{job.summary.ratesUpdated}</strong><span>tarif diperbarui</span></div>
                      </>
                    )}
                  </div>
                  {job.summary.marketCreated && <p>Pasar baru dibuat dari berkas ini.</p>}
                  {job.summary.errors.length > 0 ? (
                    <div className="import-summary-errors">
                      <p>{job.summary.errors.length} masalah tercatat.</p>
                      <button
                        type="button"
                        className="siaga-btn siaga-btn-outline"
                        onClick={() => handleDownloadErrors(job)}
                      >
                        ⬇ Unduh daftar masalah (CSV)
                      </button>
                    </div>
                  ) : (
                    <p className="import-ok">Tidak ada masalah yang tercatat.</p>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default ImportDataPage
