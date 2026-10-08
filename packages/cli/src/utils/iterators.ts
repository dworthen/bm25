export async function* mapAsyncIterable<T, U>(
  iterable: AsyncIterable<T>,
  mapper: (item: T) => U | Promise<U>,
): AsyncIterable<U> {
  for await (const item of iterable) {
    yield await mapper(item)
  }
}