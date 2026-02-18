# Evaluation-to-Growth Report (2026-02-18)

## Scope and Mode
- Mode: `Autonomous`
- Output: `Markdown report`
- Scope: `Project-wide stability remediation (API contracts, routing, vector client init, test blind spots, trust docs)`

## Phase 1: Evaluation

### 1.1 Critique
#### Strengths
- Existing baseline already had strong CI coverage depth and deterministic test setup (`KB_EMBEDDINGS_PROVIDER=mock`).
- Search and universe API contracts were mostly explicit and already had substantive test suites.
- Alert verification workflows were codified and passing (`alerts:verify:strict`).

#### Weaknesses
- `/api/collections/stats` was shadowed by `/api/collections/:id` route precedence.
- Mounted router errors (`/api/intelligence`, `/api/universe`) bypassed JSON API error envelope and returned HTML.
- Chroma client initialization used deprecated `path` option, creating noisy warnings and fragile startup semantics.
- Coverage gaps around route wiring (`collections-api`, web-server composition) allowed contract drift.

#### Priority Areas
1. API error contract consistency.
2. Route precedence correctness for collections stats.
3. Chroma client constructor modernization.
4. Focused tests for wiring and regression-prone endpoints.

### 1.2 Logic Check
#### Contradictions Found
- Intended API error contract (`error`, `code`, `statusCode`) contradicted runtime behavior on mounted subrouters (HTML fallback).
- Intended `/api/collections/stats` endpoint existed but resolved as collection ID lookup in practice.

#### Coherence Reinforcement
- Error middleware now sits at the true tail of `createApiRouter`.
- Unknown `/api/*` routes now produce JSON 404s (`ROUTE_NOT_FOUND`).
- Collections stats route is now registered directly in `createCollectionsRoutes` before `/:id`.

### 1.3 Logos Review
- Factual claims are now test-backed for the fixed contracts:
  - JSON error envelopes on intelligence/universe failures.
  - JSON 404 for unknown API route.
  - `/api/collections/stats` route reachability and non-shadowing.

### 1.4 Pathos Review
- Operational confidence improves because error payloads are machine-consumable and consistent across API domains.

### 1.5 Ethos Review
- Credibility improvements applied:
  - README badge drift corrected to current quality signal values.
  - Regression tests added for previously unverified wiring paths.

## Phase 2: Reinforcement (Applied Changes)

### A. API Contract Defects
- Moved error middleware to the end of router composition and mounted intelligence/universe before it:
  - `src/api.ts`
- Added API-local JSON 404 handler for unknown `/api/*` routes:
  - `src/api.ts`

### B. Collections Routing
- Added `GET /stats` directly inside `createCollectionsRoutes` before `/:id`:
  - `src/collections-api.ts`
- Removed duplicate stats mount and switched to single-route strategy in server wiring:
  - `src/web-server.ts`

### C. Chroma Deprecation Path
- Replaced deprecated `ChromaClient({ path })` with non-deprecated host/port/ssl config:
  - `src/vector-database.ts`

### D. Test Blind Spots
- Added dedicated collections route tests:
  - `src/collections-api.test.ts`
- Added mounted-router error contract tests:
  - `src/api.test.ts`
- Added web-server wiring regression tests (extension routes + canonical API fallback behavior):
  - `tests/web-server-wiring.test.ts`
- Added vector client constructor assertions to guard against deprecated `path` usage:
  - `src/vector-database.test.ts`

### E. Trust Signals
- Updated README badges to reflect current quality reality:
  - `README.md`

## Phase 3: Risk Analysis

### Blind Spots
- Auth policy consistency across canonical and extension routes remains out of scope in this pass.
- Full `src/web-server.ts` behavioral coverage remains intentionally partial (wiring-focused, not full UI-server integration coverage).

### Shatter Points Addressed
- Route shadow regression risk: reduced by explicit route ordering tests.
- HTML error payload regressions: reduced by router-tail middleware and contract tests.
- Chroma init drift: reduced by constructor argument contract tests.

## Phase 4: Growth
- Next growth step after this stability pass:
  1. Extract `src/api.ts` into domain routers (search/units/federation/intelligence/universe).
  2. Define per-module branch coverage targets for control-plane modules.
  3. Add recurring release checklist item to rerun this Evaluation-to-Growth protocol.

## Validation Summary
- Targeted verification run:
  - `npx vitest run src/api.test.ts src/collections-api.test.ts src/vector-database.test.ts src/universe/api.test.ts tests/web-server-wiring.test.ts`
  - Result: `5` files passed, `72` tests passed.
