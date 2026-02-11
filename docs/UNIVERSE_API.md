# Universe API

Macro→micro navigation endpoints for provider/chat/turn/token exploration.

## Common Response Envelope

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-02-11T12:00:00.000Z"
}
```

List endpoints also return:

```json
{
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 240,
    "totalPages": 5
  }
}
```

## Endpoints

### `GET /api/universe/summary`
- Returns global counts: providers, accounts, chats, turns, terms, occurrences.

### `GET /api/universe/providers?limit&offset`
- Lists normalized provider records (`providerId`, `displayName`, metadata).

### `GET /api/universe/providers/:providerId/chats?limit&offset`
- Lists chats scoped to one provider.
- Includes `turnCount`, `providerId`, `providerName`, `sourcePath`, and deterministic thread ID.

### `GET /api/universe/chats/:chatId`
- Returns one chat thread.

### `GET /api/universe/chats/:chatId/turns?limit&offset`
- Returns ordered turn list with role/content metadata.

### `GET /api/universe/chats/:chatId/network?limit`
- Returns edges for the selected chat against other chats (`cooccurrence`, `semantic`, `temporal`).

### `GET /api/universe/terms/:term/occurrences?limit&offset`
- Returns corpus-wide term hits with backlink fields:
  - `providerId`
  - `threadId`
  - `turnId`
  - `chatTitle`
  - `turnIndex`
  - `role`
  - `content`

### `GET /api/universe/networks/parallel?limit&minWeight`
- Returns global network edges, sorted by `weight DESC`.

### `POST /api/universe/reindex`
- Starts async reindex run; returns `202` with `{ runId, status }`.

### `GET /api/universe/reindex/:runId`
- Poll run lifecycle and counters (`filesScanned`, `filesIngested`, `chatsIngested`, `turnsIngested`).

## Example

```bash
curl -s "http://localhost:3000/api/universe/terms/nebula/occurrences?limit=10" | jq
```

## Implementation Notes
- IDs are stable UUIDs and suitable for deep links across web/mobile/desktop clients.
- Non-JSON provider archives are supported through fallback transcript parsing (HTML and role-tagged markdown/plain text).
- `POST /api/universe/reindex` is asynchronous; poll `GET /api/universe/reindex/:runId` for completion.
