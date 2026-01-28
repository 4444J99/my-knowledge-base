---
id: 32f2ea02-5ddc-4ac5-970b-ac48a1656d87
type: insight
created: '2025-12-21T15:19:51.000Z'
document: 52a4021813e3ca9e026daeb5e2c79650
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - data
  - interaction
  - generatedcontent
  - state
  - prompt
---
# <div>2. Core Concepts</div>

## Context
From document: Gemini OS - Technical Specification Document — chunk 2 (chunk 2/5)

## Content
<div>2. Core Concepts</div>
<div>2.1. Dynamic UI Generation</div>
<div>The fundamental principle is that the LLM acts as the &quotapplication logic&quot and &quotUI renderer&quot simultaneously. It does not return data to be formatted by client-side templates; it returns the complete HTML view layer itself.</div>
<div><br></div>
<div>2.2. The Interaction Loop</div>
<div>Every user action initiates a round-trip to the LLM.</div>
<div><br></div>
<div>User Action: A click on an element with a data-interaction-id attribute.</div>
<div>Data Capture (GeneratedContent.tsx): A generic event listener captures the click, packages relevant attributes (id, type, value, appContext) into an InteractionData object.</div>
<div>State Management (App.tsx): The main App component receives this object, updates its interactionHistory state, and triggers the API call.</div>
<div>Prompt Construction (geminiService.ts): A detailed prompt is assembled, combining a master system prompt, the current interaction details, and a summary of recent past interactions.</div>
<div>API Call &amp Streaming (geminiService.ts): The service calls the Gemini API's streaming endpoint.</div>
<div>Rendering (App.tsx &amp GeneratedContent.tsx): As HTML chunks arrive, they are appended to the llmContent state, causing the GeneratedContent component to re-render and display the new UI in real-time.</div>



---
*Source: Document 52a4021813e3ca9e026daeb5e2c79650*
