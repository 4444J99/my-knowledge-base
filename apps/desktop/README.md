# Desktop App Core

This workspace contains the native desktop core modules (Tauri-oriented):
- Shared contract-aware universe API client (`src/universe-client.ts`)
- Desktop workflow helpers for attach points and reindex lifecycle (`src/workflows.ts`)
- Desktop shell state layer for provider/chat/turn/term drill-down (`src/shell.ts`)

Runtime packaging and target-environment smoke remain external:
- Tauri runtime wiring
- platform build/signing
- staged runtime verification
