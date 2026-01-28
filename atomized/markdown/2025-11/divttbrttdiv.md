---
id: 31d8eafa-334b-4160-bff7-939eb7344125
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
  - border
  - style
  - userid
  - source
  - tier
---
# <div><tt><br></tt></div>

## Context
From document: data enrichment strategy for ucc-mca intelligence platform — chunk 14 (chunk 14/32)

## Content
<div><tt><br></tt></div>
<div><tt>export class TierManager {</tt></div>
<div><tt>  canAccessDataSource(userId: string, source: DataSource): boolean {</tt></div>
<div><tt>    const tier = this.getUserTier(userId);</tt></div>
<div><tt>    return this.tierConfig[tier].includes(source);</tt></div>
<div><tt>  }</tt></div>
<div><tt>  </tt></div>
<div><tt>  async trackUsage(userId: string, source: DataSource, cost: number) {</tt></div>
<div><tt>    await this.usageTracker.increment(userId, { source, cost });</tt></div>
<div><tt>    await this.checkAndAlert(userId); // Alert when approaching limits</tt></div>
<div><tt>  }</tt></div>
<div><tt>}</tt></div>
<div><br></div>
<div><br></div>
<div><b><span style="font-size: 16px">Cost Estimates by Tier</span></b><br></div>
<div><object><table cellspacing="0" cellpadding="0" style="border-collapse: collapse; direction: ltr">
<tbody>
<tr><td valign="top" style="border-style: solid; border-width: 1.0px 1.0px 1.0px 1.0px; border-color: #ccc; padding: 3.0px 5.0px 3.0px 5.0px; min-width: 70px"><div>Tier</div>
</td><td valign="top" style="border-style: solid; border-width: 1.0px 1.0px 1.0px 1.0px; border-color: #ccc; padding: 3.0px 5.0px 3.0px 5.0px; min-width: 70px"><div>Monthly Fee</div>



---
*Source: Document 42efb0f415b2f324521d2959a50f91bf*
