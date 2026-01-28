# Tier 1 Apps Integration Specification

## Overview
This document specifies how the existing Tier 1 applications (found in `intake/absorb-alchemize/`) will be integrated into the core Personal Knowledge Database (PKB) system.

## 1. chat-with-docs (Main Q&A Interface)
**Purpose**: A user-friendly web interface for chatting with the knowledge base.

### Integration Strategy:
- **API Backend**: Convert the app to use the PKB Express server (`src/web-server.ts`) instead of direct Gemini API calls.
- **Search Integration**: Use the Hybrid Search endpoint (`/api/search/hybrid`) to provide grounding for the chatbot.
- **UI Updates**:
  - Add "Source Selection" to filter by `sourceId`.
  - Display "Knowledge Unit" citations with links back to the original Markdown files.
  - Implement streaming responses using the unified `AIService`.

---

## 2. ask-the-manual (File RAG Pattern)
**Purpose**: Specialized interface for querying technical manuals and large PDF documents.

### Integration Strategy:
- **Document Processing**: Use the `KnowledgeAtomizer` with the `PDFSlidingWindowStrategy` to ingest manuals.
- **Hierarchical Navigation**: leverage `hierarchyLevel` and `parentSectionId` in `AtomicUnit` to allow users to browse manuals by chapter/section.
- **Context Preservation**: Ensure the `context` field in the search results highlights the surrounding paragraphs for better manual referencing.

---

## 3. processed_pkb_final (Export Format)
**Purpose**: Lightweight, portable Markdown-based export of the entire PKB.

### Integration Strategy:
- **Producer**: Implement a new export script `src/export-processed-pkb.ts` that generates the `INDEX.json`, `INDEX.csv`, and individual `.md` files matching this format.
- **Consumer**: Ensure the `LocalFileSource` can ingest this format efficiently, using the `INDEX.json` to skip re-processing of unchanged units.
- **Obsidian Support**: This format is the bridge between the database and Obsidian. The integration should ensure front-matter tags match the `Universal Tagging Mapping`.

---

## 4. infinite-wiki (Discovery Mode)
**Purpose**: An exploratory interface for discovering relationships between knowledge units.

### Integration Strategy:
- **Graph API**: Connect to the `/api/graph` endpoint provided by `src/graph-api.ts`.
- **Relationship Visualization**: Use D3.js or a similar library to visualize the `relatedUnits` links.
- **Dynamic Content**: As the user clicks nodes, fetch the full `AtomicUnit` content and "alchemize" new insights or connections on-the-fly using the `AIService`.
- **Auto-Discovery**: Implement a feature where the UI suggests "Missing Links" between unrelated but semantically similar units.
