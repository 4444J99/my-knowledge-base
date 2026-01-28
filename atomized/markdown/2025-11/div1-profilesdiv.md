---
id: a1c99fb0-d263-47e7-a6a9-d5ab04d8f1f5
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
  - profile
  - pylance
  - vscode
  - profiles
  - create
---
# <div>1. Profiles:</div>

## Context
From document: User: fix — chunk 30 (chunk 30/43)

## Content
<div>1. Profiles:</div>
<div>   - Create `Core Dev` profile (Command Palette: Profiles: Create). Enable just: Copilot OR Gemini (pick one), GitLens, Python, Pylance, YAML, Docker/Kubernetes if needed.</div>
<div>   - Keep transparency profile separate (`Transparent`) with vibrancy extension added.</div>
<div>2. Extension Hygiene:</div>
<div>   - Uninstall or disable extra AI stacks you’re not actively comparing (e.g. ChatGPT, Gemini, Windows AI Studio) in `Core Dev` profile.</div>
<div>   - Remove duplicate Pylance versions (old folder). In Extensions, uninstall/reinstall Pylance to clear stale directory.</div>
<div>3. Neovim Stability:</div>
<div>   - In your Neovim `init.lua`: wrap VSCode-specific requires:</div>
<div>     ```lua</div>
<div>     if vim.g.vscode then</div>
<div>       -- VSCode-specific config only</div>
<div>     end</div>
<div>     ```</div>
<div>   - VS Code settings: remove `extensions.experimental.affinity` unless you need CPU pinning.</div>
<div>4. Transparency Optimization:</div>
<div>   - In settings, set:</div>
<div>     ```jsonc</div>
<div>     &quotvscode_vibrancy.forceFramelessWindow&quot: false,</div>
<div>     &quotvscode_vibrancy.refreshInterval&quot: 0,</div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
