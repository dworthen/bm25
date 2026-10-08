---
name: bm25-index
description: >
  Index or reindex files with the bm25 CLI by translating a natural-language
  request into the correct `bm25 index` invocation. Use when the user wants to
  index, reindex, or refresh a bm25 index — e.g. "index all", "index notes",
  "index ./docs as notes", "reindex notes", "index notes in batches of 100", or
  "index my markdown but skip drafts". Maps a named index or an "all" request,
  plus optional source directory, include/exclude globs, batch size, and
  concurrency, onto the CLI flags. Always resolves the bm25 binary via the
  bm25-install skill first. USE FOR: index files, reindex, refresh index, build
  bm25 index, index a folder, index all indexes, index notes.
---

# bm25 Index

## Goal

Translate an indexing request into a correct `bm25 index` command, run it, and
report the result. Always resolve the binary path first; never assume `bm25` is
on PATH.

## Prerequisite: resolve the binary

Run the `bm25-install` skill to get the invocation path (`BM25`). Use that path
in place of `bm25` in every command below.

## Command shape

```
<BM25> index [<source-directory>] [-n <name>] [-i <glob> ...] [-e <glob> ...] [-b <n>] [-c <n>]
```

| Intent           | Flag               | Notes                          |
| ---------------- | ------------------ | ------------------------------ |
| Index name       | `-n <name>`        | Required unless indexing all   |
| Source directory | positional `<dir>` | When present, `-i` is required |
| Include glob     | `-i <glob>`        | Repeatable; quote globs        |
| Exclude glob     | `-e <glob>`        | Repeatable; quote globs        |
| Batch size       | `-b <n>`           | Integer > 0                    |
| Concurrency      | `-c <n>`           | Integer                        |

## Process

1. Resolve `BM25` via the `bm25-install` skill.
2. Decide the mode from the request:
   - **Index all** ("index all", "reindex everything") → `<BM25> index` with no
     flags. Note: reindexing all does not stream results to the CLI; tell the
     user to check `<BM25> cron logs` for output.
   - **Named** ("index notes", "reindex notes") → `<BM25> index -n <name>`. This
     reindexes an existing index using its saved directories/settings.
   - **New / full definition** ("index <dir> as <name> ...") → include the
     positional `<dir>`, `-n <name>`, and at least one `-i` glob.
3. Append optional `-i`, `-e`, `-b`, `-c` flags as requested. Quote every glob
   so the shell does not expand it.
4. Run the command and relay stdout/stderr to the user.
5. If it errors (see Gotchas), work with the user to supply the missing piece,
   then re-run.

## Mapping examples

| Request                                                                               | Command                                                                            |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| index all                                                                             | `<BM25> index`                                                                     |
| index notes                                                                           | `<BM25> index -n notes`                                                            |
| Index ./docs as notes                                                                 | `<BM25> index ./docs -n notes -i "**/*"` (ask for include if unstated)             |
| Index ./docs as notes include **/\*.md and **/_.txt but exclude \*\*/_.in-progress.md | `<BM25> index ./docs -n notes -i "**/*.md" -i "**/*.txt" -e "**/*.in-progress.md"` |
| Index notes in batches of 100                                                         | `<BM25> index -n notes -b 100`                                                     |
| Index notes with concurrency 4                                                        | `<BM25> index -n notes -c 4`                                                       |

## Gotchas

- **Name is mandatory for a single index.** Running `index` with neither a name
  nor a directory triggers a reindex of ALL indexes, not an error. Only drop
  `-n` when the user explicitly asked to index everything.
- **A source directory requires `-i`.** If the user gives a directory but no
  include pattern, ask for one before running — the CLI exits with
  "Include pattern is required when specifying a source directory."
- **Reindex-by-name needs an existing index.** `index -n <name>` with no
  directory fails if `<name>` was never created. If the CLI reports the index
  is missing, ask the user for the source directory and include globs, then run
  the full form to create it.
- **Globs must be quoted** (`"**/*.md"`) so the shell passes them literally.
- **Batch size must be > 0**; the CLI rejects `-b 0` or negative values.
- Watch for a typo in include extensions (e.g. `.tx` vs `.txt`) — confirm the
  user's intended globs.

## Validation

After running, confirm the command exited 0 and surface the summary lines
("Indexed N files.", "Total documents in the index: ...") to the user. If the
run reported per-file errors, relay the count and ask whether to investigate.
For an "index all" run, remind the user that detailed output is in
`<BM25> cron logs`.
