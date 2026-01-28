---
id: 319271b5-ecc1-47ce-84de-57c719ea4053
type: insight
created: '2025-11-24T08:31:56.000Z'
document: b3360b527d494aeb150b316c90472eb0
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - specs
  - org_id
  - world
  - archive_root
  - branch
---
# <div>$ORG_ID/worlds – world-specific assets, such as generative rules, datasets,

## Context
From document: 0.	Preamble and Scope — chunk 20 (chunk 20/31)

## Content
<div>$ORG_ID/worlds – world-specific assets, such as generative rules, datasets, and narrative scripts.</div>
<div>$ORG_ID/tools – utilities for interacting with $ARCHIVE_ROOT and $PROMPT_ROOT.</div>
<div>$ORG_ID/docs – human-readable documentation and curated narratives derived from archive materials.</div>
<div><br></div>
<div>5.2 Branch Model and Pull Requests</div>
<div><br></div>
<div>Branch policy:</div>
<div><br></div>
<div>main: always in a state where another AI or human can safely adopt this OS; aligned with latest stable specs.</div>
<div>dev: integration branch where features mature.</div>
<div>feature/{world-id}-{short-description}: per-feature branches anchored to a world or OS context.</div>
<div><br></div>
<div>Pull request requirements:</div>
<div><br></div>
<div>Title should follow, or at least reference, the naming grammar.</div>
<div>Description must include at least one $ARCHIVE_ROOT/specs or $ARCHIVE_ROOT/meta ID that justifies the change.</div>
<div>Checklist includes a reminder to update relevant manifests and, where needed, prompts in $PROMPT_ROOT.</div>
<div><br></div>
<div>5.3 Mapping Prompts, Specs, and Generated Code</div>
<div><br></div>
<div>Specs: canonical spec files live in $OS_ROOT/specs and are mirrored in $REPO_ROOT/$ORG_ID/os-foundation/specs for implementation reference.</div>



---
*Source: Document b3360b527d494aeb150b316c90472eb0*
