# Release Evidence

Place one JSON file per release tag in this directory.

Example:
- `docs/evidence/release-evidence/v1.0.1.json`

Each file should include:
- tag + commit
- release workflow run ID/URL
- strict readiness and parity gate outcomes
- runtime probe artifact references
- alert verification reference
- unbounded reindex completion reference
- rollback contact/notes

Suggested generator:
- `npm run release:evidence:generate -- --tag <tag> --commit <sha> --image-ref <image-ref> --reindex-evidence "<artifact-or-note>"`
