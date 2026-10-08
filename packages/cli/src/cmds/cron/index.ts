import { createCommand } from '@d-dev/roar'
import { cronLogsCmd } from './logs'
import { cronStartCmd } from './start'
import { cronStatusCmd } from './status'
import { cronStopCmd } from './stop'

export const cronCmd = createCommand({
  usageName: 'bm25 cron',
  description: 'Manage cron jobs',
})

cronCmd.addCommand('start', cronStartCmd)
cronCmd.addCommand('status', cronStatusCmd)
cronCmd.addCommand('logs', cronLogsCmd)
cronCmd.addCommand('stop', cronStopCmd)