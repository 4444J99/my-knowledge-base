---
id: 3c08f03f-c8e0-4cfc-90c3-a6b0957c5b91
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
  - core
  - vscode
  - after
  - extensions
---
# <div>- Conditional: Vibrancy/Mica (enable only after verifying stability in core

## Context
From document: User: fix — chunk 13 (chunk 13/43)

## Content
<div>- Conditional: Vibrancy/Mica (enable only after verifying stability in core profile), Neovim (enable alone first).</div>
<div>- Remove or Defer: External animation JS import (`apc.imports`), duplicate AI assistants—choose one primary (e.g. Copilot) and disable others initially; set `editor.aiStats.enabled` false unless needed.</div>
<div><br></div>
<div>**Profile Setup**</div>
<div>1. Core Dev Profile:</div>
<div>   - Extensions: `ms-vscode.js-debug`, `ms-python.python` (after clean reinstall), `esbenp.prettier-vscode`, `dbaeumer.vscode-eslint`, `ms-vscode.theme-defaults`, one AI assistant.</div>
<div>   - Settings: Minimal baseline + formatting + autosave.</div>
<div>2. Cosmetic Profile:</div>
<div>   - Add vibrancy, animations, mica, Peacock, dynamic base16, cursor animation, Neovim (after confirmed stable).</div>
<div>   - Start from Core Dev profile export, then layer cosmetic keys.</div>
<div><br></div>
<div>**Appearance Preservation Checklist**</div>
<div>- Export current settings: `code-insiders --profile &ltCurrentProfileName&gt --show-versions --list-extensions &gt current-profile-extensions.txt`</div>
<div>- Copy existing `settings.json` for reference.</div>
<div>- Create new profiles (Command Palette: “Preferences: Create Profile”) naming them `Core Dev` and `Cosmetic`.</div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
