---
id: b668cc6a-6e56-46ee-b017-bdb1ad9dcf3c
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
  - insiders
  - uninstall
  - extension
  - 'false'
---
# <div>code-insiders --uninstall-extension richardluo.frosted-glass-theme || true<

## Context
From document: User: fix — chunk 24 (chunk 24/43)

## Content
<div>code-insiders --uninstall-extension richardluo.frosted-glass-theme || true</div>
<div>code-insiders --uninstall-extension ezze.dynamic-base16 || true</div>
<div>```</div>
<div>(Keep `vscode-vibrancy`; verify actual IDs before uninstall.)</div>
<div><br></div>
<div>**Risk Mitigation**</div>
<div>- Profile Isolation: Create a profile `Transparent` containing only: vibrancy extension + core dev tools + single AI assistant.</div>
<div>- Memory Watch: Observe `Code - Insiders Helper (Renderer)` in Activity Monitor before/after changes; sustained reduction &gt50–100MB indicates successful trimming.</div>
<div>- Crash Guard: If you see window artifacting or flicker, toggle:</div>
<div>  - Set `vscode_vibrancy.forceFramelessWindow` → false</div>
<div>  - Remove any residual `apc.*` settings</div>
<div>  - Restart with `code-insiders --disable-extensions` to test baseline.</div>
<div><br></div>
<div>**Quick Fallback (Opaque Mode)**</div>
<div>Create a user snippet `settings-opaque.json`:</div>
<div>```jsonc</div>
<div>{</div>
<div>  &quotvscode_vibrancy.enableAutoTheme&quot: false,</div>
<div>  &quotvscode_vibrancy.forceFramelessWindow&quot: false,</div>
<div>  &quotvscode_vibrancy.opacity&quot: 1</div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
