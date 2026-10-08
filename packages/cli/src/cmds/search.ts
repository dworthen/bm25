import { createCommand } from '@d-dev/roar'
import { loadConfig } from '../config'
import { search } from '../search/search'

export const searchCmd = createCommand(
  {
    usageName: 'bm25 search <query>',
    description: 'Search the indexed documents for the given query',
    flags: {
      name: {
        type: 'string',
        shortFlag: 'n',
        description: 'The name of the index(es) to search',
        isMultiple: true,
        required: false,
      },
      all: {
        type: 'boolean',
        shortFlag: 'a',
        description: 'Search all indexes',
        default: false,
      },
      skip: {
        type: 'number',
        shortFlag: 's',
        description: 'The number of results to skip',
        default: 0,
      },
      limit: {
        type: 'number',
        shortFlag: 'l',
        description: 'The maximum number of results to return',
        default: 10,
      },
      saturation: {
        type: 'number',
        shortFlag: 'k',
        description: 'The BM25 k1 term frequency saturation parameter',
        default: 1.2,
      },
      normalize: {
        type: 'number',
        shortFlag: 'b',
        description: 'The BM25 length normalization parameter',
        default: 0.75,
      },
      excludeText: {
        type: 'boolean',
        description: 'Exclude the text content from the search results',
        default: false,
      },
    },
  },
  async (args) => {
    const [query] = args.input

    if (!query) {
      console.error('Error: Query is required. bm25 search <query>')
      process.exit(1)
    }

    const { name, all, skip, limit, saturation, normalize, excludeText } =
      args.flags

    if (all) {
      const config = await loadConfig()
      const indexes = config.indexes.map((index) => index.name)
      const searchResults = await search(indexes, query, {
        skip,
        limit,
        k1: saturation,
        b: normalize,
        excludeText,
      })
      console.log(JSON.stringify(searchResults, null, 2))
      return
    }

    if (!name || name.length === 0) {
      console.error(
        'Error: At least one index name must be specified or use the --all flag.',
      )
      process.exit(1)
    }

    const searchResults = await search(name, query, {
      skip,
      limit,
      k1: saturation,
      b: normalize,
      excludeText,
    })
    console.log(JSON.stringify(searchResults, null, 2))
  },
)