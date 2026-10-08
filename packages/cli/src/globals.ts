import os from 'node:os'
import { resolvePath } from './utils/resolvePath'

export const GLOBAL_DIR = resolvePath(os.homedir(), '.bm25')
export const GLOBAL_CONFIG_PATH = resolvePath(GLOBAL_DIR, 'bm25.config.yaml')
export const CRON_DIR = resolvePath(GLOBAL_DIR, 'cron')
export const CRON_WORKER_PATH = resolvePath(CRON_DIR, 'index.ts')
export const CRON_LOG_FILE = resolvePath(CRON_DIR, 'log.jsonl')
export const INDEXES_DIR = resolvePath(GLOBAL_DIR, 'indexes')