---
id: 4bc1866d-3da7-469e-8e63-4398667a79fa
type: insight
created: '2025-05-15T00:56:03.000Z'
document: 084f9bc77d1d8854a07a52206c286278
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: general
keywords:
  - quot
  - name
  - move
  - zip_file
  - md_file
---
# <div>for item in current_dir.iterdir():</div>

## Context
From document: Grokking Algorithms for OS — chunk 362 (chunk 362/402)

## Content
<div>for item in current_dir.iterdir():</div>
<div>    shutil.move(str(item), active_core_dir / item.name)</div>
<div><br></div>
<div># Rename `KN-LR_01-00_learning-recursions 2` to `ARCHIVE_ITERATIONS/v1a_raw`</div>
<div>(current_dir).rename(archive_dir / &quotv1a_raw&quot)</div>
<div><br></div>
<div># Move .zip files to EXPORTS or TEMPLATES accordingly</div>
<div>for zip_file in root.glob(&quot*.zip&quot):</div>
<div>    name = zip_file.name</div>
<div>    if &quotFORK_TEMPLATE&quot in name or &quotL1_LEARNING_CORE&quot in name:</div>
<div>        shutil.move(str(zip_file), templates_dir / name)</div>
<div>    else:</div>
<div>        shutil.move(str(zip_file), exports_dir / name)</div>
<div><br></div>
<div>&quotRESTRUCTURE_FOLDER_TREE_COMPLETE&quot</div>
<div>Result</div>
<div>undefined</div>
<div>Analyzed</div>
<div># List all .md files inside the new ACTIVE_CORE directory</div>
<div>active_md_files = []</div>
<div>for md_file in active_core_dir.rglob(&quot*.md&quot):</div>
<div>    active_md_files.append({</div>
<div>        &quotfile&quot: str(md_file.relative_to(active_core_dir)),</div>
<div>        &quotsize_bytes&quot: md_file.stat().st_size,</div>
<div>        &quotempty&quot: md_file.stat().st_size == 0</div>



---
*Source: Document 084f9bc77d1d8854a07a52206c286278*
