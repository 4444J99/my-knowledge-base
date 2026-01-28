---
id: 43ae7ea8-df89-4129-aea1-cc16f7df141b
type: insight
created: '2025-12-21T14:37:57.000Z'
document: 21b3da15b421224ca9d912d612ff13de
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: design
keywords:
  - branches
  - branch
  - delete
  - name
  - remote
---
# <div>  - Delete branches only after merging or tagging them.</div>

## Context
From document: Cleaning up disparate branches in a GitHub repository while preserving… — chunk 3 (chunk 3/4)

## Content
<div>  - Delete branches only after merging or tagging them.</div>
<div>  - Delete local branches:</div>
<div>    - `git branch -d branch-name` (if merged).</div>
<div>    - `git branch -D branch-name` (if not merged).</div>
<div>  - Delete remote branches:</div>
<div>    - `git push origin --delete branch-name`.</div>
<div>- [ ] **Clean up tracking references**:</div>
<div>  - Remove references to deleted remote branches:</div>
<div>    - `git remote prune origin`.</div>
<div><br></div>
<div>---</div>
<div><br></div>
<div>### **5. Enforce a Branching Strategy**</div>
<div>To avoid branch sprawl in the future, implement a branching strategy:</div>
<div>- **GitFlow**:</div>
<div>  - Use branches like `main`, `develop`, `feature/*`, and `hotfix/*`.</div>
<div>- **Trunk-Based Development**:</div>
<div>  - Keep only `main` and short-lived feature branches.</div>
<div>- **GitHub Flow**:</div>
<div>  - Use `main` for production and feature branches for active development.</div>
<div>- [ ] Document the branching strategy in a `CONTRIBUTING.md` file.</div>
<div><br></div>
<div>---</div>
<div><br></div>
<div>### **6. Automate Maintenance**</div>
<div>- [ ] Use GitHub Actions or scripts to clean up stale branches automatically:</div>



---
*Source: Document 21b3da15b421224ca9d912d612ff13de*
