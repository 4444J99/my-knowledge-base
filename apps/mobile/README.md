# Mobile App Core

This workspace contains the native mobile core implementation:
- React Native app shell (`App.tsx`) with provider/chat/turn/term exploration
- Shared contract-aware universe API client (`src/universe-client.ts`)
- Offline saved-exploration cache with async key-value adapter (`src/offline-cache.ts`)
- Resumable provider sync planning (`src/sync.ts`)

Runtime packaging and target-environment smoke remain external:
- Expo runtime integration
- device-level smoke validation
