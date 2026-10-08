import {
  closeDb,
  getDb,
  syncDocuments,
  totalDocumentCount,
} from '@d-dev/bm25-core'
import { createCommand } from '@d-dev/roar'
import cliProgress from 'cli-progress'
import { addIndex, loadConfig, saveConfig } from '../config'
import { run } from '../cronWorker'
import { INDEXES_DIR } from '../globals'
import { generateFilesIterable, indexFiles } from '../indexers/indexFiles'
import { type DirectorySpecifier, isDirectory } from '../utils/directory'
import { resolvePath } from '../utils/resolvePath'

export const indexCmd = createCommand(
  {
    usageName: 'bm25 index <source-directory>',
    description: 'Indexes files in the specified directory',
    flags: {
      name: {
        type: 'string',
        shortFlag: 'n',
        description: 'Index name',
        isRequired: false,
      },
      include: {
        type: 'string',
        shortFlag: 'i',
        description: 'Include pattern for files to index',
        isMultiple: true,
      },
      exclude: {
        type: 'string',
        shortFlag: 'e',
        description: 'Exclude pattern for files to index',
        isMultiple: true,
        default: [],
      },
      batchSize: {
        type: 'number',
        shortFlag: 'b',
        description: 'Number of files to process in each batch',
        default: 500,
      },
      concurrency: {
        type: 'number',
        shortFlag: 'c',
        description: 'Number of files to process concurrently',
      },
    },
  },
  async (args) => {
    const dir = args.input[0]
    const { name, include, exclude } = args.flags

    if (!dir && !name) {
      await run()
      return
    }

    if (!name) {
      console.error('Index name is required.')
      process.exit(1)
    }

    const useExistingIndex = !dir

    const config = await loadConfig()
    let directories: DirectorySpecifier[]

    let concurrency: number | undefined
    let batchSize: number | undefined

    if (useExistingIndex) {
      const index = config.indexes.find((idx) => idx.name === name)
      if (index) {
        directories = index.directories
        concurrency = index.concurrency
        batchSize = index.batchSize
      } else {
        console.error(
          'Source directory is required. bm25 index <source-directory>',
        )
        process.exit(1)
      }
    } else {
      const directoryPath = resolvePath(dir)
      if (!(await isDirectory(directoryPath))) {
        console.error(
          'The specified source directory does not exist or is not a directory.',
        )
        process.exit(1)
      }
      if (!include) {
        console.error(
          'Include pattern is required when specifying a source directory.',
        )
        process.exit(1)
      }
      directories = [
        {
          srcDirectory: directoryPath,
          includes: include,
          excludes: exclude,
        },
      ]
    }

    concurrency = args.flags.concurrency ?? concurrency ?? 8
    batchSize = args.flags.batchSize ?? batchSize ?? 500

    if (batchSize <= 0) {
      console.error('Batch size must be greater than 0.')
      process.exit(1)
    }

    const dbPath = resolvePath(INDEXES_DIR, `${name}.db`)
    const db = await getDb(dbPath)

    const filePathGenerator = generateFilesIterable(directories)

    let totalFiles = 0
    const files: string[] = []
    for await (const filePath of filePathGenerator()) {
      totalFiles++
      files.push(filePath)
    }

    const indexFilesResults = indexFiles(
      db,
      filePathGenerator(),
      batchSize,
      concurrency,
    )
    let totalIndexedFiles = 0
    let totalProcessedFiles = 0
    const errors: string[] = []
    const progressBar = new cliProgress.SingleBar(
      {
        clearOnComplete: false,
        format: `Indexing ${name} {bar} {percentage}% | {value}/{total} files | {duration_formatted} elapsed | {eta_formatted} remaining`,
      },
      cliProgress.Presets.shades_classic,
    )
    progressBar.start(totalFiles, 0)
    for await (const batchResult of indexFilesResults) {
      totalIndexedFiles += batchResult.indexedCount
      totalProcessedFiles = Math.min(
        totalProcessedFiles + batchSize,
        totalFiles,
      )
      progressBar.update(totalProcessedFiles)
      if (!batchResult.ok) {
        errors.push(...batchResult.errors)
      }
    }
    progressBar.stop()

    syncDocuments(db, files)

    const docCount = totalDocumentCount(db)
    console.log(`Indexed ${totalIndexedFiles} files.`)
    console.log(`Total documents in the index: ${docCount}`)
    console.log(
      `Existing documents already indexed: ${Number(docCount) - totalIndexedFiles}`,
    )
    if (errors.length > 0) {
      console.error(`Errors occurred while indexing ${errors.length} files:`)
      for (const error of errors) {
        console.error(error)
      }
    }
    addIndex(config, name, directories, batchSize, concurrency)
    await saveConfig(config)
    closeDb(db)
  },
)