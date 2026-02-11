# Reindex Run Evidence

Capture unbounded universe reindex completion artifacts here.

Commands:

```bash
# local
npm run reindex:evidence -- --env local --out "docs/evidence/reindex-runs/local-$(date +%Y%m%d-%H%M%S).json"

# staging
npm run reindex:evidence:staging -- --out "docs/evidence/reindex-runs/staging-$(date +%Y%m%d-%H%M%S).json"

# production
npm run reindex:evidence:prod -- --out "docs/evidence/reindex-runs/prod-$(date +%Y%m%d-%H%M%S).json"
```

Each artifact should include:
- `pass=true`
- completed reindex status
- chats/turns ingested counts
- no bounded-limit metadata when strict unbounded validation is enabled
