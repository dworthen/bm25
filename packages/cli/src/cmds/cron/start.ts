import { feature } from 'bun:bundle'
import { createCommand } from '@d-dev/roar'
import { CRON_WORKER_PATH } from '../../globals'
export const cronStartCmd = createCommand(
  {
    usageName: 'bm25 cron start',
    description: 'Starts a cron job that will incrementally index all indexes.',
    flags: {
      schedule: {
        type: 'string',
        shortFlag: 's',
        description:
          'Cron schedule expression. Defaults to running at 9:30 AM on weekdays.',
        isRequired: true,
        default: '30 9 * * MON-FRI',
      },
    },
  },
  async (args) => {
    const { schedule } = args.flags
    const next = Bun.cron.parse(schedule)
    if (!next) {
      console.error('Invalid cron schedule')
      process.exit(1)
    }

    await Bun.write(CRON_WORKER_PATH, '')

    const cronWorkerPath = feature('IS_BINARY')
      ? CRON_WORKER_PATH
      : '../../cronWorker.ts'

    try {
      await Bun.cron(cronWorkerPath, schedule, 'bm25')
      console.log(`Next run: ${next.toLocaleString()}`)
    } catch (error) {
      console.error('Failed to start cron job:', error)
    }
  },
)