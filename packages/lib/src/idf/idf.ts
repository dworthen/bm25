import { documentsWithTermCount, totalDocumentCount } from '../db/db'
import { type IDF } from '../types'

export const idf: IDF = (db, term) => {
  const totalDocs = totalDocumentCount(db)
  const docsWithTerm = documentsWithTermCount(db, term)

  return Math.max(
    Math.log(
      (Number(totalDocs) - Number(docsWithTerm) + 0.5) /
        (Number(docsWithTerm) + 0.5),
    ),
    0,
  )
}