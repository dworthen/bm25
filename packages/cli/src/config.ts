import { GLOBAL_CONFIG_PATH } from './globals'
import { type DirectorySpecifier } from './utils/directory'
import { isRecord } from './utils/records'
import { resolvePath } from './utils/resolvePath'

export type IndexConfig = {
  name: string
  batchSize: number
  concurrency: number
  directories: DirectorySpecifier[]
}

export type Bm25Config = {
  indexes: IndexConfig[]
}

const DEFAULT_CONFIG: Bm25Config = {
  indexes: [],
}

function isConfig(value: unknown): value is Bm25Config {
  if (!isRecord(value)) return false
  if (!Array.isArray(value.indexes)) return false
  if (
    !value.indexes.every(
      (index) =>
        isRecord(index) &&
        typeof index.name === 'string' &&
        typeof index.concurrency === 'number' &&
        Array.isArray(index.directories),
    )
  )
    return false
  for (const index of value.indexes) {
    for (const dir of index.directories) {
      if (!isRecord(dir)) return false
      if (
        typeof dir.srcDirectory !== 'string' ||
        dir.srcDirectory.trim() === ''
      )
        return false
      if (!Array.isArray(dir.includes)) return false
      if (!Array.isArray(dir.excludes)) return false
      if (!dir.includes.every((inc) => typeof inc === 'string')) return false
      if (!dir.excludes.every((exc) => typeof exc === 'string')) return false
    }
  }
  return true
}

export function validateConfig(value: unknown): asserts value is Bm25Config {
  if (!isConfig(value)) {
    throw new Error('Invalid configuration')
  }
}

export async function loadConfig(
  filePath: string = GLOBAL_CONFIG_PATH,
): Promise<Bm25Config> {
  filePath = resolvePath(filePath)
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    return DEFAULT_CONFIG
  }
  const content = await file.text()
  const config = Bun.YAML.parse(content) as Bm25Config
  validateConfig(config)
  return config
}

export async function saveConfig(
  config: Bm25Config,
  filePath: string = GLOBAL_CONFIG_PATH,
): Promise<void> {
  filePath = resolvePath(filePath)
  const file = Bun.file(filePath)
  const content = Bun.YAML.stringify(config, null, 2)
  await Bun.write(file, content)
}

export function addIndex(
  config: Bm25Config,
  name: string,
  directories: DirectorySpecifier[],
  batchSize: number,
  concurrency: number,
): void {
  const index = config.indexes.find((idx) => idx.name === name)
  if (index) {
    index.batchSize = batchSize
    index.concurrency = concurrency
    for (const dir of directories) {
      const ind = index.directories.findIndex(
        (d) => d.srcDirectory === dir.srcDirectory,
      )
      if (ind !== -1) {
        index.directories[ind] = dir
      } else {
        index.directories.push(dir)
      }
    }
  } else {
    config.indexes.push({ name, batchSize, concurrency, directories })
  }
}