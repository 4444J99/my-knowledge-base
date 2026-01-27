# PKB Export Package

This archive contains your processed files in plain Markdown for lightweight storage and PKB (Personal Knowledge Base) use.

## Contents
- `INDEX.md` — Master index linking all files
- `INDEX.csv` — Metadata index (title, path, size, modified)
- `INDEX.json` — Same metadata in JSON
- `README.md` — This file
- Individual `.md` files converted from your uploads
- `functioncalled_repo.md` — Concatenated content of the original `functioncalled_repo.zip`

## Usage
- Drop the folder into an Obsidian, Logseq, or other Markdown-based PKB.
- Use `INDEX.md` for quick navigation.
- Use `INDEX.csv`/`INDEX.json` for scripting, external search, or database ingestion.
- Files are plain text for portability and low resource usage.


## Local search tool
- Run: `python pkb_search.py "your terms"`
- Regex: `python pkb_search.py --re "(metamorph|myth)"`
- AND: `python pkb_search.py --and wave astrology`
- JSON output: `python pkb_search.py --json "gemini export"`
