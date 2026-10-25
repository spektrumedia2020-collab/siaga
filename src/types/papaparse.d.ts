declare module 'papaparse' {
  export interface UnparseConfig {
    quotes?: boolean
    quoteChar?: string
    escapeChar?: string
    delimiter?: string
    header?: boolean
    newline?: string
    skipEmptyLines?: boolean | 'greedy'
    columns?: string[]
  }

  export function unparse(data: unknown, config?: UnparseConfig): string

  const Papa: {
    unparse: typeof unparse
  }

  export default Papa
}
