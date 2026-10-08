import { type StructuredCloneable } from './types'

export class Channel<T extends StructuredCloneable>
  implements AsyncIterable<T>
{
  #buffer: T[] = []
  #bufferSize: number
  #receivers: Array<(item: IteratorResult<T>) => void> = []
  #closed = false

  constructor(bufferSize: number = Number.MAX_SAFE_INTEGER) {
    this.#bufferSize = bufferSize
  }

  async send(value: T): Promise<void> {
    if (this.#closed) throw new Error('channel is closed')

    const receive = this.#receivers.shift()
    if (receive) {
      receive({ value, done: false })
      return
    } else if (this.#buffer.length < this.#bufferSize) {
      this.#buffer.push(value)
      return
    }
    await new Promise<void>((resolve) => {
      const trySend = () => {
        const r = this.#receivers.shift()
        if (r) {
          r({ value, done: false })
          resolve()
        } else if (this.#buffer.length < this.#bufferSize) {
          this.#buffer.push(value)
          resolve()
        } else {
          setTimeout(trySend, 0)
        }
      }
      trySend()
    })
  }

  receive(): Promise<IteratorResult<T>> {
    if (this.#buffer.length) {
      return Promise.resolve({ value: this.#buffer.shift() as T, done: false })
    }
    if (this.#closed) {
      return Promise.resolve({ value: undefined, done: true })
    }
    return new Promise((resolve) => this.#receivers.push(resolve))
  }

  close() {
    this.#closed = true
    for (const receive of this.#receivers) {
      receive({ value: undefined, done: true })
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return { next: () => this.receive() }
  }
}