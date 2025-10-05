# EP02 — Search & Retrieval (Keyword + Filters + Snippets)

> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.

## Description

Provide fast keyword search over filenames and content with filters and highlighted snippets.

## Dependencies

- EP01 (Index) for searchable artifacts
- EP08 (Client) for UX

---

## User Stories

### EP02-US-01 — Keyword Search

**As a** user **I want** to search by keywords **so that** I can find relevant notes quickly.
**Acceptance Criteria**

- Query matches filenames and content (case-insensitive).
- Supports AND/OR and quoted phrases.
- Return ranked results with filename, path, modified time, and 1–2 highlighted snippets.

### EP02-US-02 — Filters

**As a** user **I want** to filter results **so that** I can narrow down.
**Acceptance Criteria**

- Filters: file type (`.md`, `.txt`, `.pdf`), folder, last modified date range, tag (frontmatter).
- Filters combine with search; UI/CLI reflect active filters.

### EP02-US-03 — Pagination & Limits

**As a** user **I want** paging **so that** large result sets are manageable.
**Acceptance Criteria**

- `page`/`pageSize` supported in API; UI shows next/prev.
- Max server page size enforced to protect memory.

### EP02-US-04 — Snippet Generation

**As a** user **I want** contextual snippets **so that** I can judge relevance.
**Acceptance Criteria**

- Bold/mark matched terms; include ±N characters around match.
- Multiple matches coalesce into 1–2 snippets per result.

### EP02-US-05 — Sort Options

**As a** user **I want** to sort results **so that** I can prioritize recency or relevance.
**Acceptance Criteria**

- Sort by relevance (default) or modified time (desc).

---

## Testing Tasks

### EP02-TEST-01 — Unit: Query Parser

**Acceptance Criteria**

- AND/OR/quotes work per spec.
- Fuzzy matching off by default; predictable behavior.
- 95% coverage on parser branch logic.

### EP02-TEST-02 — Integration: Filters + Search

**Acceptance Criteria**

- Tag filter respects frontmatter keys.
- Date range filter excludes outside docs.
- Pagination returns stable, non-overlapping pages.

### EP02-TEST-03 — E2E: Search UX

**Acceptance Criteria**

- CLI and UI both return consistent counts and top results.
- Snippets highlight query tokens; Playwright snapshot testing.

### EP02-TEST-04 — Performance: Query Latency

**Acceptance Criteria**

- P50 < 1.5s, P90 < 3s on 2k files dataset.
- Regression threshold gates in CI.
