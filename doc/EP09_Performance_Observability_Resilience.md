# EP09 — Performance, Observability & Resilience


> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.


## Description
Meet BRD latency targets; add lightweight observability; handle failures gracefully.

## Dependencies
- Cross-cutting, relies on EP01–EP08

---

## User Stories

### EP09-US-01 — Query Latency Budgets
**As a** user **I want** snappy results **so that** I stay in flow.
**Acceptance Criteria**
- P50 < 1.5s, P90 < 3s for search on 2k files.
- Budget dashboards (local only) report moving averages.

### EP09-US-02 — Graceful Degradation
**As a** user **I want** helpful errors **so that** I can recover.
**Acceptance Criteria**
- Network/model failures produce actionable retries/backoff.
- UI shows non-blocking toasts; CLI exit codes consistent.

### EP09-US-03 — Minimal Telemetry (Local)
**As a** user **I want** local-only metrics **so that** privacy is preserved.
**Acceptance Criteria**
- Metrics stored locally; aggregation opt-in; no document text captured.

---

## Testing Tasks

### EP09-TEST-01 — Performance Tests
**Acceptance Criteria**
- Automated load tests run in CI/CD nightly; thresholds gate merges.
- Reports stored as artifacts; trend charts generated.

### EP09-TEST-02 — Chaos/Failure Injection
**Acceptance Criteria**
- Simulate LLM timeout, FS permission errors, and index DB corruption.
- System recovers or shows clear remediation steps.

### EP09-TEST-03 — Log/Metric Hygiene
**Acceptance Criteria**
- No sensitive content in logs/metrics; linters check for accidental dumps.
