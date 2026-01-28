---
id: 32899491-66c5-4abc-b58f-dfb8ac7e66fa
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
  - vscode
  - neovim
  - vibrancy
  - experimental
  - enabled
---
# <div>- `asvetliakov.vscode-neovim` (Lua integration error source).</div>

## Context
From document: User: fix — chunk 6 (chunk 6/43)

## Content
<div>- `asvetliakov.vscode-neovim` (Lua integration error source).</div>
<div>- Window composition mods (`vscode-vibrancy`, fake mica, glass/transparent themes).</div>
<div>- Animation injector (`brandonkirbyson.vscode-animations` via APC Customize UI import).</div>
<div>- Multiple AI stacks simultaneously (Copilot, GitLens AI, Gemini, ChatGPT, Pieces).</div>
<div>- Experimental flags: `workbench.experimental.share.enabled`, `editor.aiStats.enabled`.</div>
<div><br></div>
<div>Mitigation:</div>
<div>- Keep only one AI suggestion engine active.</div>
<div>- Remove external JS imports (`apc.imports`) until stability proven.</div>
<div>- Disable vibrancy until Neovim works reliably.</div>
<div><br></div>
<div>**Post-Reinstall Validation**</div>
<div>1. Launch with `code-insiders --disable-extensions` (ensures core runs).  </div>
<div>2. Open Developer Tools (Help &gt Toggle Developer Tools) and check console for errors.  </div>
<div>3. Verify binary: `codesign -vv /Applications/Visual\ Studio\ Code\ -\ Insiders.app` (should show “valid on disk”).  </div>
<div>4. Open a test folder, ensure file save, formatting, and terminal work.  </div>
<div>5. Enable extensions one by one; observe for Lua errors after enabling Neovim.  </div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
