---
**Epic ID:** EP11  
**Title:** In‑App Markdown Editor  
**Status:** Draft  
**Owner:** Business Analyst / Client  
**Dependencies:** EP03 (Read & Preview), EP08 (Client Interfaces)  
**Last Updated:** 2025-10-05  
---

### Overview

Develop a native Markdown editor integrated into the main workspace. The editor must provide syntax highlighting, toolbar actions (bold, italic, heading, quote, list, table, link), and support real‑time editing with autosave hooks.

### User Stories

#### EP11‑US‑01 — Basic Markdown Editing

**As a** user **I want** to create and edit text using Markdown syntax **so that** I can write structured documents easily.

**Acceptance Criteria:**

- Editor supports Markdown syntax (headings, bold, italic, code, lists, tables).
- Toolbar buttons insert proper Markdown syntax at cursor position.
- Undo/Redo works for all editor actions.
- Editor updates instantly in preview pane.

**Development Tests:**

- Unit: Verify toolbar actions insert correct syntax.
- Integration: Editor and preview stay synchronized.
- Performance: Input latency <100ms for 10k‑char document.

**QA Tests:**

- E2E: Create a new note → apply all formatting options → verify visual output.
- Regression: Switching between edit and preview retains formatting.
- Accessibility: Keyboard shortcuts work for toolbar actions.

---

#### EP11‑US‑02 — Formatting Toolbar

**As a** user **I want** to apply Markdown formatting via a toolbar **so that** I don’t need to remember syntax manually.

**Acceptance Criteria:**

- Toolbar includes headings, bold, italic, quote, link, table.
- Tooltip shows Markdown equivalent.
- Toggle actions (bold, italic) apply/remove formatting correctly.

**Development Tests:**

- Unit: Toolbar actions map to Markdown tags accurately.
- Integration: Click/shortcut triggers update editor content.

**QA Tests:**

- UI regression for toolbar state changes.
- E2E: Format/unformat text multiple times without duplication.
