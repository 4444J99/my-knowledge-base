---
id: ccef10f6-91e9-4d9d-b760-3036cc44017b
type: insight
created: '2025-11-16T23:05:31.000Z'
document: 509e7ad39ab9185c4fcf1a9c01887c98
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - code
  - windows
  - studio
  - copilot
  - neovim
---
# <div>- Neovim error stems from a config or plugin trying to `require('vscode')` 

## Context
From document: User: fix — chunk 29 (chunk 29/43)

## Content
<div>- Neovim error stems from a config or plugin trying to `require('vscode')` outside the VS Code shim; that’s a configuration guard issue, not binary damage.</div>
<div><br></div>
<div>**Current Heavy Extensions (Top Size Drivers)**</div>
<div>- `openai.chatgpt` ~316M</div>
<div>- `google.geminicodeassist` ~258M</div>
<div>- `vscjava.migrate-java-to-azure` ~238M</div>
<div>- `ms-windows-ai-studio.windows-ai-studio` ~167M</div>
<div>- Pylance duplicated directories (~87–90M each; prune older)</div>
<div>- Copilot + Copilot Chat (73M + 57M) — dual AI stack</div>
<div>- Gemini + ChatGPT + Copilot + Windows AI Studio: four AI-related code assistants concurrently</div>
<div>- Cosmetic layers have been reduced already (Peacock, APC, animations, dynamic base16 removed); vibrant transparency is retained with one provider.</div>
<div><br></div>
<div>**Why This Matters**</div>
<div>Multiple AI assistants and large language toolchains load background processes, increase activation events, and raise memory usage. Combined with vibrancy (extra compositing) and Neovim (embedded RPC bridge), intermittent lag or errors can appear, misread as “corruption.”</div>
<div><br></div>
<div>**Actions You Can Take Entirely Inside VS Code (No External Script Needed)**</div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
