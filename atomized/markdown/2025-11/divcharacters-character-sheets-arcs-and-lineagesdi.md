---
id: 0b8a5e28-0fd2-4ffe-ba9e-a5623fe8ebc6
type: insight
created: '2025-11-24T08:31:56.000Z'
document: b3360b527d494aeb150b316c90472eb0
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: research
keywords:
  - prompt_root
  - prompt
  - character
  - specs
  - each
---
# <div>Characters: character sheets, arcs, and lineages.</div>

## Context
From document: 0.	Preamble and Scope — chunk 11 (chunk 11/31)

## Content
<div>Characters: character sheets, arcs, and lineages.</div>
<div>Specs: historical versions of specs, proposals, and decisions.</div>
<div>Meta: indices, manifests, and continuity maps.</div>
<div><br></div>
<div>Each artifact under $ARCHIVE_ROOT uses the naming grammar and carries a SEAL, so that it is self-describing even if isolated.</div>
<div><br></div>
<div>2.4 $PROMPT_ROOT Structure</div>
<div><br></div>
<div>$PROMPT_ROOT is the library of prompt templates and handoff shells. It is not a transcript archive; it contains parameterized templates that reference $OS_ROOT and $ARCHIVE_ROOT.</div>
<div><br></div>
<div>A minimal structure:</div>
<div><br></div>
<div>$PROMPT_ROOT/system</div>
<div>$PROMPT_ROOT/world</div>
<div>$PROMPT_ROOT/workflow</div>
<div>$PROMPT_ROOT/character</div>
<div>$PROMPT_ROOT/analysis</div>
<div><br></div>
<div>Each directory holds prompt files named using the LAYER-DOMAIN-TYPE-ID-VERSION grammar, with TYPE set to PROMPT.</div>
<div><br></div>
<div>For example:</div>
<div>WORKFLOW-PROCGEN-PROMPT-SEEDWORLD-0001-v0_1</div>
<div><br></div>
<div>2.5 $REPO_ROOT and $ORG_ID</div>
<div><br></div>
<div>$REPO_ROOT holds clones or working copies of all repositories under the neutral organization $ORG_ID. At minimum assume:</div>



---
*Source: Document b3360b527d494aeb150b316c90472eb0*
