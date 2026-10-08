import {
  batchInsertDocumentBreakdowns,
  breakdownDocument,
  containsDocument,
  type Database,
  type DocumentBreakdown,
  hash,
} from '@d-dev/bm25-core'
import { WorkerPaths } from '../concurrency/paths'
import { WorkerPool } from '../concurrency/workerPool'
import { type DirectorySpecifier, getFiles } from '../utils/directory'
import { mapAsyncIterable } from '../utils/iterators'

export type ProcessBatchResult =
  | {
      indexedCount: number
      ok: true
    }
  | {
      indexedCount: number
      ok: false
      errors: string[]
    }

export async function processBatch(
  db: Database,
  batch: string[],
): Promise<ProcessBatchResult> {
  const breakdownsToInsert = (
    await Promise.all(
      batch.map(async (fullPath) => {
        const contents = await Bun.file(fullPath).text()
        return {
          id: fullPath,
          contents,
          hash: hash(contents),
        }
      }),
    )
  )
    .filter((document) => !containsDocument(db, document.id, document.hash))
    .map((document) => breakdownDocument(document))
  batchInsertDocumentBreakdowns(db, breakdownsToInsert)
  return {
    indexedCount: breakdownsToInsert.length,
    ok: true,
  }
}

async function* indexFilesConcurrently(
  db: Database,
  filePaths: AsyncIterable<string>,
  batchSize: number,
  concurrency: number,
): AsyncIterable<ProcessBatchResult> {
  const workerPool = new WorkerPool<string, DocumentBreakdown>(
    WorkerPaths.BreakdownDocument,
    {
      concurrency,
      inputBufferSize: batchSize,
    },
  )

  const sending = (async () => {
    for await (const fullPath of filePaths) {
      await workerPool.send({
        taskId: fullPath,
        value: fullPath,
      })
    }
    await workerPool.close()
  })()

  let toInsert: DocumentBreakdown[] = []
  let errors: string[] = []
  let count = 0
  for await (const result of workerPool.results) {
    count++
    if (result.ok) {
      if (
        !containsDocument(
          db,
          result.value.document.id,
          result.value.document.hash,
        )
      ) {
        toInsert.push(result.value)
      }
    } else {
      errors.push(`Error processing ${result.taskId}: ${result.error}`)
    }
    if (count === batchSize) {
      if (toInsert.length > 0) {
        batchInsertDocumentBreakdowns(db, toInsert)
      }
      yield {
        indexedCount: toInsert.length,
        ok: errors.length === 0,
        ...(errors.length > 0 ? { errors } : {}),
      } as ProcessBatchResult
      toInsert = []
      errors = []
      count = 0
    }
  }

  await sending
  if (count > 0) {
    if (toInsert.length > 0) {
      batchInsertDocumentBreakdowns(db, toInsert)
    }
    yield {
      indexedCount: toInsert.length,
      ok: errors.length === 0,
      ...(errors.length > 0 ? { errors } : {}),
    } as ProcessBatchResult
  }
}

export async function* indexFiles(
  db: Database,
  filePaths: AsyncIterable<string>,
  batchSize: number,
  concurrency: number = 0,
): AsyncIterable<ProcessBatchResult> {
  if (concurrency > 1) {
    yield* indexFilesConcurrently(db, filePaths, batchSize, concurrency)
    return
  }

  let batch: string[] = []
  for await (const fullPath of filePaths) {
    batch.push(fullPath)
    if (batch.length >= batchSize) {
      yield await processBatch(db, batch)
      batch = []
    }
  }

  if (batch.length > 0) {
    yield await processBatch(db, batch)
  }
}

export function generateFilesIterable(
  directories: DirectorySpecifier[],
): () => AsyncIterable<string> {
  return async function* () {
    yield* mapAsyncIterable(getFiles(directories), ([fullPath]) => fullPath)
  }
}