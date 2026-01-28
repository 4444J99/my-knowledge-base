---
id: b0486f4b-22b3-4c4e-b3c4-1e897e15592e
type: insight
created: '2025-07-05T15:06:03.000Z'
document: af0c0eec9b95a645ff4159ded0dae6bd
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - function
  - replace
  - replacement
  - 7bfilter
  - nodename
---
# Bfilter:%22blockquote%22,replacement:function(e)%7Breturn%20e=e.replace(/%5E%5Cn

## Context
From document: javascript:void%20(()=%3E%7Bvar%20S=(e,t)=%3E()=%3E(t%7C%7Ce((t=%7Bexports… — chunk 3 (chunk 3/16)

## Content
Bfilter:%22blockquote%22,replacement:function(e)%7Breturn%20e=e.replace(/%5E%5Cn+%7C%5Cn+$/g,%22%22),e=e.replace(/%5E/gm,%22%3E%20%22),%22%5Cn%5Cn%22+e+%22%5Cn%5Cn%22%7D%7D;s.list=%7Bfilter:%5B%22ul%22,%22ol%22%5D,replacement:function(e,t)%7Bvar%20r=t.parentNode;return%20r.nodeName===%22LI%22&amp&ampr.lastElementChild===t?%22%5Cn%22+e:%22%5Cn%5Cn%22+e+%22%5Cn%5Cn%22%7D%7D;s.listItem=%7Bfilter:%22li%22,replacement:function(e,t,r)%7Be=e.replace(/%5E%5Cn+/,%22%22).replace(/%5Cn+$/,%22%5Cn%22).replace(/%5Cn/gm,%22%5Cn%20%20%20%20%22);var%20n=r.bulletListMarker+%22%20%20%20%22,i=t.parentNode;if(i.nodeName===%22OL%22)%7Bvar%20a=i.getAttribute(%22start%22),o=Array.prototype.indexOf.call(i.children,t);n=(a?Number(a)+o:o+1)+%22.%20%20%22%7Dreturn%20n+e+(t.nextSibling&amp&amp!/%5Cn$/.test(e)?%22%5Cn%22:%22%22)%7D%7D;s.indentedCodeBlock=%7Bfilter:function(e,t)%7Breturn%20t.codeBlockStyle===%22indented%22&amp&ampe.nodeName===%22PRE%22&amp&ampe.firstChild&amp&ampe.firstChild.nodeName===%22CODE%22%7D,replacement:function(e,t,r)%7Breturn%22%5Cn%5Cn%20%20%20%20%22+t.firstChild.textContent.replace(/%5Cn/g,%22%5Cn%20%20%20%20%22)+%22%5Cn%5Cn%22%7D%7D;s.fencedCodeBlock=%7Bfilter:function(e,t)%7Bretur



---
*Source: Document af0c0eec9b95a645ff4159ded0dae6bd*
