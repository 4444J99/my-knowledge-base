---
id: 5ee8ca7f-718b-41bc-8e06-db60e1848996
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
  - repos
  - repo
  - with
  - fork
  - classifies
---
# <div>2. For each repo, determines: is_fork, has_modifications, last_commit_date,

## Context
From document: Contents_Table — chunk 87 (chunk 87/129)

## Content
<div>2. For each repo, determines: is_fork, has_modifications, last_commit_date, commit_count, languages, has_readme</div>
<div>3. Classifies personal repos: GRADUATE (original work), MINE (study forks), ARCHIVE (inactive), DELETE (unused forks)</div>
<div>4. Classifies org repos: PRODUCTION, DEVELOPMENT, EXPERIMENTAL, CONSOLIDATE</div>
<div>5. Generates markdown report with repo inventory, triage recommendations, and actionable next steps</div>
<div>6. Outputs JSON data for knowledge graph integration</div>
<div>```</div>
<div>**(499 characters)**</div>
<div><br></div>
<div>---</div>
<div><br></div>
<div>## **Technical Specifications for Implementation:**</div>
<div><br></div>
<div>### **Core Functionality:**</div>
<div><br></div>
<div>```python</div>
<div># Main components needed:</div>
<div><br></div>
<div>1. GitHub API Integration</div>
<div>   - Authenticate with GitHub token</div>
<div>   - Fetch all repos for user: 4444JPP</div>
<div>   - Fetch all repos for org: ivi374forivi</div>
<div><br></div>
<div>2. Repository Analysis</div>
<div>   - Check if fork (repo.fork == True)</div>
<div>   - Compare fork with upstream (commits ahead/behind)</div>
<div>   - Get last commit date</div>



---
*Source: Document 1c4bd3700bcbc88051a77eec5ea8a017*
