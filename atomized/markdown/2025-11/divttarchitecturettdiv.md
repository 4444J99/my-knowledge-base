---
id: 1341bc09-9ee4-4ad1-baaa-16ba982d6315
type: insight
created: '2025-11-20T00:27:19.000Z'
document: 657aecac6f7fd18489e5adc55f9e6f82
tags:
  - paragraph
  - html
  - chunked
  - chunk-strategy-markdown-semantic
category: programming
keywords:
  - shot
  - inner
  - loop
  - meta
  - outer
---
# <div><tt>**Architecture:**</tt></div>

## Context
From document: # **Theoria Linguae Machina: Comprehensive Design Document for the… — chunk 19 (chunk 19/57)

## Content
<div><tt>**Architecture:**</tt></div>
<div><tt><br></tt></div>
<div><tt>- **Outer Loop**: Meta-training across task distribution, learns optimal initialization θ₀</tt></div>
<div><tt>- **Inner Loop**: Few-shot adaptation (3-10 gradient steps) on new task</tt></div>
<div><tt><br></tt></div>
<div><tt>**Algorithm:**</tt></div>
<div><tt><br></tt></div>
<div><tt>```</tt></div>
<div><tt>θ'ᵢ = θ - α∇θL_Tᵢ(fθ)  [Inner loop]</tt></div>
<div><tt>θ ← θ - β∇θ Σ L_Tᵢ(f_θ'ᵢ)  [Meta-update]</tt></div>
<div><tt>```</tt></div>
<div><tt><br></tt></div>
<div><tt>**First-Order MAML:** Omit Hessian (33% speed-up, minimal performance loss) </tt></div>
<div><tt><br></tt></div>
<div><tt>**Hyperparameters:**</tt></div>
<div><tt><br></tt></div>
<div><tt>- Inner learning rate α: 0.01-0.1</tt></div>
<div><tt>- Outer learning rate β: 0.001</tt></div>
<div><tt>- Meta-batch size: 16-32 tasks</tt></div>
<div><tt>- Inner steps: 3-10</tt></div>
<div><tt><br></tt></div>
<div><tt>**Performance:**</tt></div>
<div><tt><br></tt></div>
<div><tt>- Few-shot classification: 48.70% (1-shot), 63.11% (5-shot) on MiniImagenet </tt></div>
<div><tt>- RLOS target: &gt50% (1-shot), &gt65% (5-shot) on linguistic tasks</tt></div>
<div><tt><br></tt></div>



---
*Source: Document 657aecac6f7fd18489e5adc55f9e6f82*
