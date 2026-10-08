import { createCommand } from '@d-dev/roar'
import { $ } from 'bun'

export const cronStatusCmd = createCommand(
  {
    usageName: 'bm25 cron status',
    description: 'Displays the status of a cron job',
  },
  async () => {
    let cmd: string
    switch (process.platform) {
      case 'win32':
        cmd = 'schtasks /query /tn "bun-cron-bm25"'
        break
      case 'linux':
        cmd = 'crontab -l | grep "# bun-cron: bm25"'
        break
      case 'darwin':
        cmd = 'launchctl list | grep "bun.cron.bm25"'
        break
      default:
        console.error(
          `Cron status is not supported on this platform, ${process.platform}.`,
        )
        process.exit(1)
    }

    try {
      const { exitCode } = await $`${{ raw: cmd }}`.quiet().nothrow()
      if (exitCode === 0) {
        console.log(
          `bm25 cron job is running. Run \`bm25 cron logs\` to view the logs or \`bm25 cron stop\` to stop the cron job.`,
        )
      } else {
        console.log(
          `bm25 cron job is not running. Run \`bm25 cron start\` to start it.`,
        )
      }
    } catch (error) {
      console.error('Failed to retrieve cron status.')
      console.error(error)
    }
  },
)