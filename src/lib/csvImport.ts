import Papa from 'papaparse'

/**
 * Import CSV transisi dari aplikasi sebelumnya.
 *
 * Empat format legacy gabungan yang harus didukung:
 * - Sawah/Panakkukang/Terong: header di baris ke-3, nama pasar di kolom tanpa judul.
 * - Terong: satu kolom kosong di depan.
 * - Niaga Daya: lokasi ada di kolom tanpa judul, `KODE LAMA` berisi nomor lama.
 *
 * Selain itu ada tiga format terpisah yang dideteksi otomatis:
 * pasar (markets), lapak (stalls), dan tarif retribusi (rates).
 */

export type CsvField =
  | 'marketCode'
  | 'marketName'
  | 'marketCity'
  | 'marketAddress'
  | 'stallCode'
  | 'stallNumber'
  | 'location'
  | 'legacyCode'
  | 'ownerName'
  | 'annualAmount'
  | 'dailyAmount'
  | 'status'
  | 'typeCode'
  | 'typeName'
  | 'period'
  | 'rateAmount'

export type ImportKind = 'markets' | 'stalls' | 'rates' | 'combined'

export type ColumnMap = Record<CsvField, number>

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
  headerRowIndex: number
}

export interface ImportRow {
  line: number
  stallCode: string
  stallNumber: string
  location: string
  legacyCode: string
  ownerName: string
  annualAmount: number | null
  dailyAmount: number | null
  status: string
  sectorName: string
  errors: string[]
  warnings: string[]
  skip: boolean
}

export interface RetributionTypeSpec {
  code: string
  name: string
  category: string
  unit: string
}

export interface RetributionTypeSpecs {
  annual: RetributionTypeSpec
  daily: RetributionTypeSpec
}

export interface MarketInput {
  line: number
  code: string
  name: string
  city: string
  address: string
  status: string
  errors: string[]
  skip: boolean
}

export interface RateInput {
  line: number
  marketCode: string
  stallCode: string
  typeCode: string
  typeName: string
  unit: string
  category: string
  amount: number | null
  errors: string[]
  skip: boolean
}

export interface MarketHints {
  code: string
  name: string
}

export const FIELD_LABELS: Array<{ key: CsvField; label: string; hint?: string; kinds: ImportKind[] }> = [
  { key: 'marketCode', label: 'Kode pasar', hint: 'penghubung antar berkas', kinds: ['markets', 'stalls', 'rates', 'combined'] },
  { key: 'marketName', label: 'Nama pasar', kinds: ['markets', 'combined'] },
  { key: 'marketCity', label: 'Kota', kinds: ['markets'] },
  { key: 'marketAddress', label: 'Alamat pasar', kinds: ['markets'] },
  { key: 'stallCode', label: 'Kode lapak', hint: 'wajib', kinds: ['stalls', 'rates', 'combined'] },
  { key: 'stallNumber', label: 'Nomor lapak', hint: 'opsional', kinds: ['stalls'] },
  { key: 'location', label: 'Lokasi / nomor lapak', hint: 'asal sektor', kinds: ['stalls', 'combined'] },
  { key: 'legacyCode', label: 'Kode lama', kinds: ['combined'] },
  { key: 'ownerName', label: 'Nama pedagang', hint: 'kosong → placeholder', kinds: ['stalls', 'combined'] },
  { key: 'annualAmount', label: 'Jastem / sewa tahunan', kinds: ['combined'] },
  { key: 'dailyAmount', label: 'Retribusi harian', kinds: ['combined'] },
  { key: 'status', label: 'Status', kinds: ['markets', 'stalls', 'combined'] },
  { key: 'typeName', label: 'Jenis retribusi', hint: 'wajib', kinds: ['rates'] },
  { key: 'typeCode', label: 'Kode jenis', hint: 'otomatis bila kosong', kinds: ['rates'] },
  { key: 'period', label: 'Periode / satuan', hint: 'tahun, hari, bulan', kinds: ['rates'] },
  { key: 'rateAmount', label: 'Jumlah tarif', hint: 'wajib', kinds: ['rates'] }
]

export const EMPTY_COLUMN_MAP: ColumnMap = {
  marketCode: -1,
  marketName: -1,
  marketCity: -1,
  marketAddress: -1,
  stallCode: -1,
  stallNumber: -1,
  location: -1,
  legacyCode: -1,
  ownerName: -1,
  annualAmount: -1,
  dailyAmount: -1,
  status: -1,
  typeCode: -1,
  typeName: -1,
  period: -1,
  rateAmount: -1
}

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '')

const STALL_CODE_HEADERS = new Set(['kodebaru', 'kode', 'kodelapak', 'kodelapakbaru', 'kodestall'])
const OWNER_HEADERS = new Set(['namapedagang', 'pedagang', 'pemilik', 'namapemilik', 'namapemiliklapak'])
const ANNUAL_HEADERS = new Set([
  'jastem',
  'sewatempattahun',
  'sewatahunan',
  'sewatahun',
  'sewatempattahunan'
])
const DAILY_HEADERS = new Set(['retribusiharian', 'sewaharian', 'retribusi', 'sewahari'])
const STATUS_HEADERS = new Set(['status', 'statuslapak', 'keterangan'])
const LOCATION_HEADERS = new Set(['lokasi', 'lokasilapak', 'alamat', 'alamatlapak', 'posisi'])
const LEGACY_HEADERS = new Set(['kodelama', 'kodeold', 'kodelapaklama'])
const MARKET_CODE_HEADERS = new Set(['kodepasar'])
const MARKET_NAME_HEADERS = new Set(['namapasar', 'pasarpasar'])
const MARKET_CITY_HEADERS = new Set(['kota', 'kabupaten', 'kotamadya', 'kotaadministrasi'])
const MARKET_ADDRESS_HEADERS = new Set(['alamatpasar', 'alamatkantor'])
const STALL_NUMBER_HEADERS = new Set(['nomor', 'nomorlapak', 'nolapak', 'nomerlapak'])
const TYPE_CODE_HEADERS = new Set(['kodejenis', 'kodejenisretribusi', 'koderetribusi', 'kodetipe', 'kodetype'])
const TYPE_NAME_HEADERS = new Set(['jenisretribusi', 'namajenis', 'namajenisretribusi', 'jenis', 'namatipe', 'tiperetribusi'])
const PERIOD_HEADERS = new Set(['periode', 'satuan', 'unit', 'rentang'])
const RATE_AMOUNT_HEADERS = new Set(['jumlah', 'tarif', 'nominal', 'amount', 'besaran'])

const HEADER_CONTINUATIONS = new Set([
  'harian',
  'tahunan',
  'tahun',
  'hari',
  'bulanan',
  'retribusi',
  'sewa',
  'jastem',
  'status',
  'nama',
  'kode',
  'no'
])

const LOCATION_VALUE_HINT = /(no\.?\s*\d|blok|kios|kiosk|lods|los\b|ruko|bsmnt|basement|lantai|lt\.?\s*\d|depan|samping|dalam|luar|hmp)/i

const setIfUnset = (
  target: Partial<Record<CsvField, number>>,
  key: CsvField,
  index: number
) => {
  if (target[key] === undefined) target[key] = index
}

const mapHeaderCells = (cells: string[]): Partial<Record<CsvField, number>> => {
  const mapping: Partial<Record<CsvField, number>> = {}
  const hasKodePasar = cells.some((cell) => normalizeHeader(cell) === 'kodepasar')

  cells.forEach((cell, index) => {
    const normalized = normalizeHeader(cell)
    if (!normalized) return

    if (normalized === 'kodepasar') {
      setIfUnset(mapping, 'marketCode', index)
      return
    }
    if (normalized === 'namapasar') {
      setIfUnset(mapping, hasKodePasar ? 'marketName' : 'marketCode', index)
      return
    }
    if (MARKET_CODE_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'marketCode', index)
      return
    }
    if (MARKET_NAME_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'marketName', index)
      return
    }
    if (MARKET_CITY_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'marketCity', index)
      return
    }
    if (MARKET_ADDRESS_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'marketAddress', index)
      return
    }
    if (STALL_NUMBER_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'stallNumber', index)
      return
    }
    if (TYPE_CODE_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'typeCode', index)
      return
    }
    if (TYPE_NAME_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'typeName', index)
      return
    }
    if (PERIOD_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'period', index)
      return
    }
    if (RATE_AMOUNT_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'rateAmount', index)
      return
    }
    if (STALL_CODE_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'stallCode', index)
      return
    }
    if (OWNER_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'ownerName', index)
      return
    }
    if (ANNUAL_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'annualAmount', index)
      return
    }
    if (DAILY_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'dailyAmount', index)
      return
    }
    if (STATUS_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'status', index)
      return
    }
    if (LOCATION_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'location', index)
      return
    }
    if (LEGACY_HEADERS.has(normalized)) {
      setIfUnset(mapping, 'legacyCode', index)
    }
  })

  return mapping
}

const detectHeaderRow = (rows: string[][]): number => {
  let bestIndex = -1
  let bestScore = 0

  rows.slice(0, 20).forEach((row, index) => {
    const recognized = mapHeaderCells(row)
    const score = Object.keys(recognized).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestScore >= 2 ? bestIndex : -1
}

export function parseCsv(rawText: string): ParsedCsv {
  const text = rawText.replace(/^\uFEFF/, '')
  const result = Papa.parse<string[]>(text, { skipEmptyLines: false })
  const allRows = (result.data || []).map((row) =>
    (Array.isArray(row) ? row : []).map((cell) => String(cell ?? '').trim())
  )

  const headerRowIndex = detectHeaderRow(allRows)
  if (headerRowIndex < 0) {
    const width = allRows.reduce((max, row) => Math.max(max, row.length), 0)
    return {
      headers: Array.from({ length: width }, (_, index) => `Kolom ${index + 1}`),
      rows: allRows,
      headerRowIndex: -1
    }
  }

  const headerRow = allRows[headerRowIndex]
  const width = allRows.reduce((max, row) => Math.max(max, row.length), headerRow.length)
  const headers = Array.from({ length: width }, (_, index) => headerRow[index] || '')

  return {
    headers,
    rows: allRows.slice(headerRowIndex + 1),
    headerRowIndex
  }
}

export function headerLabel(parsed: ParsedCsv, index: number): string {
  if (index < 0) return '—'
  const label = parsed.headers[index]?.trim()
  return label ? label : `Kolom ${index + 1}`
}

const sampleColumn = (parsed: ParsedCsv, index: number, limit = 40): string[] => {
  if (index < 0) return []
  const values: string[] = []
  for (const row of parsed.rows) {
    const value = (row[index] || '').trim()
    if (!value) continue
    values.push(value)
    if (values.length >= limit) break
  }
  return values
}

const isHeaderLikeRow = (row: string[]): boolean => {
  const filled = row.map((cell) => cell.trim()).filter(Boolean)
  if (filled.length === 0) return true
  if (filled.length > 2) return false
  return filled.every((cell) => HEADER_CONTINUATIONS.has(normalizeHeader(cell)))
}

const numericRatio = (values: string[]): number => {
  if (values.length === 0) return 0
  const numeric = values.filter((value) => /^\d+$/.test(value.replace(/[.\s]/g, ''))).length
  return numeric / values.length
}

const locateLocationColumn = (
  parsed: ParsedCsv,
  mapped: Partial<Record<CsvField, number>>
): number => {
  if (mapped.location !== undefined) return mapped.location

  const legacyIndex = mapped.legacyCode
  if (legacyIndex !== undefined) {
    const values = sampleColumn(parsed, legacyIndex)
    if (values.length > 0 && numericRatio(values) < 0.5) {
      return legacyIndex
    }
  }

  let bestIndex = -1
  let bestScore = 0
  const columnCount = parsed.headers.length

  for (let index = 0; index < columnCount; index += 1) {
    if (index === mapped.stallCode || index === mapped.ownerName) continue
    if (index === mapped.annualAmount || index === mapped.dailyAmount) continue
    if (index === mapped.marketCode || index === mapped.marketName) continue
    if (index === mapped.marketCity || index === mapped.marketAddress) continue
    if (index === mapped.stallNumber || index === mapped.rateAmount) continue
    if (index === mapped.typeCode || index === mapped.typeName || index === mapped.period) continue
    if (index === mapped.status) continue

    const values = sampleColumn(parsed, index)
    if (values.length === 0) continue
    const score = values.filter((value) => LOCATION_VALUE_HINT.test(value)).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  return bestScore > 0 ? bestIndex : -1
}

const locateStallCodeColumn = (
  parsed: ParsedCsv,
  mapped: Partial<Record<CsvField, number>>
): number => {
  if (mapped.stallCode !== undefined) return mapped.stallCode

  let bestIndex = -1
  let bestScore = 0

  for (let index = 0; index < parsed.headers.length; index += 1) {
    const values = sampleColumn(parsed, index)
    if (values.length === 0) continue
    const score = values.filter((value) => /^[A-Za-z]{2,6}[-.]\d+/i.test(value)).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  return bestScore > 0 ? bestIndex : -1
}

const locateMarketNameColumn = (
  mapped: Partial<Record<CsvField, number>>
): number => {
  return mapped.marketName ?? -1
}

export function deriveColumnMap(parsed: ParsedCsv): ColumnMap {
  const mapped = mapHeaderCells(parsed.headers)
  const mapping: ColumnMap = { ...EMPTY_COLUMN_MAP }

  const locationIndex = locateLocationColumn(parsed, mapped)
  const stallCodeIndex = locateStallCodeColumn(parsed, mapped)

  mapping.stallCode = stallCodeIndex
  mapping.ownerName = mapped.ownerName ?? -1
  mapping.annualAmount = mapped.annualAmount ?? -1
  mapping.dailyAmount = mapped.dailyAmount ?? -1
  mapping.status = mapped.status ?? -1
  mapping.marketCode = mapped.marketCode ?? -1
  mapping.marketCity = mapped.marketCity ?? -1
  mapping.marketAddress = mapped.marketAddress ?? -1
  mapping.stallNumber = mapped.stallNumber ?? -1
  mapping.location = locationIndex
  mapping.legacyCode = mapped.legacyCode !== undefined && mapped.legacyCode !== locationIndex
    ? mapped.legacyCode
    : -1
  mapping.typeCode = mapped.typeCode ?? -1
  mapping.typeName = mapped.typeName ?? -1
  mapping.period = mapped.period ?? -1
  mapping.rateAmount = mapped.rateAmount ?? -1
  mapping.marketName = locateMarketNameColumn(mapped)

  if (mapping.marketName < 0 && mapping.marketCode >= 0) {
    const candidates = [mapping.marketCode + 1, mapping.marketCode - 1]
    for (const candidate of candidates) {
      if (candidate < 0 || candidate >= parsed.headers.length) continue
      if ((parsed.headers[candidate] || '').trim() !== '') continue
      if (candidate === mapping.stallCode || candidate === mapping.location) continue
      const values = sampleColumn(parsed, candidate)
      if (values.length === 0) continue
      const looksLikeLocation = values.some((value) => LOCATION_VALUE_HINT.test(value))
      const mostlyNumeric = numericRatio(values) >= 0.5
      if (!looksLikeLocation && !mostlyNumeric) {
        mapping.marketName = candidate
        break
      }
    }
  }

  return mapping
}

const cellAt = (row: string[], index: number): string =>
  index >= 0 ? (row[index] || '').trim() : ''

export const parseAmount = (raw: string): number | null => {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  const value = Number(digits)
  return Number.isFinite(value) ? value : null
}

export function deriveSector(location: string, legacyCode = ''): string {
  const trimmed = location.trim()
  const legacy = legacyCode.trim()

  if (!trimmed && !legacy) return 'Tanpa Blok'

  if (/^Blok\s+/i.test(trimmed)) {
    return trimmed.replace(/\s+No\.?\s*.*$/i, '').trim() || 'Tanpa Blok'
  }

  const kios = legacy.match(/^NDY\.K\.([A-Z])/i)
  if (kios) return `Kios ${kios[1].toUpperCase()}`

  const ruko = legacy.match(/^NDY\.R\.([IVX]+[A-Z])/i)
  if (ruko) return `Ruko ${ruko[1].toUpperCase()}`

  const stripped = trimmed.replace(/\s+No\.?\s*.*$/i, '').trim()
  return stripped || trimmed || 'Tanpa Blok'
}

export function deriveStallNumber(
  location: string,
  legacyCode: string,
  fallback: string,
  explicit = ''
): string {
  if (explicit.trim()) return explicit.trim()

  const trimmed = location.trim()
  const legacy = legacyCode.trim()
  const niagaStyle = /^NDY[.\s]/i.test(legacy) || /^Blok\s+/i.test(trimmed)

  if (niagaStyle) {
    const noMatch = trimmed.match(/No\.?\s*.*$/i)
    if (noMatch) return noMatch[0].trim()
    if (trimmed) return `No. ${trimmed}`
    if (legacy) return `No. ${legacy}`
  }

  return trimmed || legacy || fallback
}

export function retributionTypeSpecs(
  marketCode: string,
  annualHeader: string,
  dailyHeader: string
): RetributionTypeSpecs {
  const code = marketCode.trim().toUpperCase() || 'PASAR'
  const annual = normalizeHeader(annualHeader)
  const daily = normalizeHeader(dailyHeader)

  const annualSpec: RetributionTypeSpec = annual.includes('jastem')
    ? { code: `${code}-JASTEM`, name: 'Jastem', category: 'SEWA', unit: 'TAHUN' }
    : { code: `${code}-SEWA-TAHUNAN`, name: 'Sewa Tempat Tahunan', category: 'SEWA', unit: 'TAHUN' }

  const dailySpec: RetributionTypeSpec = daily.includes('retribusi')
    ? { code: `${code}-RETRIBUSI-HARIAN`, name: 'Retribusi Harian', category: 'RETRIBUSI', unit: 'HARI' }
    : { code: `${code}-SEWA-HARIAN`, name: 'Sewa Tempat Harian', category: 'SEWA', unit: 'HARI' }

  return { annual: annualSpec, daily: dailySpec }
}

const normalizeStatus = (raw: string): string => {
  const value = raw.trim()
  if (!value) return 'AKTIF'
  const lower = value.toLowerCase()
  if (lower === 'aktif' || lower === 'active') return 'AKTIF'
  return value.toUpperCase()
}

export function buildImportRows(parsed: ParsedCsv, mapping: ColumnMap): ImportRow[] {
  const rows: ImportRow[] = []
  const seenCodes = new Map<string, number>()

  parsed.rows.forEach((row, index) => {
    if (isHeaderLikeRow(row)) return

    const stallCode = cellAt(row, mapping.stallCode)
    const location = cellAt(row, mapping.location)
    const legacyCode = cellAt(row, mapping.legacyCode)
    const ownerName = cellAt(row, mapping.ownerName)
    const annualRaw = cellAt(row, mapping.annualAmount)
    const dailyRaw = cellAt(row, mapping.dailyAmount)
    const statusRaw = cellAt(row, mapping.status)

    if (!stallCode && !ownerName && !location && !annualRaw && !dailyRaw) return

    const line = parsed.headerRowIndex + index + 2
    const errors: string[] = []
    const warnings: string[] = []

    if (!stallCode) {
      errors.push('Kode lapak kosong')
    } else if (normalizeHeader(stallCode) === 'no' || STALL_CODE_HEADERS.has(normalizeHeader(stallCode))) {
      errors.push('Baris terlihat seperti header, bukan data')
    }

    const displayLocation = location || legacyCode || stallCode
    const resolvedOwner = ownerName || `Belum diisi - ${stallCode || line}`
    if (!ownerName) {
      warnings.push('Nama pedagang kosong, memakai placeholder')
    }

    const codeKey = stallCode.toLowerCase()
    if (stallCode) {
      const firstLine = seenCodes.get(codeKey)
      if (firstLine !== undefined) {
        errors.push(`Kode lapak duplikat dalam file (sudah ada di baris ${firstLine})`)
      } else {
        seenCodes.set(codeKey, line)
      }
    }

    rows.push({
      line,
      stallCode,
      stallNumber: deriveStallNumber(location, legacyCode, stallCode, cellAt(row, mapping.stallNumber)),
      location: displayLocation,
      legacyCode,
      ownerName: resolvedOwner,
      annualAmount: parseAmount(annualRaw),
      dailyAmount: parseAmount(dailyRaw),
      status: normalizeStatus(statusRaw),
      sectorName: deriveSector(location, legacyCode),
      errors,
      warnings,
      skip: errors.length > 0
    })
  })

  return rows
}

export function detectImportKind(_parsed: ParsedCsv, mapping: ColumnMap): ImportKind {
  const hasCombinedRate = mapping.annualAmount >= 0 || mapping.dailyAmount >= 0
  const hasSplitRate = mapping.typeName >= 0 || mapping.typeCode >= 0 || mapping.rateAmount >= 0

  if (hasCombinedRate) return 'combined'
  if (hasSplitRate) return 'rates'
  if (mapping.stallCode >= 0) return 'stalls'
  if (mapping.marketName >= 0 || mapping.marketCity >= 0 || mapping.marketCode >= 0) return 'markets'
  return 'combined'
}

export function buildMarketRows(parsed: ParsedCsv, mapping: ColumnMap): MarketInput[] {
  const rows: MarketInput[] = []
  const seenCodes = new Map<string, number>()

  parsed.rows.forEach((row, index) => {
    if (isHeaderLikeRow(row)) return

    const code = cellAt(row, mapping.marketCode)
    const name = cellAt(row, mapping.marketName)
    const city = cellAt(row, mapping.marketCity)
    const address = cellAt(row, mapping.marketAddress)
    const statusRaw = cellAt(row, mapping.status)

    if (!code && !name) return
    if (normalizeHeader(code) === 'kodepasar' || normalizeHeader(name) === 'namapasar') return

    const line = parsed.headerRowIndex + index + 2
    const errors: string[] = []

    if (!code) errors.push('Kode pasar kosong')
    if (!name) errors.push('Nama pasar kosong')

    if (code) {
      const key = code.toLowerCase()
      const firstLine = seenCodes.get(key)
      if (firstLine !== undefined) {
        errors.push(`Kode pasar duplikat dalam file (sudah ada di baris ${firstLine})`)
      } else {
        seenCodes.set(key, line)
      }
    }

    rows.push({
      line,
      code: code.toUpperCase(),
      name,
      city,
      address,
      status: normalizeStatus(statusRaw),
      errors,
      skip: errors.length > 0
    })
  })

  return rows
}

const PERIOD_UNITS: Record<string, string> = {
  tahun: 'TAHUN',
  tahunan: 'TAHUN',
  thn: 'TAHUN',
  tahunnya: 'TAHUN',
  bulan: 'BULAN',
  bulanan: 'BULAN',
  bln: 'BULAN',
  hari: 'HARI',
  harian: 'HARI',
  hr: 'HARI',
  perhari: 'HARI',
  minggu: 'MINGGU',
  mingguan: 'MINGGU'
}

const inferUnit = (raw: string, typeName: string): string => {
  const key = normalizeHeader(raw)
  if (PERIOD_UNITS[key]) return PERIOD_UNITS[key]

  const name = normalizeHeader(typeName)
  if (name.includes('tahun') || name.includes('jastem')) return 'TAHUN'
  if (name.includes('bulan')) return 'BULAN'
  if (name.includes('minggu')) return 'MINGGU'
  return 'HARI'
}

const deriveCategory = (typeName: string, unit: string): string => {
  const name = normalizeHeader(typeName)
  if (name.includes('jastem') || name.includes('sewa')) return 'SEWA'
  if (name.includes('retribusi')) return 'RETRIBUSI'
  return unit === 'TAHUN' || unit === 'BULAN' ? 'SEWA' : 'RETRIBUSI'
}

export function deriveTypeCode(marketCode: string, typeName: string, unit: string): string {
  const prefix = marketCode.trim().toUpperCase() || 'PASAR'
  const slug = typeName
    .trim()
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${prefix}-${slug || `TARIF-${unit || 'HARIAN'}`}`
}

export function buildRateRows(
  parsed: ParsedCsv,
  mapping: ColumnMap,
  fallbackMarketCode = ''
): RateInput[] {
  const rows: RateInput[] = []
  const seenKeys = new Map<string, number>()

  parsed.rows.forEach((row, index) => {
    if (isHeaderLikeRow(row)) return

    const marketRaw = cellAt(row, mapping.marketCode) || fallbackMarketCode
    const stallCode = cellAt(row, mapping.stallCode)
    const typeNameRaw = cellAt(row, mapping.typeName)
    const typeCodeRaw = cellAt(row, mapping.typeCode)
    const periodRaw = cellAt(row, mapping.period)
    const amountRaw = cellAt(row, mapping.rateAmount)

    if (!stallCode && !typeNameRaw && !typeCodeRaw && !amountRaw) return
    if (normalizeHeader(stallCode) === 'kodelapak' || normalizeHeader(typeNameRaw) === 'jenisretribusi') return

    const marketCode = marketRaw.trim().toUpperCase()
    const line = parsed.headerRowIndex + index + 2
    const errors: string[] = []

    if (!marketCode) errors.push('Kode pasar kosong')
    if (!stallCode) errors.push('Kode lapak kosong')
    if (!typeNameRaw && !typeCodeRaw) errors.push('Jenis retribusi kosong')

    const amount = parseAmount(amountRaw)
    if (amount === null) errors.push('Jumlah tarif kosong atau tidak valid')

    const typeName = typeNameRaw || typeCodeRaw
    const unit = inferUnit(periodRaw, typeName)
    const typeCode = (typeCodeRaw || deriveTypeCode(marketCode, typeName, unit)).toUpperCase()

    if (stallCode && typeCode) {
      const key = `${stallCode.toLowerCase()}:${typeCode}`
      const firstLine = seenKeys.get(key)
      if (firstLine !== undefined) {
        errors.push(`Tarif ganda untuk lapak dan jenis yang sama (sudah ada di baris ${firstLine})`)
      } else {
        seenKeys.set(key, line)
      }
    }

    rows.push({
      line,
      marketCode,
      stallCode,
      typeCode,
      typeName,
      unit,
      category: deriveCategory(typeName, unit),
      amount,
      errors,
      skip: errors.length > 0
    })
  })

  return rows
}

const modeOf = (values: string[]): string => {
  const counts = new Map<string, number>()
  for (const value of values) {
    const key = value.trim()
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

export function detectMarketHints(parsed: ParsedCsv, mapping: ColumnMap): MarketHints {
  const codeValues = parsed.rows.map((row) => cellAt(row, mapping.marketCode))
  const nameValues = parsed.rows.map((row) => cellAt(row, mapping.marketName))
  return {
    code: modeOf(codeValues).toUpperCase(),
    name: modeOf(nameValues)
  }
}

export function downloadCsv(data: Array<Record<string, unknown>>, filename: string): void {
  if (data.length === 0) return
  const csv = Papa.unparse(data, { header: true })
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
