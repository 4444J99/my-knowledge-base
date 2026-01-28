---
id: 511b4fd3-f59d-4c97-8323-ca2f200783b5
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
  - extensions
  - settings
  - your
  - vscode
  - insiders
---
# <div>6. If Neovim still errors, set in settings:  </div>

## Context
From document: User: fix — chunk 7 (chunk 7/43)

## Content
<div>6. If Neovim still errors, set in settings:  </div>
<div>   ```json</div>
<div>   &quotextensions.experimental.affinity&quot: {},</div>
<div>   &quotvscode-neovim.neovimInitVimPaths&quot: []</div>
<div>   ```</div>
<div>   and confirm your `init.lua` uses guarded loads:</div>
<div>   ```lua</div>
<div>   if vim.g.vscode then</div>
<div>     -- VSCode specific (no direct require('vscode') unless plugin supplies it)</div>
<div>   end</div>
<div>   ```</div>
<div><br></div>
<div>**Hardening Tips**</div>
<div>- Keep `settings.json` under version control via a dotfiles repo.</div>
<div>- Monthly: `code-insiders --list-extensions | sort &gt tracked-extensions.txt`.</div>
<div>- Use Profiles for isolating experimental UI themes.</div>
<div>- Consider switching to Stable build for daily work; use Insiders only for preview features.</div>
<div>- Limit simultaneous AI logging; reduce verbose modes for performance.</div>
<div><br></div>
<div>**Optional: Restore Extensions**</div>
<div>```bash</div>
<div>xargs -n1 code-insiders --install-extension &lt ~/vsci-extensions.txt</div>
<div>```</div>
<div>(Review the list first—prune duplicates and high-risk ones.)</div>
<div><br></div>
<div>If you want, I can help craft a safer progressive profile setup or audit your old extension list—just ask. Want me to generate a cleaned version of your original settings with only necessary entries kept?</div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
