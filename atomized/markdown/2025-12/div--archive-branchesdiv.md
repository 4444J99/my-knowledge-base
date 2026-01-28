---
id: cf33bfd2-05de-4fd9-80d1-c4e0498fe769
type: insight
created: '2025-12-21T14:37:57.000Z'
document: 21b3da15b421224ca9d912d612ff13de
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - branches
  - branch
  - main
  - name
  - push
---
# <div>- [ ] **Archive branches**:</div>

## Context
From document: Cleaning up disparate branches in a GitHub repository while preserving… — chunk 2 (chunk 2/4)

## Content
<div>- [ ] **Archive branches**:</div>
<div>  - Push all branches to a backup remote (e.g., `git push backup --all`).</div>
<div>  - Alternatively, zip the `.git` directory or export branches as patches:</div>
<div>    - `git format-patch origin/main..branch-name`.</div>
<div><br></div>
<div>---</div>
<div><br></div>
<div>### **3. Consolidate Branches**</div>
<div>- [ ] **Merge changes into main or other base branches**:</div>
<div>  - For branches with important changes, merge them into the main branch or a designated feature branch.</div>
<div>    - Use `git merge branch-name`.</div>
<div>    - Resolve conflicts as needed.</div>
<div>- [ ] **Rebase small changes**:</div>
<div>  - For branches with minor changes, rebase them onto the main branch to preserve commit history:</div>
<div>    - `git rebase main branch-name`.</div>
<div>- [ ] **Tag important milestones**:</div>
<div>  - For branches that you want to delete but need to preserve history, create tags:</div>
<div>    - `git tag &lttag-name&gt branch-name`.</div>
<div>    - Push tags: `git push origin --tags`.</div>
<div><br></div>
<div>---</div>
<div><br></div>
<div>### **4. Delete Unused/Stale Branches**</div>
<div>- [ ] **Delete safely**:</div>



---
*Source: Document 21b3da15b421224ca9d912d612ff13de*
