import { type Database } from 'bun:sqlite'

export type { Database } from 'bun:sqlite'
export type Tokens = string[]

export type Tokenizer = (text: string) => Tokens

export type DbDocument = {
  id: string
  hash: string
  length: bigint
}

export type DbTerm = {
  id: bigint
  term: string
}

export type DbTermDocument = {
  term_id: bigint
  document_id: bigint
  count: bigint
}

export type DbDocumentWithTerms = {
  term_id: bigint
  document_id: string
  term_frequency: bigint
  term: string
  document_length: bigint
  document_hash: string
}

export type Document = {
  id: string
  contents: string
}

export type DocumentBreakdown = {
  document: DbDocument
  terms: Record<string, bigint>
}

export type DocumentIndexerOptions = {
  tokenizer?: Tokenizer
}

export type DocumentIndexer = (
  db: Database,
  documents: Document[],
  options?: DocumentIndexerOptions,
) => void

export type IDF = (db: Database, term: string) => number

export type SearchOptions = {
  skip?: number
  limit?: number
  tokenizer?: Tokenizer
  k1?: number
  b?: number
}
export type DocumentScore = {
  document_id: string
  score: number
}
export type SearchResults = DocumentScore[]
export type Search = (
  db: Database,
  query: string,
  options?: SearchOptions,
) => SearchResults