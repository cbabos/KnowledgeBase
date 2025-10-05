# EP04 — Summarization

> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.

## Description

Summarize a single note into short/medium/long and bullet-point modes using an LLM. Chunk long notes and compose summaries.

## Dependencies

- EP03 (Read) for preview integration
- EP06 (MCP) to expose `summarize_note`

---

## User Stories

### EP04-US-01 — Short/Medium/Long Summary

**As a** user **I want** variable-length summaries **so that** I can get the right level of detail.
**Acceptance Criteria**

- Options: short (~3–5 bullets), medium (~1–2 paragraphs), long (~4–6 paragraphs).
- Each summary includes link to source and section anchors if available.

### EP04-US-02 — Chunking Long Notes

**As a** system **I want** to chunk long notes **so that** token limits are respected.
**Acceptance Criteria**

- Heuristic chunker (by headings/paragraphs) produces overlapping chunks.
- Compose partial summaries into a final coherent summary.

### EP04-US-03 — Cost/Latency Controls

**As a** user **I want** to choose model and max tokens **so that** I control costs/time.
**Acceptance Criteria**

- UI exposes model selector (local default) and max tokens.
- Persist selection in settings.

---

## Testing Tasks

### EP04-TEST-01 — Unit: Chunking & Composition

**Acceptance Criteria**

- Given synthetic long text, chunker respects max size + overlap.
- Composition merges bullet points without duplication.

### EP04-TEST-02 — Integration: Summarize Note

**Acceptance Criteria**

- For fixture notes, generated summary is within expected length bounds.
- Deterministic prompts; golden-file snapshots with tolerance window.

### EP04-TEST-03 — Failure Handling

**Acceptance Criteria**

- If model call fails/timeouts, user sees actionable error; retries with backoff.
