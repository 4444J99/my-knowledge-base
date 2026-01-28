---
id: fa1a0d46-372c-42e9-8461-5ce35bb54f40
type: insight
created: '2025-11-24T08:31:56.000Z'
document: b3360b527d494aeb150b316c90472eb0
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: general
keywords:
  - list
  - artifacts
  - organization
  - repositories
  - org_id
---
# <div>Use the naming grammar to infer meaning even if tags are sparse.</div>

## Context
From document: 0.	Preamble and Scope — chunk 19 (chunk 19/31)

## Content
<div>Use the naming grammar to infer meaning even if tags are sparse.</div>
<div>Update manifests atomically when adding or superseding artifacts.</div>
<div><br></div>
<div>4.4 Cross-Linking Practices</div>
<div><br></div>
<div>Within each artifact, the SEAL must include:</div>
<div><br></div>
<div>self_id – LAYER-DOMAIN-TYPE-ID-VERSION string.</div>
<div>world_ids – list of world IDs touched.</div>
<div>character_ids – list of character IDs affected, if any.</div>
<div>depends_on – list of IDs for prior artifacts.</div>
<div>emits – optional list of IDs for newly created artifacts in the same run.</div>
<div>next_prompt_path – pointer into $PROMPT_ROOT for follow-up prompts, if applicable.</div>
<div><br></div>
<div>These fields permit later graph reconstruction without external databases.</div>
<div><br></div>
<div>────────────────────────</div>
<div>5. Git Organization and Repository Patterns</div>
<div><br></div>
<div>5.1 Organization Namespace and Repositories</div>
<div><br></div>
<div>Assume a neutral organization identifier:</div>
<div><br></div>
<div>$ORG_ID</div>
<div><br></div>
<div>Repositories:</div>
<div><br></div>
<div>$ORG_ID/os-foundation – scripts, libraries, and configs implementing OS workflows and automations.</div>



---
*Source: Document b3360b527d494aeb150b316c90472eb0*
