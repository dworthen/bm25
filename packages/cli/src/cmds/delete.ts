import { existsSync } from 'node:fs'
import { createCommand } from '@d-dev/roar'
import { loadConfig, saveConfig } from '../config'
import { INDEXES_DIR } from '../globals'
import { resolvePath } from '../utils/resolvePath'

export const deleteCmd = createCommand(
  {
    usageName: 'bm25 delete <index-name>',
    description: 'Deletes the specified index',
  },
  async (args) => {
    const indexName = args.input[0]

    if (!indexName) {
      console.error('Index name is required. bm25 delete <index-name>')
      process.exit(1)
    }

    const config = await loadConfig()
    const index = config.indexes.findIndex((idx) => idx.name === indexName)
    if (index !== -1) {
      config.indexes.splice(index, 1)
    }

    const dbFilePath = resolvePath(INDEXES_DIR, `${indexName}.db`)
    if (existsSync(dbFilePath)) {
      await Bun.file(dbFilePath).delete()
    }

    await saveConfig(config)
  },
)