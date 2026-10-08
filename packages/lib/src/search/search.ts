import { averageDocumentLength, docomentsWithTerms } from '../db/db'
import { idf } from '../idf/idf'
import { lancasterTokenizer } from '../tokenizers/lancasterTokenizer'
import { type DbDocumentWithTerms, type Search } from '../types'

function scoreTermDocument(
  idf: number,
  termDocument: DbDocumentWithTerms,
  averageDocLength: number,
  k1: number,
  b: number,
): number {
  if (idf <= 0) return 0

  const numerator = Number(termDocument.term_frequency) * (k1 + 1)
  const denominator =
    Number(termDocument.term_frequency) +
    k1 * (1 - b + b * (Number(termDocument.document_length) / averageDocLength))
  return idf * (numerator / denominator)
}

export const search: Search = (
  db,
  query,
  {
    tokenizer = lancasterTokenizer,
    k1 = 1.2,
    b = 0.75,
    skip = 0,
    limit = 10,
  } = {},
) => {
  const queryTerms = [...new Set(tokenizer(query))]

  const idfs: Record<string, number> = {}
  for (const term of queryTerms) {
    const termIdf = idf(db, term)
    // if (termIdf > 0) {
    idfs[term] = termIdf
    // }
  }

  const meaningfulQueryTerms = Object.keys(idfs)
  const averageDocLength = Number(averageDocumentLength(db))
  const docsWithTerms = docomentsWithTerms(db, meaningfulQueryTerms)

  const scores: Record<string, number> = {}

  for (const termDocument of docsWithTerms) {
    const termIdf = idfs[termDocument.term]!
    const score = scoreTermDocument(
      termIdf,
      termDocument,
      averageDocLength,
      k1,
      b,
    )
    scores[termDocument.document_id] =
      (scores[termDocument.document_id] ?? 0) + score
  }
  return Object.entries(scores)
    .map(([document_id, score]) => ({ document_id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(skip, skip + limit)
}