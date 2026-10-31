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

  export interface ParseConfig {
    header?: boolean
    delimiter?: string
    newline?: string
    quoteChar?: string
    escapeChar?: string
    comments?: string | false
    skipEmptyLines?: boolean | 'greedy'
    dynamicTyping?: boolean | Record<string, boolean>
    preview?: number
    encoding?: string
    transformHeader?: (header: string, index: number) => string
    beforeFirstChunk?: (chunk: string) => string
  }

  export interface ParseError {
    type: string
    code: string
    message: string
    row?: number
  }

  export interface ParseMeta {
    delimiter: string
    linebreak: string
    aborted: boolean
    truncated: boolean
    cursor: number
    fields?: string[]
  }

  export interface ParseResult<T> {
    data: T[]
    errors: ParseError[]
    meta: ParseMeta
  }

  export function parse<T = Record<string, string>>(input: string, config?: ParseConfig): ParseResult<T>
  export function unparse(data: unknown, config?: UnparseConfig): string

  const Papa: {
    parse: typeof parse
    unparse: typeof unparse
  }

  export default Papa
}
