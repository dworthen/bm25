export type StructuredCloneablePrimitive =
  | undefined
  | null
  | boolean
  | number
  | string
  | bigint
  | Date
  | RegExp
  | Blob
  | File
  | ArrayBuffer
  | SharedArrayBuffer
  | DataView
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array

export type StructuredCloneable =
  | StructuredCloneablePrimitive
  | Array<StructuredCloneable>
  | ReadonlyArray<StructuredCloneable>
  | Map<StructuredCloneable, StructuredCloneable>
  | Set<StructuredCloneable>
  | { [key: string]: StructuredCloneable }

export type WorkerPoolOptions = {
  concurrency?: number
  inputBufferSize?: number
  outputBufferSize?: number
  workerOptions?: StructuredCloneable
}

export type WorkerInput<T extends StructuredCloneable> = {
  taskId: string
  value: T
}

export type WorkerResult<T extends StructuredCloneable> =
  | { taskId: string; ok: true; value: T }
  | { taskId: string; ok: false; error: string }