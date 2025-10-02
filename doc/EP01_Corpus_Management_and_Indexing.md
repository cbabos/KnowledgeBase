# EP01 — Corpus Management & Indexing


> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.


## Description
Enable users to configure folders, exclusions, and build/rebuild a local index over `.md`, `.txt` (basic `.pdf` text extraction). Provide deterministic, resumable indexing.

## Dependencies
- EP06 (MCP Tools & Contracts) for tool shapes
- EP08 (Client Interfaces) for UI/CLI triggers

---

## User Stories

### EP01-US-01 — Add Folder to Corpus
**As a** user **I want** to add one or more folders **so that** my notes are discoverable.
**Acceptance Criteria**
- **Given** a valid path
  **When** I add the folder via CLI (`corpus add <path>`) or UI
  **Then** the folder appears in the corpus list with file count and last indexed timestamp.
- **Given** an invalid path
  **When** I attempt to add it
  **Then** I receive a clear error with remediation.
- Index is not run automatically unless user chooses “Index Now”.

### EP01-US-02 — Exclusions
**As a** user **I want** to exclude folders/files **so that** noisy content is ignored.
**Acceptance Criteria**
- Add exclusion patterns (e.g., `node_modules`, `.git`, glob patterns).
- Exclusions persist in settings and are honored during index and search.
- UI shows active exclusions; CLI lists them via `corpus exclusions`.

### EP01-US-03 — Build Index
**As a** user **I want** to trigger an index build **so that** my corpus becomes searchable.
**Acceptance Criteria**
- Index command builds metadata + searchable chunks for `.md`, `.txt` (and basic `.pdf` text).
- Shows progress (% files processed, time elapsed, ETA).
- Produces an index DB (e.g., SQLite/JSON) with deterministic hashing for change detection.
- Completes within BRD performance targets on 2k files.

### EP01-US-04 — Re-index on Demand
**As a** user **I want** to rebuild the index **so that** changes are reflected.
**Acceptance Criteria**
- Detects new/modified/deleted files via content hash + mtime.
- Rebuild touches only changed entries where possible.
- Post‑reindex searches reflect changes.

### EP01-US-05 — PDF Text Extraction (Basic)
**As a** user **I want** basic PDF text ingestion **so that** PDFs appear in search.
**Acceptance Criteria**
- Extract text from simple PDFs; mark complex ones as “preview not guaranteed”.
- Include file type in results; allow filter by `.pdf`.
- If extraction fails, index metadata and provide “open externally” action.

### EP01-US-06 — Configuration Export/Import
**As a** user **I want** to export/import corpus settings **so that** I can migrate setups.
**Acceptance Criteria**
- Export settings to JSON (folders, exclusions).
- Import validates paths; warns on missing paths.

---

## Testing Tasks

### EP01-TEST-01 — Unit: Indexer & Hashing
**Acceptance Criteria**
- Deterministic hash for identical files across runs.
- Skips unchanged files; processes changed ones.
- Mocks for FS operations; 95% branch coverage on indexer module.

### EP01-TEST-02 — Integration: Index Build/Rebuild
**Acceptance Criteria**
- Fixture corpus with mixed types; initial build creates expected DB rows.
- Modify/delete/add files; rebuild updates DB accurately.
- Exclusions prevent blacklisted paths from indexing.

### EP01-TEST-03 — E2E: CLI & UI Index Flow
**Acceptance Criteria**
- CLI: `corpus add`, `corpus exclusions add`, `index build` behave as spec.
- UI: Add folder → Index → See counts and timestamps.
- Runs in CI using ephemeral temp directories.

### EP01-TEST-04 — PDF Extraction Fallbacks
**Acceptance Criteria**
- Given a scanned/complex PDF, system flags limited support without crash.
- Logs are redacted of document content.

### EP01-TEST-05 — Performance Smoke
**Acceptance Criteria**
- On 2k small files corpus, P50 build time meets BRD targets.
- k6 (or custom) script records latency baseline and asserts thresholds.
