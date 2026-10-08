import {
  closeDb,
  getDb,
  syncDocuments,
  totalDocumentCount,
} from '@d-dev/bm25-core'
import { loadConfig } from './config'
import { CRON_LOG_FILE, INDEXES_DIR } from './globals'
import { generateFilesIterable, indexFiles } from './indexers/indexFiles'
import { type DirectorySpecifier } from './utils/directory'
import { resolvePath } from './utils/resolvePath'

type IndexResult = {
  name: string
  timestamp: string
  duration: string
  batchSize: number
  concurrency: number
  directories: DirectorySpecifier[]
  results: {
    totalFilesProcessed: number
    filesIndexed: number
    filesSkippedAlreadyIndexed: number
    filesSkippedDueToErrors: number
    filesInIndex: number
    errors: string[]
  }
}

export async function getLogEntries(): Promise<IndexResult[]> {
  const file = Bun.file(CRON_LOG_FILE)
  if (!(await file.exists())) {
    return []
  }
  const content = await file.text()
  try {
    return Bun.JSONL.parse(content) as IndexResult[]
  } catch (_) {
    return []
  }
}

function getDurationString(start: number, end: number): string {
  const duration = end - start
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor(duration / (1000 * 60 * 60))
  return `${hours}h ${minutes}m ${seconds}s`
}

export async function run() {
  const results: IndexResult[] = await getLogEntries()
  const config = await loadConfig()
  try {
    for (const index of config.indexes) {
      const start = Date.now()
      const dbPath = resolvePath(INDEXES_DIR, `${index.name}.db`)
      const db = await getDb(dbPath)

      const filePathGenerator = generateFilesIterable(index.directories)

      let totalFilesProcessed = 0
      const files: string[] = []
      for await (const filePath of filePathGenerator()) {
        totalFilesProcessed++
        files.push(filePath)
      }

      const indexFilesResults = indexFiles(
        db,
        filePathGenerator(),
        index.batchSize,
        index.concurrency,
      )
      let filesIndexed = 0
      const errors: string[] = []
      for await (const batchResult of indexFilesResults) {
        filesIndexed += batchResult.indexedCount
        if (!batchResult.ok) {
          errors.push(...batchResult.errors)
        }
      }
      syncDocuments(db, files)
      const finish = Date.now()
      results.push({
        name: index.name,
        timestamp: new Date(start).toLocaleString(),
        duration: getDurationString(start, finish),
        batchSize: index.batchSize,
        concurrency: index.concurrency,
        directories: index.directories,
        results: {
          totalFilesProcessed,
          filesIndexed,
          filesSkippedAlreadyIndexed:
            totalFilesProcessed - filesIndexed - errors.length,
          filesSkippedDueToErrors: errors.length,
          filesInIndex: Number(totalDocumentCount(db)),
          errors,
        },
      })
      closeDb(db)
    }
    const file = Bun.file(CRON_LOG_FILE)
    await Bun.write(
      file,
      results
        .slice(-100)
        .map((r) => JSON.stringify(r))
        .join('\n'),
    )
  } catch (error: unknown) {
    results.push({
      // @ts-expect-error
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(Date.now()).toLocaleString(),
      config,
    })
    const file = Bun.file(CRON_LOG_FILE)
    await Bun.write(
      file,
      results
        .slice(-100)
        .map((r) => JSON.stringify(r))
        .join('\n'),
    )
  }
}

export default {
  async scheduled() {
    await run()
  },
}