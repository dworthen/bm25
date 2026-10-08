import { constants, Database } from 'bun:sqlite'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  type DbDocument,
  type DbDocumentWithTerms,
  type DbTerm,
  type DbTermDocument,
  type DocumentBreakdown,
} from '../types'
import { resolvePath } from '../utils/resolvePath'

const databases: Record<string, Database> = {}

export async function getDb(dbPath: string): Promise<Database> {
  dbPath = resolvePath(dbPath)
  if (!databases[dbPath]) {
    await mkdir(dirname(dbPath), { recursive: true })
    databases[dbPath] = new Database(dbPath, {
      create: true,
      safeIntegers: true,
      strict: true,
    })
    initDb(databases[dbPath]!)
  }

  return databases[dbPath]!
}

function initDb(db: Database) {
  db.run(`PRAGMA journal_mode = WAL;`)
  db.run(`PRAGMA foreign_keys = ON;`)
  db.run('PRAGMA busy_timeout = 10000;')
  // Safe with WAL and much faster for bulk writes (one fsync per checkpoint
  // instead of one per commit).
  db.run('PRAGMA synchronous = NORMAL;')
  db.run('PRAGMA temp_store = MEMORY;')
  db.run('PRAGMA cache_size = -65536;')

  // documents uses an integer surrogate key; term_document references it by
  // integer instead of the (long, repeated) TEXT external id. This keeps the
  // hot term_document table small and its composite key cheap to compare.
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ext_id TEXT UNIQUE NOT NULL,
      hash TEXT NOT NULL,
      length INTEGER NOT NULL
    )
  `)
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_documents_ext_id ON documents(ext_id);
  `)
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(hash);
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT UNIQUE NOT NULL
    )
  `)
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_terms_term ON terms(term);
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS term_document (
      term_id INTEGER NOT NULL,
      document_id INTEGER NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (term_id, document_id),
      FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    ) WITHOUT ROWID
  `)
}

export function closeDb(db: Database) {
  db.fileControl(constants.SQLITE_FCNTL_PERSIST_WAL, 0)
  // Checkpoint and truncate the WAL file
  db.run('PRAGMA wal_checkpoint(TRUNCATE);')
  db.close(false)
}

export function insertDocument(db: Database, document: DbDocument): void {
  const insert = db.query(`
    INSERT INTO documents (ext_id, hash, length) VALUES ($ext_id, $hash, $length)
    ON CONFLICT(ext_id) 
    DO UPDATE SET hash = $hash, length = $length;
  `)
  insert.run({
    ext_id: document.id,
    hash: document.hash,
    length: document.length,
  })
}

export function syncDocuments(db: Database, documents: string[]): void {
  const placeholder = documents.map(() => '?').join(', ')
  const sql = `DELETE FROM documents WHERE ext_id NOT IN (${placeholder})`
  db.prepare<void, string[]>(sql).run(...documents)
}

export function insertTerms(db: Database, terms: string[]): DbTerm[] {
  const insert = db.query('INSERT OR IGNORE INTO terms (term) VALUES ($term)')
  const insertTermsTransaction = db.transaction((terms: string[]) => {
    for (const term of terms) insert.run({ term })
  })
  insertTermsTransaction(terms)

  const placeholder = terms.map(() => '?').join(', ')
  const sql = `SELECT * FROM terms WHERE term IN (${placeholder})`
  const rows = db.prepare<DbTerm, string[]>(sql).all(...terms)
  return rows
}

export function insertTermDocument(
  db: Database,
  termDocuments: DbTermDocument[],
): void {
  const insert = db.query(`
    INSERT INTO term_document (term_id, document_id, count) VALUES ($term_id, $document_id, $count)
    ON CONFLICT(term_id, document_id) 
    DO UPDATE SET count = $count;
  `)
  const insertTermDocumentTransaction = db.transaction(
    (termDocuments: DbTermDocument[]) => {
      for (const termDocument of termDocuments) {
        insert.run(termDocument)
      }
    },
  )
  insertTermDocumentTransaction(termDocuments)
}

export function totalDocumentCount(db: Database): bigint {
  const row = db
    .query<{ count: bigint }, []>('SELECT COUNT(*) as count FROM documents')
    .get()
  return row?.count ?? 0n
}

export function documentsWithTermCount(db: Database, term: string): bigint {
  const row = db
    .query<{ count: bigint }, [string]>(
      `
      SELECT COUNT(DISTINCT td.document_id) as count
      FROM term_document td
      INNER JOIN terms t ON td.term_id = t.id
      WHERE t.term = ?
      `,
    )
    .get(term)
  return row?.count ?? 0n
}

export function averageDocumentLength(db: Database): bigint {
  const row = db
    .query<{ avgLength: bigint }, []>(
      'SELECT AVG(length) as avgLength FROM documents',
    )
    .get()
  return row?.avgLength ?? 0n
}

export function docomentsWithTerms(
  db: Database,
  terms: string[],
): Iterable<DbDocumentWithTerms> {
  const placeholder = terms.map(() => '?').join(', ')
  const statement = db.query<DbDocumentWithTerms, string[]>(
    `
      SELECT 
        td.term_id as term_id,
        d.ext_id as document_id,
        td.count as term_frequency,
        t.term as term,
        d.length as document_length,
        d.hash as document_hash
      FROM term_document td
      INNER JOIN terms t ON td.term_id = t.id
      INNER JOIN documents d ON td.document_id = d.id
      WHERE t.term IN (${placeholder})
      `,
  )
  return statement.iterate(...terms)
}

// Cache term -> id per database so repeated terms across documents and
// batches don't require re-inserting or re-querying the terms table.
const termIdCaches = new WeakMap<Database, Map<string, bigint>>()
function getTermIdCache(db: Database): Map<string, bigint> {
  let cache = termIdCaches.get(db)
  if (cache === undefined) {
    cache = new Map<string, bigint>()
    termIdCaches.set(db, cache)
  }
  return cache
}

export function batchInsertDocumentBreakdowns(
  db: Database,
  documentBreakdowns: DocumentBreakdown[],
): void {
  const termIdCache = getTermIdCache(db)

  // ON CONFLICT ... DO UPDATE lets RETURNING yield the id even when the row
  // already exists, so a single statement resolves the integer id.
  const upsertDocument = db.query<
    { id: bigint },
    { ext_id: string; hash: string; length: bigint }
  >(`
    INSERT INTO documents (ext_id, hash, length) VALUES ($ext_id, $hash, $length)
    ON CONFLICT(ext_id) DO UPDATE SET hash = excluded.hash, length = excluded.length
    RETURNING id;
  `)
  const upsertTerm = db.query<{ id: bigint }, { term: string }>(`
    INSERT INTO terms (term) VALUES ($term)
    ON CONFLICT(term) DO UPDATE SET term = excluded.term
    RETURNING id;
  `)
  const insertTermDocument = db.query(`
    INSERT INTO term_document (term_id, document_id, count) VALUES ($term_id, $document_id, $count)
    ON CONFLICT(term_id, document_id) 
    DO UPDATE SET count = $count;
  `)

  const insertTransaction = db.transaction((results: DocumentBreakdown[]) => {
    for (const { document, terms } of results) {
      const documentId = upsertDocument.get({
        ext_id: document.id,
        hash: document.hash,
        length: document.length,
      })!.id
      for (const term in terms) {
        let termId = termIdCache.get(term)
        if (termId === undefined) {
          termId = upsertTerm.get({ term })!.id
          termIdCache.set(term, termId)
        }
        insertTermDocument.run({
          term_id: termId,
          document_id: documentId,
          count: terms[term]!,
        })
      }
    }
  })
  insertTransaction(documentBreakdowns)
}

export function containsDocument(
  db: Database,
  documentId: string,
  documentHash: string,
): boolean {
  const result = db
    .query<{ count: bigint }, { id: string; hash: string }>(
      'SELECT COUNT(*) as count FROM documents WHERE ext_id = $id AND hash = $hash',
    )
    .get({ id: documentId, hash: documentHash })
  return (result?.count ?? 0n) > 0n
}