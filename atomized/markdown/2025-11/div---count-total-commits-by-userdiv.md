---
id: 18c2d80c-748f-453e-8b40-1f2f49a0c14d
type: insight
created: '2025-11-03T01:41:42.000Z'
document: 1c4bd3700bcbc88051a77eec5ea8a017
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - commits
  - days
  - repo
  - fork
  - with
---
# <div>   - Count total commits by user</div>

## Context
From document: Contents_Table — chunk 88 (chunk 88/129)

## Content
<div>   - Count total commits by user</div>
<div>   - Extract languages used</div>
<div>   - Check for README existence</div>
<div>   - Get repo creation date</div>
<div><br></div>
<div>3. Classification Logic</div>
<div>   Personal Repos:</div>
<div>   - GRADUATE: Not a fork OR fork with 10+ commits by user</div>
<div>   - MINE: Fork with 0-3 commits, last activity &lt 90 days</div>
<div>   - ARCHIVE: Original repo, no activity &gt 180 days</div>
<div>   - DELETE: Fork with 0 commits, no activity &gt 180 days</div>
<div><br></div>
<div>   Org Repos:</div>
<div>   - PRODUCTION: Has releases OR commits in last 30 days</div>
<div>   - DEVELOPMENT: Commits in last 90 days</div>
<div>   - EXPERIMENTAL: Commits 90-180 days ago</div>
<div>   - CONSOLIDATE: Similar names/purposes detected</div>
<div><br></div>
<div>4. Report Generation</div>
<div>   - Markdown summary with tables</div>
<div>   - JSON export for programmatic use</div>
<div>   - Visual stats (repo counts by category)</div>
<div>   - Actionable recommendations</div>
<div>```</div>
<div><br></div>
<div>---</div>
<div><br></div>
<div>## **File Structure:**</div>
<div><br></div>
<div>```</div>
<div>repo-audit-and-triage-tool/</div>



---
*Source: Document 1c4bd3700bcbc88051a77eec5ea8a017*
