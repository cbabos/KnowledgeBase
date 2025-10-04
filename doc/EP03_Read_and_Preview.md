# EP03 — Read & Preview

> Note: These epics, user stories, and testing tasks are derived from the BRD and WBS for the **AI‑Native Personal Knowledge Retriever (MCP)**.
> Assumed stack for concreteness (can be adapted): **TypeScript/Node.js** for MCP server, **React** minimal web UI, **CLI** for headless usage.
> Suggested test tools: **Vitest/Jest** (unit), **Playwright** (web e2e), **ts-node** or **zx** (CLI e2e), and **k6** (perf). JSON Schema validation for MCP tool I/O.

## Description

Enable preview of notes with Markdown rendering and navigation to headings/sections; copy snippets.

## Dependencies

- EP01 (Index) for metadata
- EP02 (Search) for entry points
- EP08 (Client) for UI

---

## User Stories

### EP03-US-01 — Preview Markdown

**As a** user **I want** to preview Markdown **so that** I can validate content quickly.
**Acceptance Criteria**

- Renders Markdown with headings, code blocks, lists, tables.
- Safe rendering (no script execution).

### EP03-US-02 — Navigate Headings

**As a** user **I want** to jump to sections **so that** I can find context.
**Acceptance Criteria**

- Table of contents (if headings present).
- Clicking a heading scrolls to that section.

### EP03-US-03 — Copy Snippet

**As a** user **I want** to copy a snippet **so that** I can reuse content.
**Acceptance Criteria**

- Select text in preview and copy; button to copy code block.
- Confirmation toast.

### EP03-US-04 — Open in Editor

**As a** user **I want** to open the file externally **so that** I can edit in my editor.
**Acceptance Criteria**

- “Open in default editor” action uses OS handler; CLI prints path.

---

## Testing Tasks

### EP03-TEST-01 — Unit: Markdown Renderer

**Acceptance Criteria**

- Sanitization prevents script/style injection.
- Code fences render; tables display correctly.

### EP03-TEST-02 — E2E: TOC Navigation

**Acceptance Criteria**

- Files with multiple H1–H3 generate a TOC.
- Clicking TOC jumps and URL hash updates (web).

### EP03-TEST-03 — Accessibility

**Acceptance Criteria**

- Keyboard navigation for headings/links.
- Contrast and ARIA roles validated (axe checks).
