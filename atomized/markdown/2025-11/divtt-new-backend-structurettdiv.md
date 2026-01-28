---
id: 82419301-af2f-4042-9f99-885ecd10d0e5
type: insight
created: '2025-11-05T21:42:26.000Z'
document: 42efb0f415b2f324521d2959a50f91bf
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - tier
  - worker
  - prospects
  - enrich
  - post
---
# <div><tt>// New backend structure:</tt></div>

## Context
From document: data enrichment strategy for ucc-mca intelligence platform — chunk 13 (chunk 13/32)

## Content
<div><tt>// New backend structure:</tt></div>
<div><tt>server/</tt></div>
<div><tt>  ├── api/</tt></div>
<div><tt>  │   ├── prospects.ts        // GET /api/prospects</tt></div>
<div><tt>  │   ├── enrich.ts           // POST /api/enrich</tt></div>
<div><tt>  │   └── webhooks.ts         // POST /api/webhooks (for real-time alerts)</tt></div>
<div><tt>  ├── workers/</tt></div>
<div><tt>  │   ├── scraper-worker.ts   // Background scraping jobs</tt></div>
<div><tt>  │   ├── enrichment-worker.ts</tt></div>
<div><tt>  │   └── monitoring-worker.ts</tt></div>
<div><tt>  ├── db/</tt></div>
<div><tt>  │   ├── schema.sql</tt></div>
<div><tt>  │   └── migrations/</tt></div>
<div><tt>  └── index.ts</tt></div>
<div><tt><br></tt></div>
<div><tt>// Replace GitHub Spark KV with proper DB</tt></div>
<div><br></div>
<div><br></div>
<div><b><h3>Phase 4: Tier Gating &amp Billing (Weeks 7-8)</h3></b><font face=".AppleSystemUIFont"><h3><br></h3></font></div>
<div><tt>// src/lib/subscription/</tt></div>
<div><tt>├── tier-manager.ts</tt></div>
<div><tt>├── usage-tracker.ts          // Track API calls per tier</tt></div>
<div><tt>├── rate-limiter.ts           // Enforce tier limits</tt></div>
<div><tt>└── stripe-integration.ts     // Payment processing</tt></div>



---
*Source: Document 42efb0f415b2f324521d2959a50f91bf*
