---
id: 791e9246-7b86-49bd-94d7-78f06f166730
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
  - prompt
  - repo_root
  - archive_root
  - live
  - prompt_root
---
# <div>Prompts: canonical prompt templates live in $PROMPT_ROOT and may be copied 

## Context
From document: 0.	Preamble and Scope — chunk 21 (chunk 21/31)

## Content
<div>Prompts: canonical prompt templates live in $PROMPT_ROOT and may be copied or referenced in $REPO_ROOT/$ORG_ID/tools or os-foundation for integration.</div>
<div>Generated code and assets: live in $REPO_ROOT under appropriate repositories, with references back to corresponding archive IDs and prompt IDs in code comments or metadata.</div>
<div><br></div>
<div>A future AI working on a feature must:</div>
<div><br></div>
<div>Start from a WORKFLOW-PROCGEN-PROMPT or similar template in $PROMPT_ROOT.</div>
<div>Fetch relevant background from $ARCHIVE_ROOT using manifest indices.</div>
<div>Create or update files in a feature/{…} branch in $REPO_ROOT.</div>
<div>Emit a SEAL for each major artifact and record changes in $ARCHIVE_ROOT/sessions and $ARCHIVE_ROOT/specs as needed.</div>
<div><br></div>
<div>────────────────────────</div>
<div>6. Universal Naming Conventions</div>
<div><br></div>
<div>6.1 Grammar Definition</div>
<div><br></div>
<div>The standard naming pattern is:</div>
<div><br></div>
<div>LAYER-DOMAIN-TYPE-ID-VERSION</div>
<div><br></div>
<div>LAYER is one of: VISION, SYSTEM, WORLD, STORY, WORKFLOW, CONTINUITY, SEAL.</div>
<div>DOMAIN indicates the conceptual organ: META, MYTH, WAVE, RECURSION, PROCGEN, ARCHIVE, OS, AGENT, or other clearly defined expansions.</div>



---
*Source: Document b3360b527d494aeb150b316c90472eb0*
