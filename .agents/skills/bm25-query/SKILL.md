---
name: bm25-query
description: >
  Answer a question or request by searching indexed documents with the bm25 CLI
  and synthesizing an answer from the matching text. Use when the user asks
  something that should be answered from their indexed notes/files — e.g.
  "what do my notes say about X", "find docs about Y", "search notes for Z", or
  any question you should ground in the bm25 index rather than answer from
  memory. Extracts meaningful keywords (nouns, entities, terms) from the
  request because bm25 is keyword search, paginates while results stay
  relevant, and retries with synonyms/related terms. Resolves the bm25 binary
  via the bm25-install skill first. USE FOR: search my notes, query the index,
  find documents about, answer from my files, look up in bm25, keyword search.
---

# bm25 Query

## Goal

Turn a natural-language question into one or more `bm25 search` keyword queries,
gather the relevant document text, and compose a grounded answer. bm25 is
**keyword** search — the quality of the answer depends on extracting the right
search terms, paginating through relevant hits, and retrying with related
terms.

## Prerequisite: resolve the binary

Run the `bm25-install` skill to get the invocation path (`BM25`). Use that path
in place of `bm25` below.

## Command shape

```
<BM25> search "<terms>" (-n <name> ... | --all) [-s <skip>] [-l <limit>]
```

| Flag             | Meaning                                                    | Default  |
| ---------------- | ---------------------------------------------------------- | -------- |
| positional       | space-separated keyword terms (quote them)                 | required |
| `-n <name>`      | index to search (repeatable)                               | —        |
| `--all` / `-a`   | search every index                                         | false    |
| `-s <skip>`      | results to skip (pagination offset)                        | 0        |
| `-l <limit>`     | max results per page                                       | 10       |
| `--exclude-text` | omit `text` from results (do NOT use here — you need text) | false    |

Output is a JSON array of `{ document_id, score, text }`, sorted by descending
`score`.

Either `-n <name>` or `--all` is required. If the user named an index use `-n`;
otherwise default to `--all`.

## Process

1. Resolve `BM25` via the `bm25-install` skill.
2. **Extract keywords** from the request: keep meaningful nouns, named
   entities, and domain terms; drop stop words, filler, and question
   scaffolding ("what", "can you", "tell me about"). Example:
   "What did I note about the postgres migration rollback?" →
   `postgres migration rollback`.
3. Run `<BM25> search "<keywords>"` with `-n` or `--all`. Do NOT pass
   `--exclude-text` — you need the `text` to answer.
4. **Read the JSON** array. Use the `text` fields of relevant hits to build the
   answer. Judge relevance by whether the text actually addresses the request,
   not by score alone.
5. **Paginate while still relevant.** If a full page returns (count == limit)
   and the LAST result is still relevant to the query, fetch the next page with
   `-s <skip+limit> -l <limit>` (e.g. `-s 10 -l 10`, then `-s 20 -l 10`). Stop
   when a page returns fewer than `limit` results or the tail of the page is no
   longer relevant.
6. **Retry with related terms.** Re-run steps 3–5 using synonyms and related
   keywords for the original terms (e.g. `rollback` → `revert`, `undo`,
   `downgrade`) to catch documents that use different vocabulary. Merge new
   relevant hits, de-duplicating by `document_id`.
7. **Compose the answer** from the collected text. Every statement MUST cite
   the `document_id`(s) of the result(s) it came from — inline after the claim
   and in a Sources list at the end (see Output format). If nothing relevant
   was found after keyword + synonym passes, say so and suggest the user refine
   the query or index more files.

## Output format

Answer in prose, attaching the supporting `document_id`(s) to each claim and
listing every cited document at the end:

```
<answer sentence grounded in a document> [document_id: <id>]
<another claim drawing on two documents> [document_id: <id1>, <id2>]

Sources:
- <id1>
- <id2>
- <id3>
```

Use the exact `document_id` values from the search JSON — never invent, shorten,
or renumber them. Only list a document under Sources if its `text` actually
supported part of the answer.

## Gotchas

- bm25 matches literal tokens — it will NOT infer meaning. A question phrased
  conversationally must be reduced to keywords first or results will be poor.
- Pagination offset is cumulative: page 2 is `-s 10`, page 3 is `-s 20`, not
  `-s 10` twice.
- Higher `score` means a stronger lexical match, but a high score can still be
  off-topic (keyword collision). Always sanity-check `text` against the intent.
- An empty JSON array (`[]`) means no matches — move to synonym retries before
  concluding nothing exists.
- Keep `text` in results; never add `--exclude-text` for this skill.
- De-duplicate across keyword passes by `document_id` so the same document is
  not quoted twice.

## Validation

Before answering, confirm the answer is supported by retrieved `text`, not
model memory. Every claim MUST cite at least one `document_id` you actually
read, and every cited id must exist in the search results (no fabricated or
altered ids). Ensure the final Sources list contains exactly the documents
cited inline. If coverage is thin (few or low-relevance hits), tell the user
what was found and what was missing rather than filling gaps with assumptions.
