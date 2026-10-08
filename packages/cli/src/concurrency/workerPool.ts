import { availableParallelism } from 'node:os'
import { setEnvironmentData } from 'node:worker_threads'
import { Channel } from './channel'
import {
  type StructuredCloneable,
  type WorkerInput,
  type WorkerPoolOptions,
  type WorkerResult,
} from './types'

export class WorkerPool<
  Input extends StructuredCloneable,
  Output extends StructuredCloneable,
> {
  #jobs: Channel<WorkerInput<Input>>
  readonly results: Channel<WorkerResult<Output>>
  #workers: Worker[]
  #done: Promise<void>

  constructor(workerPath: string, options: WorkerPoolOptions = {}) {
    const {
      concurrency = Math.max(availableParallelism() - 1, 1),
      inputBufferSize,
      outputBufferSize,
      workerOptions,
    } = options
    this.#jobs = new Channel<WorkerInput<Input>>(inputBufferSize)
    this.results = new Channel<WorkerResult<Output>>(outputBufferSize)

    setEnvironmentData('options', workerOptions ?? {})

    this.#workers = Array.from(
      { length: concurrency },
      () => new Worker(workerPath),
    )

    this.#done = Promise.all(
      this.#workers.map((worker) => this.#run(worker)),
    ).then(() => this.results.close())
  }

  async send(job: WorkerInput<Input>): Promise<void> {
    return await this.#jobs.send(job)
  }

  close(): Promise<void> {
    this.#jobs.close()
    return this.#done
  }

  async #run(worker: Worker) {
    for await (const job of this.#jobs) {
      const result = new Promise<WorkerResult<Output>>((resolve) => {
        worker.onmessage = (event) =>
          resolve(event.data as WorkerResult<Output>)
      })

      worker.postMessage(job)
      await this.results.send(await result)
    }

    worker.terminate()
  }
}