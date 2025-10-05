---
**Epic ID:** EP14  
**Title:** Auto‑Indexing Integration  
**Status:** Draft  
**Owner:** Business Analyst / Client  
**Dependencies:** EP01 (Corpus Management), EP12 (Autosave)  
**Last Updated:** 2025-10-05  
---

### Overview

Automatically re‑index all saved and modified documents so new data is searchable in Q&A and retrieval functions.

### User Stories

#### EP14‑US‑01 — Index on Save

**As a** user **I want** every saved document to be indexed **so that** it’s searchable immediately.

**Acceptance Criteria:**

- After autosave completes, indexer updates corpus entry.
- Search results reflect edits within 2 seconds.
- Indexer errors logged visibly to user.

**Development Tests:**

- Integration: Save triggers MCP index tool.
- Unit: Confirm index entry updated.

**QA Tests:**

- E2E: Create document → search keyword → verify result appears.
- Load test: 100 saves in 1 min → index queue remains stable.
