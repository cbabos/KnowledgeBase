# EP05 — Question Answering (RAG) with Citations & Confidence

> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.

## Description

Answer natural-language questions grounded in retrieved text; include citations and confidence indicators.

## Dependencies

- EP01/EP02 for retrieval
- EP06 for MCP tool `answer_question`
- EP08 for UI

---

## User Stories

### EP05-US-01 — Ask Question

**As a** user **I want** to ask a question **so that** I get an answer grounded in my notes.
**Acceptance Criteria**

- Retrieves top‑k chunks; composes answer using only retrieved text.
- Shows citations (file path + heading + character offsets or chunk id).

### EP05-US-02 — Confidence Indicator

**As a** user **I want** to see confidence **so that** I can judge reliability.
**Acceptance Criteria**

- Heuristic (coverage count, overlap, entailment score if available) drives {"Low|Medium|High"} badge.
- Low confidence shows suggestion to open sources.

### EP05-US-03 — Multi-Doc Synthesis

**As a** user **I want** synthesis across files **so that** I get a consolidated answer.
**Acceptance Criteria**

- Merges insights from multiple documents; no unsupported claims.
- Citations list all supporting sources.

### EP05-US-04 — Evidence Panel

**As a** user **I want** to inspect evidence **so that** I can verify claims.
**Acceptance Criteria**

- Expandable panel shows the exact retrieved snippets with highlights.

---

## Testing Tasks

### EP05-TEST-01 — Unit: Citation Builder

**Acceptance Criteria**

- Correct file + section resolution; stable anchors.
- Handles deleted/moved files gracefully (marks stale).

### EP05-TEST-02 — Integration: RAG Pipeline

**Acceptance Criteria**

- Given seeded corpus and questions, answers cite only retrieved text.
- If no relevant evidence, response states inability and shows Low confidence.

### EP05-TEST-03 — E2E: Q&A UX

**Acceptance Criteria**

- Ask → Answer → Expand evidence → Open source works in UI/CLI.
- Snapshot tests ensure citation rendering stays consistent.
