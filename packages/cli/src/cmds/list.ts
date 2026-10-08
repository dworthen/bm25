import { createCommand } from '@d-dev/roar'
import { loadConfig } from '../config'

export const listCmd = createCommand(
  {
    usageName: 'bm25 list',
    description: 'Lists all available indexes',
  },
  async () => {
    const config = await loadConfig()
    console.log(Bun.YAML.stringify(config.indexes, null, 2))
  },
)