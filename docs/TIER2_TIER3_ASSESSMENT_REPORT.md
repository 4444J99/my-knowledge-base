# Tier 2 and Tier 3 Apps Assessment Report

## Overview
This report assesses the feasibility and priority of building out the Tier 2 and Tier 3 applications found in the `intake/absorb-alchemize/` directory.

## Tier 2: Visualization and Advanced UI

### 1. polycosm (Multi-column Branching)
- **Description**: A multi-column interface for exploring branching conversations or related ideas.
- **Status**: **Build (High Priority)**.
- **Why**: This aligns perfectly with the "Atomic Knowledge" philosophy. It allows users to see the evolution of an insight across multiple conversations.
- **Next Step**: Design a "Branching View" in the main web UI that uses the `relatedUnits` links to populate columns.

### 2. link-2-ink (D3 Visualization)
- **Description**: A D3.js-based graph visualization of the knowledge base.
- **Status**: **Build (Medium Priority)**.
- **Why**: Essential for uncovering hidden relationships in large knowledge bases.
- **Next Step**: Integrate with `src/graph-api.ts` to provide live graph updates as the database grows.

---

## Tier 3: Specialized Use Cases

### 3. echopaths / echoscript
- **Description**: Likely focused on audio/transcript processing and visualization.
- **Status**: **Defer**.
- **Why**: The current priority is text-based knowledge units. Audio processing adds significant complexity (STT, speaker diarization).
- **Next Step**: Keep as a reference for Phase 7 (Multi-modal expansion).

### 4. new-babel-alexandria
- **Description**: Multi-lingual or cross-repository knowledge explorer.
- **Status**: **Defer**.
- **Why**: Core system needs to be robust in English first.
- **Next Step**: Re-evaluate during Phase 6.2 (Taxonomy Hardening).

### 5. thinking-space
- **Description**: A visual canvas/whiteboard for organizing nodes (PhotoNode, PhotoViz).
- **Status**: **Build (Low Priority - Research Phase)**.
- **Why**: High UX value, but requires significant frontend work to make it "writable" rather than just a visualization.
- **Next Step**: Research "Infinite Canvas" libraries (e.g., Tldraw, React Flow) for integration.

### 6. voice-library
- **Description**: Specialized vault for voice notes.
- **Status**: **Defer**.
- **Why**: Redundant with `echopaths`.
- **Next Step**: Consolidate into a single "Media Ingestion" stream later.

## Summary Table

| App | Tier | Recommendation | Priority |
|-----|------|----------------|----------|
| polycosm | 2 | **Build** | High |
| link-2-ink | 2 | **Build** | Medium |
| thinking-space | 3 | **Build (MVP)** | Low |
| echopaths | 3 | **Defer** | N/A |
| echoscript | 3 | **Defer** | N/A |
| new-babel-alexandria| 3 | **Defer** | N/A |
| voice-library | 3 | **Defer** | N/A |
