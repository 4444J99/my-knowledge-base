# Evaluation-to-Growth Remediation Backlog (2026-02-18)

## Status Legend
- `done`: implemented and validated in this pass
- `open`: identified but intentionally deferred

## Backlog

| ID | Priority | Area | Item | Files | Status | Validation |
|---|---|---|---|---|---|---|
| E2G-2026-02-18-P0-001 | P0 | API Contract | Move API error middleware to router tail so mounted routers return JSON errors | `src/api.ts` | done | `src/api.test.ts` mounted router contract tests |
| E2G-2026-02-18-P0-002 | P0 | API Contract | Add JSON 404 fallback for unknown `/api/*` routes (`ROUTE_NOT_FOUND`) | `src/api.ts` | done | `src/api.test.ts` + `tests/web-server-wiring.test.ts` |
| E2G-2026-02-18-P0-003 | P0 | Routing | Make `/api/collections/stats` reachable by registering before `/:id` | `src/collections-api.ts` | done | `src/collections-api.test.ts` |
| E2G-2026-02-18-P0-004 | P0 | Server Wiring | Remove duplicate stats mount and keep single collections mount strategy | `src/web-server.ts` | done | `tests/web-server-wiring.test.ts` |
| E2G-2026-02-18-P1-001 | P1 | Runtime Hygiene | Replace deprecated Chroma `path` constructor usage with `host/port/ssl` | `src/vector-database.ts` | done | `src/vector-database.test.ts` constructor arg assertions |
| E2G-2026-02-18-P1-002 | P1 | Test Coverage | Add focused tests for collections route precedence and stats contract | `src/collections-api.test.ts` | done | `npx vitest run src/collections-api.test.ts` |
| E2G-2026-02-18-P1-003 | P1 | Test Coverage | Add focused wiring tests for extension routes + canonical API fallback | `tests/web-server-wiring.test.ts` | done | `npx vitest run tests/web-server-wiring.test.ts` |
| E2G-2026-02-18-P2-001 | P2 | Trust Signals | Refresh README test/coverage badges to match current baseline | `README.md` | done | manual review |
| E2G-2026-02-18-P3-001 | P3 | Architecture | Split monolithic `src/api.ts` into domain routers | `src/api.ts` (+ new router files) | open | deferred by stability-first scope |
| E2G-2026-02-18-P3-002 | P3 | Governance | Add recurring Evaluation-to-Growth gate to release readiness checklist | `docs/OPERATIONS.md`, release docs | open | deferred to follow-up docs pass |

## Validation Command Used
```bash
npx vitest run src/api.test.ts src/collections-api.test.ts src/vector-database.test.ts src/universe/api.test.ts tests/web-server-wiring.test.ts
```

Result: `5` files passed, `72` tests passed.
