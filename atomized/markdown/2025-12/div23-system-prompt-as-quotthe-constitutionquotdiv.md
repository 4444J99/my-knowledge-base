---
id: 61f0d41e-e096-4376-8d49-01daaac782fb
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
  - instructions
  - specific
  - games
  - game
  - prompt
---
# <div>2.3. System Prompt as &quotThe Constitution&quot</div>

## Context
From document: Gemini OS - Technical Specification Document — chunk 3 (chunk 3/5)

## Content
<div>2.3. System Prompt as &quotThe Constitution&quot</div>
<div>The file constants.ts contains a master function getSystemPrompt(). This prompt is the single most critical piece of the application. It provides the LLM with a strict set of rules and instructions, acting as its operating manual. Key instructions include:</div>
<div><br></div>
<div>Role: Act as the OS logic for a desktop simulation.</div>
<div>Output Format: Generate only the inner HTML for a content area. Do not include &lthtml&gt, &ltbody&gt, or &ltstyle&gt tags (with an exception for self-contained games).</div>
<div>Styling: Use a specific, predefined set of Tailwind CSS classes (e.g., .llm-button, .llm-text) to ensure a consistent visual style.</div>
<div>Interactivity: Every interactive element must have a data-interaction-id attribute. This is the primary mechanism for hooking into the interaction loop.</div>
<div>App-Specific Logic: Detailed instructions for how to behave when a specific application is opened (e.g., how to generate an &ltiframe&gt for Google Maps in the Travel app, or a game menu in the Games app).</div>
<div>Game Generation: Extremely specific instructions for generating self-contained games using an HTML &ltcanvas&gt and an inline &ltscript&gt tag, including how to handle user input (keyboard/mouse) and game loops.</div>



---
*Source: Document 52a4021813e3ca9e026daeb5e2c79650*
