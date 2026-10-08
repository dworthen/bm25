import { createCommand } from '@d-dev/roar'
import { getLogEntries } from '../../cronWorker'

export const cronLogsCmd = createCommand(
  {
    usageName: 'bm25 cron logs',
    description: 'Displays the logs for the cron job.',
  },
  async () => {
    const logs = await getLogEntries()
    console.log(JSON.stringify(logs, null, 2))
  },
)