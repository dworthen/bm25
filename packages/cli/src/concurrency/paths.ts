import { feature } from 'bun:bundle'

export type Workers = 'TestWorker' | 'BreakdownDocument'

export const WorkerPaths: Record<Workers, string> = {
  TestWorker: feature('IS_BINARY')
    ? // Path relative to src root
      './concurrency/workers/test/worker.fixture.ts'
    : // path relative to current module
      new URL('./workers/test/worker.fixture.ts', import.meta.url).href,
  BreakdownDocument: feature('IS_BINARY')
    ? // Path relative to src root
      './concurrency/workers/breakdownDocument/breakdownDocument.ts'
    : // path relative to current module
      new URL(
        './workers/breakdownDocument/breakdownDocument.ts',
        import.meta.url,
      ).href,
}