# EP07 — Settings, Privacy & Telemetry

> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.

## Description

Local-first by default with explicit opt-in for remote models; configuration persistence; optional redacted logs.

## Dependencies

- EP08 for UI
- EP06 for tool exposure

---

## User Stories

### EP07-US-01 — Local/Remote Model Toggle

**As a** user **I want** to choose model location **so that** I control privacy/cost.
**Acceptance Criteria**

- Default = Local.
- Toggling to Remote shows one-time consent dialog explaining data handling.
- API key storage uses OS keychain; no plain-text keys in config.

### EP07-US-02 — Logging Controls

**As a** user **I want** to manage logs **so that** I can troubleshoot safely.
**Acceptance Criteria**

- Logs OFF by default; when ON, redact content and PII.
- Retention window configurable (e.g., 7/30 days); “Delete logs now” button.

### EP07-US-03 — Config Persistence

**As a** user **I want** settings to persist **so that** my setup remains intact.
**Acceptance Criteria**

- Settings stored in a human-readable JSON/TOML with comments.
- Import/export with validation and helpful errors.

---

## Testing Tasks

### EP07-TEST-01 — Consent Flow

**Acceptance Criteria**

- Enabling Remote requires explicit confirmation; stored proof-of-consent (timestamp).
- Revoking Remote clears tokens from keychain.

### EP07-TEST-02 — Log Redaction

**Acceptance Criteria**

- Unit tests verify redaction patterns; no raw document text written.
- E2E toggle writes/clears logs as configured.

### EP07-TEST-03 — Config Round-Trip

**Acceptance Criteria**

- Export → Delete local → Import restores settings exactly (except secrets).
