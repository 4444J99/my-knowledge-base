---
id: 2e66f64b-98c3-429a-89df-a6b827cd037f
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
  - vscode
  - user
  - transparency
  - want
  - load
---
# <div>Load it:</div>

## Context
From document: User: fix — chunk 41 (chunk 41/43)

## Content
<div>Load it:</div>
<div>```bash</div>
<div>launchctl load ~/Library/LaunchAgents/com.user.vscode.transparency.plist</div>
<div># To unload:</div>
<div>launchctl unload ~/Library/LaunchAgents/com.user.vscode.transparency.plist</div>
<div>```</div>
<div><br></div>
<div>**Adjust Thresholds**</div>
<div>Set env vars:</div>
<div>```bash</div>
<div>VSCT_RUNNER_EXT_SIZE_LIMIT_MB=500 VSCT_RUNNER_MIN_FREE_GB=1 \</div>
<div>./scripts/auto-vscode-transparency-runner.sh --all</div>
<div>```</div>
<div><br></div>
<div>**Log Location**</div>
<div>- Status &amp actions logged under `~/vscode-insiders-maintenance/logs/`</div>
<div>- Old logs auto-pruned after 7 days (adjust with `VSCT_RUNNER_ROTATE_DAYS`).</div>
<div><br></div>
<div>**Next Enhancements (Optional)**</div>
<div>- Add JSON summary output for integration with other monitoring.</div>
<div>- Email/notification when threshold triggers.</div>
<div>- Add a phase to prune old duplicate extension versions automatically.</div>
<div><br></div>
<div>Let me know if you want any of those additions; I can implement them.</div>
<div><br></div>
<div>Made changes.</div>
<div><br></div>
<div>User: i need you to make this easy as pie for me, i want you to take over and take care of this it is simple; just give me a todo list and ill give it to gemini; i dont want your solutions; just the issues</div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
