import { createCommand } from '@d-dev/roar'

export const cronStopCmd = createCommand(
  {
    usageName: 'bm25 cron stop',
    description: 'Stops the cron job',
  },
  async () => {
    await Bun.cron.remove('bm25')
  },
)