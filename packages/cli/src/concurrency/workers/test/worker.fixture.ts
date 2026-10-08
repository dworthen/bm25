import { getEnvironmentData } from 'node:worker_threads'
import { type WorkerInput, type WorkerResult } from '../../types'
import { type Job, type Result, type WorkerOptions } from './types'

declare const self: Worker
const options = getEnvironmentData('options') as WorkerOptions

self.onmessage = (event: MessageEvent<WorkerInput<Job>>) => {
  const input = event.data.value
  self.postMessage({
    taskId: event.data.taskId,
    ok: true,
    value: {
      input,
      output: input * (options.multiplier ?? input),
    },
  } satisfies WorkerResult<Result>)
}