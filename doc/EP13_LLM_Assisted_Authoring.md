---
**Epic ID:** EP13  
**Title:** LLM‑Assisted Authoring  
**Status:** Draft  
**Owner:** Business Analyst / Client  
**Dependencies:** EP06 (MCP Tools), EP11 (Editor)  
**Last Updated:** 2025-10-05  
---

### Overview

Integrate two‑way AI authoring: generate new documents from prompts or refine existing sections. Maintain user control and transparency for all AI‑generated content.

### User Stories

#### EP13‑US‑01 — Generate Document from Prompt

**As a** user **I want** to request a full document draft from a simple prompt **so that** I can save time writing initial versions.

**Acceptance Criteria:**

- Prompt modal allows entering topic and parameters.
- AI generates Markdown document.
- Draft appears in editor and is autosaved to project folder.

**Development Tests:**

- Integration: LLM API returns text and stores version.
- Unit: Draft saved correctly with AI metadata.

**QA Tests:**

- E2E: Enter prompt → verify generated doc appears in project folder.
- Manual: Check AI‑generated content stored locally only.

---

#### EP13‑US‑02 — Refine Existing Content

**As a** user **I want** the AI to enhance or expand sections I’ve written **so that** I can improve clarity and style.

**Acceptance Criteria:**

- User selects section → triggers “Refine” command.
- AI response replaces or appends section.
- Changes highlighted for review.
- Review toggle to accept/reject changes.

**Development Tests:**

- Unit: Refined text inserted correctly.
- Integration: Diff stored as new version with AI metadata.

**QA Tests:**

- E2E: Edit section → refine → verify updated version logged.
- Regression: Refine doesn’t overwrite entire document.
