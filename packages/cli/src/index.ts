import { createCommand } from '@d-dev/roar'
import pkg from '../package.json'
import { cronCmd } from './cmds/cron'
import { indexCmd } from './cmds/index'
import { listCmd } from './cmds/list'
import { searchCmd } from './cmds/search'
import { cleanupStaleUpgrade, upgradeCmd } from './cmds/upgrade'
import { run } from './cronWorker'
import { CRON_WORKER_PATH } from './globals'

const cli = createCommand({
  usageName: 'bm25',
  description: pkg.description,
  version: pkg.version,
  versionFlag: 'version',
})

cli.addCommand('index', indexCmd)
cli.addCommand('search', searchCmd)
cli.addCommand('list', listCmd)
cli.addCommand('cron', cronCmd)
cli.addCommand('upgrade', upgradeCmd)

try {
  await cleanupStaleUpgrade()

  const args = process.argv.slice(2)
  if (args.includes(CRON_WORKER_PATH)) {
    await run()
  } else {
    await cli.run(args)
  }
} catch (error: unknown) {
  // Graceful ctrl+c handling for inquirer
  if (error instanceof Error && error.name === 'ExitPromptError') {
    process.exit(0)
  }

  if (error instanceof Error) {
    console.error(`Error: ${error.message}`)
  } else {
    console.error('An unexpected error occurred.')
    console.error(error)
  }

  process.exit(1)
}