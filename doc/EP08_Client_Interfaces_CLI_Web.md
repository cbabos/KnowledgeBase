# EP08 — Client Interfaces (CLI & Minimal Web UI)


> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.


## Description
Provide a CLI for power users and a minimal web UI for search, preview, summarization, and Q&A.

## Dependencies
- EP01–EP07 for capabilities

---

## User Stories

### EP08-US-01 — CLI Commands
**As a** user **I want** CLI commands **so that** I can script actions.
**Acceptance Criteria**
- Commands: `corpus add|list|exclude`, `index build|reindex`, `search`, `read`, `summarize`, `ask`.
- `--json` flag returns machine-readable output for pipelines.

### EP08-US-02 — Web UI Shell
**As a** user **I want** a simple UI **so that** I can interact visually.
**Acceptance Criteria**
- Global search bar, results list with filters, preview pane, actions.
- Keyboard shortcuts (⌘/Ctrl‑K for search; Enter open; Esc back).

### EP08-US-03 — Evidence & Citations
**As a** user **I want** citation panel **so that** I can verify answers.
**Acceptance Criteria**
- Expandable evidence tray with highlighted excerpts and open-in-editor.

### EP08-US-04 — Status & Badges
**As a** user **I want** visibility **so that** I know model mode and index freshness.
**Acceptance Criteria**
- Badges for Local/Remote; index timestamp; corpus size. 

---

## Testing Tasks

### EP08-TEST-01 — CLI E2E
**Acceptance Criteria**
- Golden JSON outputs for commands with fixed fixtures.
- Non-zero exit codes on invalid input; helpful stderr messages.

### EP08-TEST-02 — Web E2E (Playwright)
**Acceptance Criteria**
- Search → Filter → Preview → Summarize → Ask flows pass.
- Visual regression thresholds for results list/snippet highlights.

### EP08-TEST-03 — Accessibility & Keyboard
**Acceptance Criteria**
- Axe checks pass critical items.
- Shortcuts operate in focus/blur edge cases.
