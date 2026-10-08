import { search as bm25Search, closeDb, getDb } from '@d-dev/bm25-core'
import { INDEXES_DIR } from '../globals'
import { resolvePath } from '../utils/resolvePath'

export type SearchOptions = {
  skip?: number
  limit?: number
  k1?: number
  b?: number
  excludeText?: boolean
}

export type DocumentScore = {
  document_id: string
  score: number
  text?: string
}

export type SearchResults = DocumentScore[]

export type Search = (
  indexes: string[],
  query: string,
  options?: SearchOptions,
) => Promise<SearchResults>

function getDocumentScores(allResults: DocumentScore[][]): DocumentScore[] {
  if (allResults.length === 0) {
    return []
  }
  if (allResults.length === 1) {
    return allResults[0]!
  }

  // Reciprocal Rank Fusion (RRF) implementation
  const k = 60
  const scores: Record<string, number> = {}

  for (const results of allResults) {
    results.forEach((doc, rank) => {
      scores[doc.document_id] =
        (scores[doc.document_id] ?? 0) + 1 / (k + rank + 1)
    })
  }

  const sortedDocs = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([document_id, score]) => ({ document_id, score }))

  return sortedDocs
}

export const search: Search = async (indexes, query, options) => {
  const excludeText = options?.excludeText ?? false
  const { skip = 0, limit = 10 } = options ?? {}
  const idxCount = indexes.length
  const windowSize = limit * idxCount
  const windowSkip = skip % windowSize
  const localSkip = Math.floor(skip / windowSize) * limit
  const localLimit = limit * 2

  const allResults: DocumentScore[][] = []

  for (const index of indexes) {
    const dbPath = resolvePath(INDEXES_DIR, `${index}.db`)
    const db = await getDb(dbPath)
    allResults.push(
      await bm25Search(db, query, {
        ...options,
        skip: localSkip,
        limit: localLimit,
      }),
    )
    closeDb(db)
  }

  const scores = getDocumentScores(allResults).slice(
    windowSkip,
    windowSkip + limit,
  )

  if (excludeText) {
    return scores
  }

  return await Promise.all(
    scores.map(async ({ document_id, score }) => {
      try {
        const file = Bun.file(document_id)
        const text = await file.text()
        return { document_id, score, text }
      } catch (error) {
        return {
          document_id,
          score,
          text: `Error reading ${document_id}: ${error instanceof Error ? error.message : String(error)}`,
        }
      }
    }),
  )
}