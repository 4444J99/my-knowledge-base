# Universal PKB Tagging Schema → AtomicUnit Mapping

## Overview
This document maps the concepts from the `Universal PKB Structuring Guide` to the `AtomicUnit` interface used in the PKB system.

## Mapping Table

| Universal Tag Category | AtomicUnit Field / Tag Convention | Example Mapping |
|-------------------------|-----------------------------------|-----------------|
| **Topic**               | `category` (normalized)           | `#design` -> `category: "design"` |
| **Project**             | `tags` (prefix: `project/`)       | `#project/site-redesign` -> `tags: ["project/site-redesign"]` |
| **Status**              | `tags` (prefix: `status/`)        | `#status/draft` -> `tags: ["status/draft"]` |
| **Priority**            | `tags` (prefix: `p/`)             | `#p/high` -> `tags: ["p/high"]` |
| **Type**                | `type` (AtomicUnitType)           | `#type/code` -> `type: "code"` |
| **Phase**               | `tags` (prefix: `phase/`)         | `#phase/planning` -> `tags: ["phase/planning"]` |
| **Date**                | `timestamp` (ISO-8601)            | `2025-07-31` -> `timestamp: "2025-07-31T00:00:00Z"` |

## AtomicUnit Interface Enhancements

To fully support the Universal PKB schema, the `AtomicUnit` interface should be extended or strictly adhered to:

```typescript
export interface AtomicUnit {
  id: string;              // UUID
  type: AtomicUnitType;    // Maps to 'Type'
  timestamp: Date;         // Maps to 'Date'
  
  title: string;           // Note Title
  content: string;         // Note Body
  context: string;         // Surrounding conversation/document context
  
  category: string;        // Maps to 'Topic' (Normalized)
  tags: string[];          // Maps to Project, Status, Priority, Phase (using prefixes)
  
  // Relationships
  conversationId?: string;
  documentId?: string;
  relatedUnits: string[];
  
  // Search
  embedding?: number[];
  keywords: string[];
}
```

## Tag Prefix Conventions

We adopt a hierarchical tagging system stored within the `tags` array:

- **Projects**: `project/<name>` (e.g., `project/knowledge-base`)
- **Status**: `status/<state>` (e.g., `status/active`, `status/archived`)
- **Priority**: `p/<level>` (e.g., `p/1`, `p/2`, `p/low`, `p/urgent`)
- **Phase**: `phase/<lifecycle>` (e.g., `phase/research`, `phase/implementation`, `phase/maintenance`)
- **Source**: `source/<platform>` (e.g., `source/claude`, `source/dropbox`, `source/apple-notes`)

## Implementation in `KnowledgeAtomizer`

The `KnowledgeAtomizer` should be updated to:
1.  **Prefix Extraction**: Detect `#` tags in content and apply correct prefixes.
2.  **Date Parsing**: Ensure ISO-8601 dates in titles or content are used to override the default message timestamp if applicable.
3.  **Category Normalization**: Map broad subjects to a strictly defined list of categories (Topic).
