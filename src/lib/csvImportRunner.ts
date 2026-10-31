import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ImportKind,
  ImportRow,
  MarketInput,
  RateInput,
  RetributionTypeSpec,
  RetributionTypeSpecs
} from './csvImport'

export interface ImportMarketInput {
  marketId: number | null
  marketCode: string
  marketName: string
}

export interface ImportError {
  line: number
  label: string
  message: string
}

export interface ImportSummary {
  kind: ImportKind
  totalRows: number
  importedRows: number
  skippedRows: number
  warnings: number
  marketCreated: boolean
  marketsCreated: number
  marketsUpdated: number
  sectorsCreated: number
  ownersCreated: number
  stallsCreated: number
  stallsUpdated: number
  typesCreated: number
  ratesCreated: number
  ratesUpdated: number
  errors: ImportError[]
}

export interface RunImportOptions extends ImportMarketInput {
  rows: ImportRow[]
  typeSpecs: RetributionTypeSpecs
  onProgress?: (phase: string) => void
}

export interface RunStallImportOptions extends ImportMarketInput {
  rows: ImportRow[]
  onProgress?: (phase: string) => void
}

export interface RunMarketImportOptions {
  rows: MarketInput[]
  onProgress?: (phase: string) => void
}

export interface RunRateImportOptions extends ImportMarketInput {
  rows: RateInput[]
  onProgress?: (phase: string) => void
}

const PAGE_SIZE = 500
const CHUNK_SIZE = 400
const UPDATE_CONCURRENCY = 8

const nameKey = (value: string) => value.trim().toLowerCase()

const errorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(errorMessage(error))
    const page = data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, limit = UPDATE_CONCURRENCY) {
  let cursor = 0
  const size = Math.min(limit, items.length)
  const runners = Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index])
    }
  })
  await Promise.all(runners)
}

interface SummarySource {
  line: number
  label: string
  skip: boolean
  errors: string[]
  warnings?: string[]
}

function baseSummary(kind: ImportKind, rows: SummarySource[]): ImportSummary {
  return {
    kind,
    totalRows: rows.length,
    importedRows: 0,
    skippedRows: rows.filter((row) => row.skip).length,
    warnings: rows.filter((row) => (row.warnings?.length ?? 0) > 0).length,
    marketCreated: false,
    marketsCreated: 0,
    marketsUpdated: 0,
    sectorsCreated: 0,
    ownersCreated: 0,
    stallsCreated: 0,
    stallsUpdated: 0,
    typesCreated: 0,
    ratesCreated: 0,
    ratesUpdated: 0,
    errors: rows
      .filter((row) => row.skip)
      .map((row) => ({ line: row.line, label: row.label, message: row.errors.join('; ') }))
  }
}

const stallSources = (rows: ImportRow[]): SummarySource[] =>
  rows.map((row) => ({
    line: row.line,
    label: row.stallCode,
    skip: row.skip,
    errors: row.errors,
    warnings: row.warnings
  }))

const marketSources = (rows: MarketInput[]): SummarySource[] =>
  rows.map((row) => ({ line: row.line, label: row.code, skip: row.skip, errors: row.errors }))

const rateSources = (rows: RateInput[]): SummarySource[] =>
  rows.map((row) => ({ line: row.line, label: row.stallCode, skip: row.skip, errors: row.errors }))

interface MarketRow {
  id: number
  code: string | null
  name: string
}

async function resolveMarket(
  client: SupabaseClient,
  input: ImportMarketInput
): Promise<{ market: MarketRow; created: boolean }> {
  if (input.marketId) {
    const { data, error } = await client
      .from('markets')
      .select('id, code, name')
      .eq('id', input.marketId)
      .single()
    if (error) throw new Error(`Pasar tujuan tidak ditemukan: ${error.message}`)
    return { market: data as MarketRow, created: false }
  }

  const code = input.marketCode.trim()
  const name = input.marketName.trim()
  if (!code) throw new Error('Kode pasar wajib diisi untuk membuat pasar baru.')
  if (!name) throw new Error('Nama pasar wajib diisi untuk membuat pasar baru.')

  const { data: byCode, error: lookupError } = await client
    .from('markets')
    .select('id, code, name')
    .ilike('code', code)
    .maybeSingle()

  if (lookupError) throw new Error(`Gagal mencari pasar: ${lookupError.message}`)
  if (byCode) return { market: byCode as MarketRow, created: false }

  const { data: created, error: insertError } = await client
    .from('markets')
    .insert([{ code, name, city: 'Makassar', status: 'AKTIF' }])
    .select('id, code, name')
    .single()

  if (insertError) throw new Error(`Gagal membuat pasar "${name}": ${insertError.message}`)
  return { market: created as MarketRow, created: true }
}

async function requireMarket(client: SupabaseClient, input: ImportMarketInput): Promise<MarketRow> {
  if (input.marketId) {
    const { data, error } = await client
      .from('markets')
      .select('id, code, name')
      .eq('id', input.marketId)
      .single()
    if (error) throw new Error(`Pasar tujuan tidak ditemukan: ${error.message}`)
    return data as MarketRow
  }

  const code = input.marketCode.trim()
  if (!code) throw new Error('Pilih pasar tujuan untuk impor tarif.')

  const { data, error } = await client
    .from('markets')
    .select('id, code, name')
    .ilike('code', code)
    .maybeSingle()

  if (error) throw new Error(`Gagal mencari pasar: ${error.message}`)
  if (!data) {
    throw new Error(`Pasar dengan kode "${code}" belum ada. Impor CSV pasar dan lapak terlebih dahulu.`)
  }
  return data as MarketRow
}

async function ensureSectors(
  client: SupabaseClient,
  marketId: number,
  rows: ImportRow[],
  summary: ImportSummary
): Promise<Map<string, number>> {
  const sectorRows = await fetchAll<{ id: number; name: string }>((from, to) =>
    client
      .from('market_sectors')
      .select('id, name')
      .eq('market_id', marketId)
      .order('id')
      .range(from, to)
  )

  const sectorMap = new Map<string, number>()
  for (const sector of sectorRows) {
    const key = nameKey(sector.name)
    if (!sectorMap.has(key)) sectorMap.set(key, sector.id)
  }

  const wantedSectors = new Map<string, string>()
  for (const row of rows) {
    const name = row.sectorName.trim()
    if (!name) continue
    const key = nameKey(name)
    if (!sectorMap.has(key) && !wantedSectors.has(key)) wantedSectors.set(key, name)
  }

  for (const sectorName of wantedSectors.values()) {
    const { data, error } = await client
      .from('market_sectors')
      .insert([{ market_id: marketId, name: sectorName }])
      .select('id, name')
      .single()
    if (error) throw new Error(`Gagal membuat sektor "${sectorName}": ${error.message}`)
    sectorMap.set(nameKey(data.name), data.id)
    summary.sectorsCreated += 1
  }

  return sectorMap
}

async function ensureOwners(
  client: SupabaseClient,
  rows: ImportRow[],
  summary: ImportSummary
): Promise<Map<string, number>> {
  const ownerRows = await fetchAll<{ id: number; name: string }>((from, to) =>
    client.from('stall_owners').select('id, name').order('id').range(from, to)
  )
  const ownerMap = new Map<string, number>()
  for (const owner of ownerRows) {
    const key = nameKey(owner.name || '')
    if (key && !ownerMap.has(key)) ownerMap.set(key, owner.id)
  }

  const missingOwnerNames = new Map<string, string>()
  for (const row of rows) {
    const name = row.ownerName.trim()
    const key = nameKey(name)
    if (!ownerMap.has(key) && !missingOwnerNames.has(key)) missingOwnerNames.set(key, name)
  }
  const missingOwners = Array.from(missingOwnerNames.values())

  for (let index = 0; index < missingOwners.length; index += CHUNK_SIZE) {
    const chunk = missingOwners.slice(index, index + CHUNK_SIZE)
    const { data, error } = await client
      .from('stall_owners')
      .insert(chunk.map((name) => ({ name })))
      .select('id, name')

    if (!error) {
      for (const owner of data || []) {
        const key = nameKey(owner.name)
        if (ownerMap.has(key)) continue
        ownerMap.set(key, owner.id)
        summary.ownersCreated += 1
      }
      continue
    }

    for (const name of chunk) {
      const { data: single, error: singleError } = await client
        .from('stall_owners')
        .insert([{ name }])
        .select('id, name')
        .single()
      if (singleError) throw new Error(`Gagal membuat pemilik "${name}": ${singleError.message}`)
      const key = nameKey(single.name)
      if (ownerMap.has(key)) continue
      ownerMap.set(key, single.id)
      summary.ownersCreated += 1
    }
  }

  return ownerMap
}

async function upsertStalls(
  client: SupabaseClient,
  marketId: number,
  rows: ImportRow[],
  sectorMap: Map<string, number>,
  ownerMap: Map<string, number>,
  summary: ImportSummary,
  progress: (phase: string) => void
): Promise<{ stallMap: Map<string, number>; failedLines: Set<number> }> {
  progress('Memeriksa lapak yang sudah ada…')
  const stallRows = await fetchAll<{
    id: number
    code: string | null
    number: string | null
    qr_code: string | null
    legacy_code: string | null
    status: string | null
    sector_id: number | null
    owner_id: number | null
  }>((from, to) =>
    client
      .from('stalls')
      .select('id, code, number, qr_code, legacy_code, status, sector_id, owner_id')
      .eq('market_id', marketId)
      .order('id')
      .range(from, to)
  )

  const stallMap = new Map<string, number>()
  const stallById = new Map<number, (typeof stallRows)[number]>()
  for (const stall of stallRows) {
    const key = nameKey(stall.code || '')
    if (key) stallMap.set(key, stall.id)
    stallById.set(stall.id, stall)
  }

  const toInsert: Array<{ payload: Record<string, unknown>; row: ImportRow }> = []
  const toUpdate: Array<{ id: number; payload: Record<string, unknown>; row: ImportRow }> = []
  const failedLines = new Set<number>()

  for (const row of rows) {
    const key = nameKey(row.stallCode)
    const sectorId = sectorMap.get(nameKey(row.sectorName)) ?? null
    const ownerId = ownerMap.get(nameKey(row.ownerName)) ?? null
    const existingId = stallMap.get(key)

    if (!existingId) {
      toInsert.push({
        row,
        payload: {
          market_id: marketId,
          sector_id: sectorId,
          owner_id: ownerId,
          code: row.stallCode,
          number: row.stallNumber,
          qr_code: row.stallCode,
          legacy_code: row.legacyCode || null,
          status: row.status
        }
      })
      continue
    }

    const existing = stallById.get(existingId)
    const changed =
      !existing ||
      existing.number !== row.stallNumber ||
      existing.qr_code !== row.stallCode ||
      (existing.legacy_code || '') !== row.legacyCode ||
      existing.status !== row.status ||
      existing.sector_id !== sectorId ||
      existing.owner_id !== ownerId

    if (changed) {
      toUpdate.push({
        id: existingId,
        row,
        payload: {
          sector_id: sectorId,
          owner_id: ownerId,
          number: row.stallNumber,
          qr_code: row.stallCode,
          legacy_code: row.legacyCode || null,
          status: row.status
        }
      })
    }
  }

  progress(`Menyimpan ${toInsert.length} lapak baru…`)
  for (let index = 0; index < toInsert.length; index += CHUNK_SIZE) {
    const chunk = toInsert.slice(index, index + CHUNK_SIZE)
    const { data, error } = await client
      .from('stalls')
      .insert(chunk.map((item) => item.payload))
      .select('id, code')

    if (!error) {
      for (const stall of data || []) {
        stallMap.set(nameKey(stall.code || ''), stall.id)
        summary.stallsCreated += 1
      }
      continue
    }

    for (const item of chunk) {
      const { data: single, error: singleError } = await client
        .from('stalls')
        .insert([item.payload])
        .select('id, code')
        .single()
      if (singleError) {
        failedLines.add(item.row.line)
        summary.errors.push({
          line: item.row.line,
          label: item.row.stallCode,
          message: singleError.message
        })
        continue
      }
      stallMap.set(nameKey(single.code || ''), single.id)
      summary.stallsCreated += 1
    }
  }

  progress(`Memperbarui ${toUpdate.length} lapak…`)
  await runPool(toUpdate, async (item) => {
    const { error } = await client.from('stalls').update(item.payload).eq('id', item.id)
    if (error) {
      failedLines.add(item.row.line)
      summary.errors.push({
        line: item.row.line,
        label: item.row.stallCode,
        message: error.message
      })
      return
    }
    summary.stallsUpdated += 1
  })

  return { stallMap, failedLines }
}

async function ensureTypes(
  client: SupabaseClient,
  marketId: number,
  specs: RetributionTypeSpec[],
  summary: ImportSummary
): Promise<Map<string, number>> {
  const typeRows = await fetchAll<{ id: number; code: string | null }>((from, to) =>
    client
      .from('retribution_types')
      .select('id, code')
      .eq('market_id', marketId)
      .order('id')
      .range(from, to)
  )
  const typeIdByCode = new Map<string, number>()
  for (const type of typeRows) {
    if (type.code) typeIdByCode.set(type.code.toUpperCase(), type.id)
  }

  for (const spec of specs) {
    if (typeIdByCode.has(spec.code.toUpperCase())) continue
    const { data, error } = await client
      .from('retribution_types')
      .insert([
        {
          code: spec.code,
          name: spec.name,
          category: spec.category,
          unit: spec.unit,
          amount: 0,
          market_id: marketId
        }
      ])
      .select('id, code')
      .single()
    if (error) throw new Error(`Gagal membuat jenis retribusi ${spec.code}: ${error.message}`)
    typeIdByCode.set(spec.code.toUpperCase(), data.id)
    summary.typesCreated += 1
  }

  return typeIdByCode
}

interface RateTask {
  line: number
  label: string
  stallId: number
  typesId: number
  amount: number
}

async function upsertRates(
  client: SupabaseClient,
  marketId: number,
  tasks: RateTask[],
  summary: ImportSummary,
  progress: (phase: string) => void
): Promise<Set<number>> {
  progress('Memeriksa tarif retribusi…')
  const rateRows = await fetchAll<{
    id: number
    stall_id: number | null
    types_id: number
    amount: number | null
  }>((from, to) =>
    client
      .from('retribution_rates')
      .select('id, stall_id, types_id, amount')
      .eq('market_id', marketId)
      .order('id')
      .range(from, to)
  )
  const rateMap = new Map<string, { id: number; amount: number }>()
  for (const rate of rateRows) {
    if (rate.stall_id === null) continue
    const key = `${rate.stall_id}:${rate.types_id}`
    if (!rateMap.has(key)) rateMap.set(key, { id: rate.id, amount: Number(rate.amount) || 0 })
  }

  const rateInserts: RateTask[] = []
  const rateUpdates: Array<RateTask & { id: number }> = []
  for (const task of tasks) {
    const existing = rateMap.get(`${task.stallId}:${task.typesId}`)
    if (!existing) {
      rateInserts.push(task)
    } else if (existing.amount !== task.amount) {
      rateUpdates.push({ ...task, id: existing.id })
    }
  }

  const failedLines = new Set<number>()

  progress(`Menyimpan ${rateInserts.length} tarif baru…`)
  for (let index = 0; index < rateInserts.length; index += CHUNK_SIZE) {
    const chunk = rateInserts.slice(index, index + CHUNK_SIZE)
    const payloads = chunk.map((task) => ({
      types_id: task.typesId,
      stall_id: task.stallId,
      market_id: marketId,
      amount: task.amount
    }))
    const { error } = await client.from('retribution_rates').insert(payloads)
    if (!error) {
      summary.ratesCreated += chunk.length
      continue
    }

    for (let itemIndex = 0; itemIndex < chunk.length; itemIndex += 1) {
      const task = chunk[itemIndex]
      const { error: singleError } = await client
        .from('retribution_rates')
        .insert([payloads[itemIndex]])
      if (singleError) {
        failedLines.add(task.line)
        summary.errors.push({
          line: task.line,
          label: task.label,
          message: singleError.message
        })
        continue
      }
      summary.ratesCreated += 1
    }
  }

  progress(`Memperbarui ${rateUpdates.length} tarif…`)
  await runPool(rateUpdates, async (task) => {
    const { error } = await client
      .from('retribution_rates')
      .update({ amount: task.amount })
      .eq('id', task.id)
    if (error) {
      failedLines.add(task.line)
      summary.errors.push({
        line: task.line,
        label: task.label,
        message: error.message
      })
      return
    }
    summary.ratesUpdated += 1
  })

  return failedLines
}

export async function runMarketImport(
  client: SupabaseClient,
  options: RunMarketImportOptions
): Promise<ImportSummary> {
  const progress = options.onProgress || (() => undefined)
  const readyRows = options.rows.filter((row) => !row.skip)
  const summary = baseSummary('markets', marketSources(options.rows))

  progress('Memeriksa daftar pasar…')
  const existingRows = await fetchAll<{
    id: number
    code: string | null
    name: string
    city: string | null
    address: string | null
    status: string | null
  }>((from, to) =>
    client
      .from('markets')
      .select('id, code, name, city, address, status')
      .order('id')
      .range(from, to)
  )

  const byCode = new Map<string, (typeof existingRows)[number]>()
  for (const market of existingRows) {
    if (market.code) byCode.set(nameKey(market.code), market)
  }

  const inserts: MarketInput[] = []
  const updates: Array<{ id: number; row: MarketInput; payload: Record<string, unknown> }> = []

  for (const row of readyRows) {
    const match = byCode.get(nameKey(row.code))
    if (!match) {
      inserts.push(row)
      continue
    }
    const payload: Record<string, unknown> = {}
    if (row.name && row.name !== match.name) payload.name = row.name
    if (row.city && row.city !== (match.city || '')) payload.city = row.city
    if (row.address && row.address !== (match.address || '')) payload.address = row.address
    if (row.status && row.status !== (match.status || '')) payload.status = row.status
    if (Object.keys(payload).length > 0) updates.push({ id: match.id, row, payload })
  }

  progress(`Menyimpan ${inserts.length} pasar baru…`)
  for (const row of inserts) {
    const payload: Record<string, unknown> = { code: row.code, name: row.name, status: row.status }
    if (row.city) payload.city = row.city
    if (row.address) payload.address = row.address
    const { error } = await client.from('markets').insert([payload]).select('id').single()
    if (error) {
      summary.errors.push({ line: row.line, label: row.code, message: error.message })
      continue
    }
    summary.marketsCreated += 1
  }

  progress(`Memperbarui ${updates.length} pasar…`)
  await runPool(updates, async (item) => {
    const { error } = await client.from('markets').update(item.payload).eq('id', item.id)
    if (error) {
      summary.errors.push({ line: item.row.line, label: item.row.code, message: error.message })
      return
    }
    summary.marketsUpdated += 1
  })

  summary.importedRows = summary.marketsCreated + summary.marketsUpdated
  progress('Selesai')
  return summary
}

export async function runStallImport(
  client: SupabaseClient,
  options: RunStallImportOptions
): Promise<ImportSummary> {
  const progress = options.onProgress || (() => undefined)
  const readyRows = options.rows.filter((row) => !row.skip)
  const summary = baseSummary('stalls', stallSources(options.rows))

  progress('Menyiapkan pasar tujuan…')
  const { market, created } = await resolveMarket(client, options)
  summary.marketCreated = created
  summary.marketsCreated = created ? 1 : 0

  progress('Menyiapkan sektor…')
  const sectorMap = await ensureSectors(client, market.id, readyRows, summary)

  progress('Menyiapkan pemilik lapak…')
  const ownerMap = await ensureOwners(client, readyRows, summary)

  const { failedLines } = await upsertStalls(
    client,
    market.id,
    readyRows,
    sectorMap,
    ownerMap,
    summary,
    progress
  )

  summary.importedRows = readyRows.filter((row) => !failedLines.has(row.line)).length
  progress('Selesai')
  return summary
}

export async function runRateImport(
  client: SupabaseClient,
  options: RunRateImportOptions
): Promise<ImportSummary> {
  const progress = options.onProgress || (() => undefined)
  const readyRows = options.rows.filter((row) => !row.skip)
  const summary = baseSummary('rates', rateSources(options.rows))

  progress('Mencari pasar tujuan…')
  const market = await requireMarket(client, options)

  progress('Memeriksa lapak…')
  const stallRows = await fetchAll<{ id: number; code: string | null }>((from, to) =>
    client
      .from('stalls')
      .select('id, code')
      .eq('market_id', market.id)
      .order('id')
      .range(from, to)
  )
  const stallMap = new Map<string, number>()
  for (const stall of stallRows) {
    const key = nameKey(stall.code || '')
    if (key && !stallMap.has(key)) stallMap.set(key, stall.id)
  }

  progress('Menyiapkan jenis retribusi…')
  const typeRows = await fetchAll<{ id: number; code: string | null; name: string }>((from, to) =>
    client
      .from('retribution_types')
      .select('id, code, name')
      .eq('market_id', market.id)
      .order('id')
      .range(from, to)
  )
  const typeIdByCode = new Map<string, number>()
  const typeIdByName = new Map<string, number>()
  for (const type of typeRows) {
    if (type.code) typeIdByCode.set(type.code.toUpperCase(), type.id)
    if (type.name) {
      const key = nameKey(type.name)
      if (!typeIdByName.has(key)) typeIdByName.set(key, type.id)
    }
  }

  const failedLines = new Set<number>()
  for (const row of readyRows) {
    if (typeIdByCode.has(row.typeCode)) continue
    const nameMatch = typeIdByName.get(nameKey(row.typeName))
    if (nameMatch) {
      typeIdByCode.set(row.typeCode, nameMatch)
      continue
    }
    const { data, error } = await client
      .from('retribution_types')
      .insert([
        {
          code: row.typeCode,
          name: row.typeName,
          category: row.category,
          unit: row.unit,
          amount: 0,
          market_id: market.id
        }
      ])
      .select('id, code')
      .single()
    if (error) {
      failedLines.add(row.line)
      summary.errors.push({
        line: row.line,
        label: row.stallCode,
        message: `Gagal membuat jenis "${row.typeName}": ${error.message}`
      })
      continue
    }
    typeIdByCode.set(row.typeCode, data.id)
    typeIdByName.set(nameKey(row.typeName), data.id)
    summary.typesCreated += 1
  }

  const tasks: RateTask[] = []
  for (const row of readyRows) {
    if (failedLines.has(row.line)) continue
    const stallId = stallMap.get(nameKey(row.stallCode))
    if (!stallId) {
      failedLines.add(row.line)
      summary.errors.push({
        line: row.line,
        label: row.stallCode,
        message: `Lapak "${row.stallCode}" tidak ditemukan di pasar ${market.code || market.name}`
      })
      continue
    }
    const typesId = typeIdByCode.get(row.typeCode)
    if (!typesId || row.amount === null) {
      failedLines.add(row.line)
      continue
    }
    tasks.push({ line: row.line, label: row.stallCode, stallId, typesId, amount: row.amount })
  }

  const failedRateLines = await upsertRates(client, market.id, tasks, summary, progress)
  for (const line of failedRateLines) failedLines.add(line)

  summary.importedRows = readyRows.filter((row) => !failedLines.has(row.line)).length
  progress('Selesai')
  return summary
}

export async function runCsvImport(
  client: SupabaseClient,
  options: RunImportOptions
): Promise<ImportSummary> {
  const progress = options.onProgress || (() => undefined)
  const readyRows = options.rows.filter((row) => !row.skip)
  const summary = baseSummary('combined', stallSources(options.rows))

  progress('Menyiapkan pasar tujuan…')
  const { market, created } = await resolveMarket(client, options)
  summary.marketCreated = created
  summary.marketsCreated = created ? 1 : 0

  progress('Menyiapkan sektor…')
  const sectorMap = await ensureSectors(client, market.id, readyRows, summary)

  progress('Menyiapkan pemilik lapak…')
  const ownerMap = await ensureOwners(client, readyRows, summary)

  const { stallMap, failedLines } = await upsertStalls(
    client,
    market.id,
    readyRows,
    sectorMap,
    ownerMap,
    summary,
    progress
  )

  progress('Menyiapkan jenis retribusi…')
  const typeIdByCode = await ensureTypes(
    client,
    market.id,
    [options.typeSpecs.annual, options.typeSpecs.daily],
    summary
  )
  const annualTypeId = typeIdByCode.get(options.typeSpecs.annual.code.toUpperCase())
  const dailyTypeId = typeIdByCode.get(options.typeSpecs.daily.code.toUpperCase())

  const tasks: RateTask[] = []
  for (const row of readyRows) {
    const stallId = stallMap.get(nameKey(row.stallCode))
    if (!stallId) continue
    if (row.annualAmount !== null && annualTypeId) {
      tasks.push({
        line: row.line,
        label: row.stallCode,
        stallId,
        typesId: annualTypeId,
        amount: row.annualAmount
      })
    }
    if (row.dailyAmount !== null && dailyTypeId) {
      tasks.push({
        line: row.line,
        label: row.stallCode,
        stallId,
        typesId: dailyTypeId,
        amount: row.dailyAmount
      })
    }
  }

  const failedRateLines = await upsertRates(client, market.id, tasks, summary, progress)
  for (const line of failedRateLines) failedLines.add(line)

  summary.importedRows = readyRows.filter((row) => !failedLines.has(row.line)).length
  progress('Selesai')
  return summary
}
