---
id: 6b3b6ece-ed7f-4d04-89cb-31497f34c48c
type: insight
created: '2025-11-16T23:05:31.000Z'
document: 509e7ad39ab9185c4fcf1a9c01887c98
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: general
keywords:
  - transparency
  - vscode
  - quot
  - scripts
  - auto
---
# <div>  - Threshold logic: if combined heavy extension size (AI + vibrancy) excee

## Context
From document: User: fix — chunk 39 (chunk 39/43)

## Content
<div>  - Threshold logic: if combined heavy extension size (AI + vibrancy) exceeds `EXT_SIZE_LIMIT_MB` (default 400MB) it applies minimal transparency stack.</div>
<div>  - Supports `DRY_RUN=1` for preview.</div>
<div><br></div>
<div>**Quick Start**</div>
<div>```bash</div>
<div>chmod +x scripts/manage-vscode-transparency.sh</div>
<div>chmod +x scripts/auto-vscode-transparency-runner.sh</div>
<div><br></div>
<div># Run all phases once</div>
<div>./scripts/auto-vscode-transparency-runner.sh --all</div>
<div><br></div>
<div># Dry run</div>
<div>DRY_RUN=1 ./scripts/auto-vscode-transparency-runner.sh --all</div>
<div><br></div>
<div># Just status + conditional apply</div>
<div>./scripts/auto-vscode-transparency-runner.sh --status --maybe-apply</div>
<div>```</div>
<div><br></div>
<div>**LaunchAgent (Optional Scheduling)**</div>
<div>Create `~/Library/LaunchAgents/com.user.vscode.transparency.plist`:</div>
<div>```xml</div>
<div>&lt?xml version=&quot1.0&quot encoding=&quotUTF-8&quot?&gt</div>
<div>&lt!DOCTYPE plist PUBLIC &quot-//Apple//DTD PLIST 1.0//EN&quot &quothttp://www.apple.com/DTDs/PropertyList-1.0.dtd&quot&gt</div>
<div>&ltplist version=&quot1.0&quot&gt</div>
<div>  &ltdict&gt</div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
