# EP06 — MCP Tools & Contracts

> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.

## Description

Expose capabilities via MCP tools with typed schemas, pagination, safe output sizes, and clear errors.

## Dependencies

- None (foundational), but informs EP01–EP05, EP08

---

## User Stories

### EP06-US-01 — Define Tool Schemas

**As a** developer **I want** typed input/output schemas **so that** tools are discoverable and robust.
**Acceptance Criteria**

- JSON Schema for `list_notes`, `read_note`, `search_notes`, `summarize_note`, `answer_question`.
- Versioned tool manifest; semantic version bump on breaking changes.

### EP06-US-02 — Pagination & Limits

**As a** developer **I want** size limits **so that** responses are safe.
**Acceptance Criteria**

- Chunked responses for large outputs; continuation tokens where needed.
- Max attachment size enforced with clear error.

### EP06-US-03 — Error Model

**As a** developer **I want** actionable errors **so that** clients can handle them.
**Acceptance Criteria**

- Error codes (`INVALID_INPUT`, `NOT_FOUND`, `LIMIT_EXCEEDED`, `INTERNAL_ERROR`).
- Include remediation hints.

### EP06-US-04 — Tool Discovery

**As a** client **I want** to list available tools **so that** I can orchestrate them.
**Acceptance Criteria**

- Tool list endpoint returns name, version, schema refs, and limits.

---

## Testing Tasks

### EP06-TEST-01 — Contract Tests

**Acceptance Criteria**

- JSON Schema validation for inputs/outputs for each tool.
- Negative tests for missing/invalid fields.

### EP06-TEST-02 — Pagination & Limits

**Acceptance Criteria**

- Large read/search calls paginate; continuation token round-trips.
- Enforced server limits return `LIMIT_EXCEEDED` with hints.

### EP06-TEST-03 — Backward Compatibility

**Acceptance Criteria**

- Minor version updates remain compatible; tests guard against breaking changes without major bump.
