# BM25

A CLI for searching local files with [bm25](https://mbrenndoerfer.com/writing/bm25-search-algorithm-elasticsearch-implementation#key-parameters) because [grep is all you need](https://arxiv.org/abs/2605.15184).

> [!WARNING]
> This is fun side project to expore the bm25 search algorithm. This repo is not accepting issues or PRs.

## Install

- Requires [gh cli](https://cli.github.com/manual/) for installation.

### Windows (PowerShell)

```powershell
gh api "repos/dworthen/bm25/contents/scripts/install.ps1" -H "Accept: application/vnd.github.raw" | Out-String | iex
```

### macOS, Linux, and WSL

```bash
gh api "repos/dworthen/bm25/contents/scripts/install.sh" -H "Accept: application/vnd.github.raw" | bash
```

## Indexing

```shell
bm25 index <path_to_directory> --name notes --include "**/*.md"
# Reindex a specific index
bm25 index -n notes
# Reindex all indexes
bm25 index
# Reindexing all indexes does not output results to the cli.
# Instead view logs with
bm25 cron logs
```

Reindexing indexes new files or files that have changed.

## Search

```shell
bm25 search <query> -n notes
# Search all indexes
bm25 search <query> --all
# Exclude document text. Get only search rankings.
bm25 search <query> --all --exclude-text
```

## Cron

```shell
# Start. Reindexes all indexes on a schedule
bm25 crom start
# Specify schedule. Runs every 5 minutes
# view https://bun.com/docs/runtime/cron for more details
bm25 cron start -s "*/5 * * * *"
# Check status
bm25 cron status
# Stop
bm25 cron stop
# View logs
bm25 cron logs
```

## Skills

Installing with [ghd](https://github.com/dworthen/ghd)

```shell
ghd pull dworthen/bm25/.agents/skills .agents/skills
```

### Index

```text
/bm25-index index some_dir as notes
/bm25-index reindex notes
/bm25-index reindex all
```

### Query

```text
# specify index
/bm25-query What is X from my notes
/bm25-query Search my notes for tools that can help manage agents.
# Search all indexes
/bm25-query Some query
```
