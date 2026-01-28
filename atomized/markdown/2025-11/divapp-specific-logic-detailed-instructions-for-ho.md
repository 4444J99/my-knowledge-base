---
id: 808fb15e-c66d-464e-a535-0f281b9df477
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
  - user
  - specific
  - game
  - html
  - instructions
---
# <div>App-Specific Logic: Detailed instructions for how to behave when a specific

## Context
From document: --- --- --- — chunk 10 (chunk 10/16)

## Content
<div>App-Specific Logic: Detailed instructions for how to behave when a specific application is opened (e.g., how to generate an &ltiframe&gt for Google Maps in the Travel app, or a game menu in the Games app).</div>
<div>Game Generation: Extremely specific instructions for generating self-contained games using an HTML &ltcanvas&gt and an inline &ltscript&gt tag, including how to handle user input (keyboard/mouse) and game loops.</div>
<div>2.4. Statefulness (Caching)</div>
<div>To improve performance and provide a more stable user experience, the app features an optional &quotStatefulness&quot mode.</div>
<div><br></div>
<div>When enabled, every generated screen (HTML content) is cached in a simple key-value store (appContentCache in App.tsx).</div>
<div>The key is a stringified representation of the user's interaction path (e.g., &quotdocuments__folder_projects__file_report_q1&quot).</div>
<div>If a user navigates to a path that has already been visited, the cached HTML is served immediately instead of making a new API call. This makes navigation feel instantaneous.</div>
<div>3. Architecture &amp Component Breakdown</div>
<div>App.tsx (The Conductor)</div>
<div>Role: The main stateful component that orchestrates the entire application.</div>



---
*Source: Document 35fed1b2e2d94a09b13c5614aa5aa659*
