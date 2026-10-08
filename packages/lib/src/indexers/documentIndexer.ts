import { type Database } from 'bun:sqlite'
import { batchInsertDocumentBreakdowns } from '../db/db'
import { lancasterTokenizer } from '../tokenizers/lancasterTokenizer'
import {
  type DbDocument,
  type Document,
  type DocumentBreakdown,
  type DocumentIndexer,
  type Tokenizer,
} from '../types'
import { hash } from '../utils/hash'

export function breakdownDocument(
  document: Document,
  tokenizer: Tokenizer = lancasterTokenizer,
): DocumentBreakdown {
  const documentHash = hash(document.contents)
  const tokens = tokenizer(document.contents)
  const length = BigInt(tokens.length)
  const terms: Record<string, bigint> = {}
  for (const token of tokens) {
    terms[token] = (terms[token] ?? 0n) + 1n
  }
  const dbDocument: DbDocument = {
    id: document.id,
    hash: documentHash,
    length,
  }
  return {
    document: dbDocument,
    terms,
  }
}

export const indexDocuments: DocumentIndexer = (
  db: Database,
  documents: Document[],
  { tokenizer = lancasterTokenizer } = {},
) => {
  const documentBreakdowns = documents.map((document) =>
    breakdownDocument(document, tokenizer),
  )
  batchInsertDocumentBreakdowns(db, documentBreakdowns)
}