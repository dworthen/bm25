import { breakdownDocument, type DocumentBreakdown } from '@d-dev/bm25-core'
import { type WorkerInput, type WorkerResult } from '../../types'
import { type BreakddownDocumentInput } from './types'

declare const self: Worker

self.onmessage = async (
  event: MessageEvent<WorkerInput<BreakddownDocumentInput>>,
) => {
  const { taskId, value: filePath } = event.data
  try {
    const contents = await Bun.file(filePath).text()
    const breakdown = breakdownDocument({ id: filePath, contents })

    self.postMessage({
      taskId: taskId,
      ok: true,
      value: breakdown,
    } satisfies WorkerResult<DocumentBreakdown>)
  } catch (error) {
    self.postMessage({
      taskId: taskId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerResult<DocumentBreakdown>)
  }
}