import os from 'node:os'
import { resolvePath } from './utils/resolvePath'

export const GLOBAL_DIR = resolvePath(os.homedir(), '.bm25')