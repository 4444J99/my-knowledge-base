---
id: 669f673e-3b74-426d-a8a6-474d52e40ade
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
  - github
  - branch
  - repository
  - identify
---
# <div>Cleaning up disparate branches in a GitHub repository while preserving all 

## Context
From document: Cleaning up disparate branches in a GitHub repository while preserving… — chunk 1 (chunk 1/4)

## Content
<div>Cleaning up disparate branches in a GitHub repository while preserving all the information involves careful planning and execution. Here's a comprehensive approach:</div>
<div><br></div>
<div>---</div>
<div><br></div>
<div>### **1. Assess the Current State of Branches**</div>
<div>- [ ] **List all branches**:</div>
<div>  - Use the command: `git branch -a` to see all local and remote branches.</div>
<div>  - Alternatively, view the branches on the GitHub UI under the **Branches** tab.</div>
<div>- [ ] **Identify active/inactive branches**:</div>
<div>  - Look for branches that have recent commits or are linked to open pull requests.</div>
<div>  - Identify stale branches with no recent activity (e.g., last updated &gt 6 months ago).</div>
<div>- [ ] **Analyze branch purpose**:</div>
<div>  - Determine the purpose of each branch (e.g., feature, bugfix, experimental, etc.).</div>
<div>- [ ] **Check for unmerged changes**:</div>
<div>  - Use `git log --cherry` or compare branches on GitHub to see if there are unmerged commits.</div>
<div><br></div>
<div>---</div>
<div><br></div>
<div>### **2. Backup All Branches**</div>
<div>- [ ] **Clone the repository**:</div>
<div>  - Run `git clone --mirror &ltrepository-url&gt` to create a full backup of all branches.</div>



---
*Source: Document 21b3da15b421224ca9d912d612ff13de*
