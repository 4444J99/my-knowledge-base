---
id: a8d6b059-81f2-4955-b93c-1081d5fe484b
type: insight
created: '2025-11-23T22:21:12.000Z'
document: f75193c56b19a08e9a1a9ea52ee44833
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: general
keywords:
  - stream
  - cursor
  - cluster_index
  - clusters
  - cluster_len
---
# <div>$CLUSTER_PATTERN = [1,2,4,8,4,2,1,2]</div>

## Context
From document: Here is a reusable, parameterized algorithm you can use to recreate… — chunk 6 (chunk 6/8)

## Content
<div>$CLUSTER_PATTERN = [1,2,4,8,4,2,1,2]</div>
<div>$DASH_PATTERN    = [1,2,4,8,4,2,1,2]</div>
<div>$MAX_CLUSTERS    = N</div>
<div>$MAX_STREAM_LEN  = M</div>
<div>  2.  Build Fibonacci stream</div>
<div><br></div>
<div>$STREAM = “”</div>
<div>i = 0</div>
<div>while length($STREAM) &lt $MAX_STREAM_LEN:</div>
<div>glyph    = $GLYPH_CYCLE[i mod len($GLYPH_CYCLE)]</div>
<div>run_len  = $FIB_COUNTS[i]</div>
<div>STREAM   = STREAM + glyph * run_len</div>
<div>i        = i + 1</div>
<div>  3.  Slice clusters</div>
<div><br></div>
<div>$CLUSTERS = []</div>
<div>cursor = 0</div>
<div>cluster_index = 0</div>
<div><br></div>
<div>while cluster_index &lt $MAX_CLUSTERS and cursor &lt length($STREAM):</div>
<div>cluster_len = $CLUSTER_PATTERN[cluster_index mod len($CLUSTER_PATTERN)]</div>
<div>if cursor + cluster_len &gt length($STREAM):</div>
<div>break</div>
<div>cluster = STREAM[cursor : cursor + cluster_len]</div>
<div>CLUSTERS.append(cluster)</div>
<div>cursor = cursor + cluster_len</div>
<div>cluster_index = cluster_index + 1</div>
<div>  4.  Create dash units</div>
<div><br></div>
<div>$DASHES = []</div>
<div><br></div>
<div>for k in range(0, len(CLUSTERS) - 1):</div>
<div>dash_len  = $DASH_PATTERN[k mod len($DASH_PATTERN)]</div>



---
*Source: Document f75193c56b19a08e9a1a9ea52ee44833*
