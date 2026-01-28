---
id: 2e8bd324-4fa8-4c92-b51a-e274cb7558a4
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
  - match
  - details
  - this
  - class
  - async
---
# <li><b>LinkedIn Sales Navigator API</b> (unofficial/scraped)</li>

## Context
From document: data enrichment strategy for ucc-mca intelligence platform — chunk 5 (chunk 5/32)

## Content
<li><b>LinkedIn Sales Navigator API</b> (unofficial/scraped)</li>
<ul class="Apple-dash-list">
<li>Hiring signals via job postings</li>
<li>Employee growth trends</li>
<li><b>Cost:</b> Scraping service fees</li>
</ul>
</ol>
<div><br></div>
<div><b>Implementation:</b><br></div>
<div><tt>// src/lib/data-sources/starter-tier.ts</tt></div>
<div><tt>export class StarterTierDataSource extends FreeTierDataSource {</tt></div>
<div><tt>  async enrichWithDnB(companyName: string) {</tt></div>
<div><tt>    const match = await this.dnbAPI.match({ name: companyName });</tt></div>
<div><tt>    return {</tt></div>
<div><tt>      duns: match.duns,</tt></div>
<div><tt>      creditScore: match.assessment.creditScore,</tt></div>
<div><tt>      paymentTrends: match.paymentInsights</tt></div>
<div><tt>    };</tt></div>
<div><tt>  }</tt></div>
<div><tt>  </tt></div>
<div><tt>  async getBusinessReviews(placeId: string) {</tt></div>
<div><tt>    const details = await this.googlePlaces.details({ place_id: placeId });</tt></div>
<div><tt>    return {</tt></div>
<div><tt>      rating: details.rating,</tt></div>
<div><tt>      reviewCount: details.user_ratings_total,</tt></div>
<div><tt>      sentiment: this.analyzeSentiment(details.reviews)</tt></div>



---
*Source: Document 42efb0f415b2f324521d2959a50f91bf*
