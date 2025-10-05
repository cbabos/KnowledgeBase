# EP10 — Packaging & Release

> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.

## Description

Package the application for macOS/Windows (Linux best-effort), versioning, and release notes.

## Dependencies

- EP08 for client deliverables

---

## User Stories

### EP10-US-01 — Build Artifacts

**As a** developer **I want** installable builds **so that** users can run the app easily.
**Acceptance Criteria**

- macOS app/DMG and Windows installer produced in CI.
- Linux tarball produced (best-effort).

### EP10-US-02 — Versioning & Changelog

**As a** user **I want** clear versions **so that** I understand changes.
**Acceptance Criteria**

- Semantic versioning; automated changelog from conventional commits.
- Release notes include privacy changes and known limitations.

### EP10-US-03 — Onboarding

**As a** user **I want** first-run setup **so that** I can start in ≤ 5 minutes.
**Acceptance Criteria**

- Guided wizard: add folder, exclusions, index now.
- Link to privacy notice and consent if enabling Remote.

---

## Testing Tasks

### EP10-TEST-01 — Install/Uninstall

**Acceptance Criteria**

- Install on fresh macOS/Windows CI images; app launches; uninstall leaves no residue.
- Code-signing/notarization flows verified (where applicable).

### EP10-TEST-02 — First-Run Wizard

**Acceptance Criteria**

- E2E script completes setup in under 5 minutes with fixture corpus.
- Wizard generates expected config files and keychain entries.

### EP10-TEST-03 — Release Integrity

**Acceptance Criteria**

- Checksums and signatures published and verified in CI.
- Reproducible builds within acceptable delta.
