---
id: 56bfa357-354e-4bf8-85fe-404f11b61eb9
type: insight
created: '2025-11-16T23:05:31.000Z'
document: 509e7ad39ab9185c4fcf1a9c01887c98
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: design
keywords:
  - quot
  - 'false'
  - 'true'
  - enabled
  - copilot
---
# <div>  &quoteditor.inlineSuggest.enabled&quot: true,</div>

## Context
From document: User: fix — chunk 34 (chunk 34/43)

## Content
<div>  &quoteditor.inlineSuggest.enabled&quot: true,</div>
<div>  &quotgithub.copilot.enableAutoCompletions&quot: true,          // if keeping Copilot for inline; else false</div>
<div>  &quotgeminicodeassist.inlineSuggestions.nextEditPredictions&quot: false, // disable one advanced predictor</div>
<div>  &quotchatgpt.inlineCompletion.enabled&quot: false,             // pick ONE provider at a time</div>
<div><br></div>
<div>  // Reduce verbosity</div>
<div>  &quotgeminicodeassist.verboseLogging&quot: false,</div>
<div>  &quotchatgpt.debug&quot: false,</div>
<div>  &quotgitlens.ai.debug&quot: false,</div>
<div><br></div>
<div>  // Prevent auto-opening multiple panes</div>
<div>  &quotchatgpt.openOnStartup&quot: false,</div>
<div>  &quotgeminicodeassist.agentDebugMode&quot: false,</div>
<div><br></div>
<div>  // Limit AI to focused languages</div>
<div>  &quotgithub.copilot.enable&quot: { &quotmarkdown&quot: false, &quottypescript&quot: true, &quotjavascript&quot: true }</div>
<div>}</div>
<div>```</div>
<div>(Flip booleans per your preference; core idea: only one inline engine active.)</div>
<div><br></div>
<div>**Profile Strategy (Keep All, Control Activation)**</div>
<div>- Profile `AI Full`: all three enabled (experiment zone).</div>



---
*Source: Document 509e7ad39ab9185c4fcf1a9c01887c98*
