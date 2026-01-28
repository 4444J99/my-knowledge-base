---
id: 7f992ddd-38f4-407b-b0da-c29b38a7ee2b
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
  - final
  - output
  - clusters
  - dashes
  - step
---
# <div>Final = Forward_half + Reverse_half</div>

## Context
From document: Here is a reusable, parameterized algorithm you can use to recreate… — chunk 5 (chunk 5/8)

## Content
<div>Final = Forward_half + Reverse_half</div>
<div><br></div>
<div>────────────────────</div>
<div>6. Final concatenation into one line</div>
<div>────────────────────</div>
<div><br></div>
<div>Goal: consolidate $CLUSTERS and $DASHES into the final polyrhythmic string.</div>
<div><br></div>
<div>Step 6.1</div>
<div>Initialize:</div>
<div>$OUTPUT = “”</div>
<div><br></div>
<div>Step 6.2</div>
<div>For i from 0 to length($CLUSTERS) - 1:</div>
<div>  1.  Append $CLUSTERS[i] to $OUTPUT</div>
<div>  2.  If i &lt length($DASHES), append $DASHES[i] to $OUTPUT</div>
<div><br></div>
<div>If you are using mirroring, do Step 6.2 for the forward half, then build the mirrored half from the same logic and append.</div>
<div><br></div>
<div>Result: $OUTPUT is your final 4/j/P polyrhythmic line with Fibonacci voice-leading and 1–2–4–8–4–2–1–2 dash symmetry.</div>
<div><br></div>
<div>────────────────────</div>
<div>7. Compact pseudocode version</div>
<div>────────────────────</div>
<div><br></div>
<div>You can translate this directly to Python, JS, etc.</div>
<div>  1.  Parameters</div>
<div><br></div>
<div>$GLYPH_CYCLE    = [“4”, “j”, “P”]</div>
<div>$FIB_COUNTS     = [1,2,3,5,8,13,21,34,…]</div>



---
*Source: Document f75193c56b19a08e9a1a9ea52ee44833*
