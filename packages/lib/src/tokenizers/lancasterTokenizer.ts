import { LancasterStemmer } from 'natural/lib/natural/stemmers'
import { WordTokenizer } from 'natural/lib/natural/tokenizers'
import { removeStopwords } from 'stopword'
import { type Tokenizer } from '../types'

const wordTokenizer = new WordTokenizer()

// The same words recur constantly across a corpus, and Lancaster stemming is
// the most expensive per-token step, so cache stems for the process lifetime.
const stemCache = new Map<string, string>()

export const lancasterTokenizer: Tokenizer = (text) => {
  const tokens = removeStopwords(wordTokenizer.tokenize(text.toLowerCase()))
  const stemmed = new Array<string>(tokens.length)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    let stem = stemCache.get(token)
    if (stem === undefined) {
      stem = LancasterStemmer.stem(token)
      stemCache.set(token, stem)
    }
    stemmed[i] = stem
  }
  return stemmed
}