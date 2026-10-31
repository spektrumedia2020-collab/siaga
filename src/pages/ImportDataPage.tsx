import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import {
  buildImportRows,
  detectMarketHints,
  deriveColumnMap,
  downloadCsv,
  FIELD_LABELS,
  headerLabel,
  parseCsv,
  retributionTypeSpecs,
  type ColumnMap,
  type CsvField,
  type ImportRow,
  type ParsedCsv
} from '../lib/csvImport'
import { runCsvImport, type ImportSummary } from '../lib/csvImportRunner'
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
  parsed: ParsedCsv
  mapping: ColumnMap
  rows: ImportRow[]
  target: string
  newCode: string
  newName: string
  status: 'ready' | 'running' | 'done' | 'failed'
  phase: string
  summary?: ImportSummary
  error?: string
  showMapping: boolean
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
        const rows = buildImportRows(parsed, mapping)
        if (rows.length === 0) {
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

        nextJobs.push({
          id: buildJobId(),
          fileName: file.name,
          parsed,
          mapping,
          rows,
          target: matched ? String(matched.id) : hintCode ? 'new' : '',
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
          mapping,
          rows: buildImportRows(job.parsed, mapping),
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
    if (!job.target) return false
    if (job.target === 'new' && (!job.newCode.trim() || !job.newName.trim())) return false
    return job.rows.some((row) => !row.skip)
  }

  const runJob = async (job: FileJob) => {
    if (runningRef.current) return
    runningRef.current = true
    setRunning(true)
    setError('')
    setNotice('')

    const targetMarket = markets.find((market) => String(market.id) === job.target)
    const marketCode = (targetMarket?.code || job.newCode).trim()

    if (!marketCode) {
      patchJob(job.id, {
        status: 'failed',
        phase: 'Gagal',
        error: 'Kode pasar kosong. Pilih pasar yang memiliki kode atau isi kode pasar baru.'
      })
      runningRef.current = false
      setRunning(false)
      return
    }

    const typeSpecs = retributionTypeSpecs(
      marketCode,
      headerLabel(job.parsed, job.mapping.annualAmount),
      headerLabel(job.parsed, job.mapping.dailyAmount)
    )

    patchJob(job.id, { status: 'running', phase: 'Menyiapkan…', summary: undefined, error: undefined })

    try {
      const summary = await runCsvImport(getSupabaseClient(), {
        marketId: job.target === 'new' ? null : Number(job.target),
        marketCode,
        marketName: targetMarket?.name || job.newName,
        rows: job.rows,
        typeSpecs,
        onProgress: (phase) => patchJob(job.id, { phase })
      })
      patchJob(job.id, { status: 'done', phase: 'Selesai', summary })
      setNotice(`Import "${job.fileName}" selesai: ${summary.importedRows} lapak diproses.`)
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
    const queue = jobs.filter(isReady)
    for (const job of queue) {
      await runJob(job)
    }
  }

  const handleDownloadErrors = (job: FileJob) => {
    if (!job.summary) return
    downloadCsv(
      job.summary.errors.map((item) => ({
        Baris: item.line,
        'Kode lapak': item.stallCode,
        Masalah: item.message
      })),
      `import-errors-${job.fileName.replace(/\.csv$/i, '')}.csv`
    )
  }

  const stats = (job: FileJob) => {
    const ready = job.rows.filter((row) => !row.skip)
    return {
      total: job.rows.length,
      ready: ready.length,
      invalid: job.rows.length - ready.length,
      warnings: job.rows.filter((row) => row.warnings.length > 0).length,
      sectors: new Set(ready.map((row) => row.sectorName)).size,
      owners: new Set(ready.map((row) => row.ownerName)).size
    }
  }

  const previewRows = (job: FileJob) => job.rows.filter((row) => !row.skip).slice(0, 6)
  const rowErrors = (job: FileJob) => job.rows.filter((row) => row.errors.length > 0)

  return (
    <section className="import-page">
      <div className="section-header">
        <h2>📥 Import Data CSV</h2>
        <p>Pindahkan data lapak dari aplikasi sebelumnya tanpa input ulang.</p>
      </div>

      <div className="import-alert">
        <strong>Idempoten.</strong> Impor ulang tidak menggandakan data: lapak dicocokkan lewat
        kode lapak, pemilik lewat nama, tarif lewat pasangan lapak + jenis retribusi. Data transaksi
        lama tidak termasuk dalam berkas CSV ini.
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
            Format legacy didukung otomatis: Sawah, Panakkukang, Terong, dan Niaga Daya.
            Bisa pilih beberapa berkas sekaligus.
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
        <a href="/templates/contoh-import-pasar.csv" download>
          jastem + retribusi harian
        </a>{' '}
        ·{' '}
        <a href="/templates/contoh-import-sewa.csv" download>
          sewa tahunan + sewa harian
        </a>
      </p>

      {marketsLoading && <p className="import-muted">Memuat daftar pasar…</p>}
      {error && <div className="import-alert is-error" role="alert">{error}</div>}
      {notice && <div className="import-alert is-success" role="status">{notice}</div>}

      {jobs.length > 0 && (
        <div className="import-toolbar">
          <span className="import-muted">
            {jobs.length} berkas ·{' '}
            {jobs.reduce((sum, job) => sum + job.rows.filter((row) => !row.skip).length, 0)} baris siap
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
          const jobStats = stats(job)
          const jobErrors = rowErrors(job)
          const targetMarket = markets.find((market) => String(market.id) === job.target)
          const resolvedMarketCode = (targetMarket?.code || job.newCode).trim()
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
                    Header terdeteksi di baris {job.parsed.headerRowIndex + 1} · {job.parsed.headers.length} kolom
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
                <div className="import-stat"><span>{jobStats.total}</span><small>Baris data</small></div>
                <div className="import-stat"><span>{jobStats.ready}</span><small>Siap diimpor</small></div>
                <div className="import-stat is-warn"><span>{jobStats.invalid}</span><small>Dilewati</small></div>
                <div className="import-stat"><span>{jobStats.sectors}</span><small>Sektor</small></div>
                <div className="import-stat"><span>{jobStats.owners}</span><small>Pemilik</small></div>
                <div className="import-stat"><span>{jobStats.warnings}</span><small>Peringatan</small></div>
              </div>

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
                    <option value="new">+ Buat pasar baru</option>
                  </select>
                </div>

                {job.target === 'new' && (
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

              {resolvedMarketCode ? (
                <p className="import-type-note">
                  Jenis retribusi yang disiapkan: <code>{typeSpecs.annual.code}</code> (tahunan) dan{' '}
                  <code>{typeSpecs.daily.code}</code> (harian).
                </p>
              ) : (
                <p className="import-type-note">Pilih pasar atau isi kode pasar untuk melihat jenis retribusi.</p>
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
                  {FIELD_LABELS.map((field) => (
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
                      <th>Kode</th>
                      <th>Lokasi</th>
                      <th>Sektor</th>
                      <th>Pemilik</th>
                      <th>Jastem/Sewa</th>
                      <th>Harian</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows(job).map((row) => (
                      <tr key={`${job.id}-${row.line}`}>
                        <td>{row.stallCode || '—'}</td>
                        <td>{row.stallNumber || '—'}</td>
                        <td>{row.sectorName}</td>
                        <td>{row.ownerName}</td>
                        <td>{row.annualAmount === null ? '—' : row.annualAmount.toLocaleString('id-ID')}</td>
                        <td>{row.dailyAmount === null ? '—' : row.dailyAmount.toLocaleString('id-ID')}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {jobErrors.length > 0 && (
                <div className="import-errors">
                  <strong>{jobErrors.length} baris dilewati:</strong>
                  <ul>
                    {jobErrors.slice(0, 3).map((row) => (
                      <li key={`${job.id}-err-${row.line}`}>
                        Baris {row.line} ({row.stallCode || 'tanpa kode'}): {row.errors.join('; ')}
                      </li>
                    ))}
                  </ul>
                  {jobErrors.length > 3 && <p>…dan {jobErrors.length - 3} baris lainnya.</p>}
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
                    <div><strong>{job.summary.importedRows}</strong><span>baris diimpor</span></div>
                    <div><strong>{job.summary.skippedRows}</strong><span>baris dilewati</span></div>
                    <div><strong>{job.summary.sectorsCreated}</strong><span>sektor baru</span></div>
                    <div><strong>{job.summary.ownersCreated}</strong><span>pemilik baru</span></div>
                    <div><strong>{job.summary.stallsCreated}</strong><span>lapak baru</span></div>
                    <div><strong>{job.summary.stallsUpdated}</strong><span>lapak diperbarui</span></div>
                    <div><strong>{job.summary.ratesCreated}</strong><span>tarif baru</span></div>
                    <div><strong>{job.summary.ratesUpdated}</strong><span>tarif diperbarui</span></div>
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
