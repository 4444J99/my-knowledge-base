---
id: b998de73-b811-4775-a719-833aee364ecf
type: insight
created: '2025-11-04T08:20:25.000Z'
document: 35fed1b2e2d94a09b13c5614aa5aa659
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - streaming
  - generatedcontent
  - html
  - prompt
  - this
---
# <div>API Call &amp Streaming (geminiService.ts): The service calls the Gemini AP

## Context
From document: --- --- --- — chunk 9 (chunk 9/16)

## Content
<div>API Call &amp Streaming (geminiService.ts): The service calls the Gemini API's streaming endpoint.</div>
<div>Rendering (App.tsx &amp GeneratedContent.tsx): As HTML chunks arrive, they are appended to the llmContent state, causing the GeneratedContent component to re-render and display the new UI in real-time.</div>
<div>2.3. System Prompt as &quotThe Constitution&quot</div>
<div>The file constants.ts contains a master function getSystemPrompt(). This prompt is the single most critical piece of the application. It provides the LLM with a strict set of rules and instructions, acting as its operating manual. Key instructions include:</div>
<div><br></div>
<div>Role: Act as the OS logic for a desktop simulation.</div>
<div>Output Format: Generate only the inner HTML for a content area. Do not include &lthtml&gt, &ltbody&gt, or &ltstyle&gt tags (with an exception for self-contained games).</div>
<div>Styling: Use a specific, predefined set of Tailwind CSS classes (e.g., .llm-button, .llm-text) to ensure a consistent visual style.</div>
<div>Interactivity: Every interactive element must have a data-interaction-id attribute. This is the primary mechanism for hooking into the interaction loop.</div>



---
*Source: Document 35fed1b2e2d94a09b13c5614aa5aa659*
