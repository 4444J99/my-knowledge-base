# GitHub Pages Frontend Setup

This project can deploy the React frontend to GitHub Pages, while keeping the API on a separate backend host.

## Architecture

- GitHub Pages serves static files from `web-react/dist`.
- The API remains hosted elsewhere (Docker host, VM, k8s, Render, etc.).
- Frontend calls API via `VITE_API_BASE_URL`.

## What this repo now provides

- Workflow: `.github/workflows/pages.yml`
- Frontend API base support: `web-react/src/api/client.ts`
- Frontend base-path support: `web-react/vite.config.ts`

## Required GitHub repository variables

Set these in `Settings -> Secrets and variables -> Actions -> Variables`.

1. `PAGES_API_BASE_URL`
   - Value format for this backend: `https://<api-host>/api`
   - Example: `https://api.example.com/api`
2. `PAGES_BASE_PATH` (optional)
   - Use `/<repo-name>/` for project pages.
   - Use `/` for custom domain pages.
3. `PAGES_CUSTOM_DOMAIN` (optional)
   - Example: `kb.example.com`

## How to get `PAGES_API_BASE_URL` exactly

Find your backend URL and verify:

```bash
curl -i "https://<candidate-host>/api/health"
```

- If it returns `200`, use `https://<candidate-host>/api` as `PAGES_API_BASE_URL`.
- If your backend is mounted behind a different prefix, include that prefix.

## Enable Pages in GitHub

1. Open repository `Settings -> Pages`.
2. Set Source to `GitHub Actions`.
3. Push to `master` or manually run `Deploy Web React to GitHub Pages`.

## Domain changes

If your domain changes, only update:

- `PAGES_API_BASE_URL`
- `PAGES_CUSTOM_DOMAIN` (if used)

No code changes are required.
