# Functional Specification

## AI‑Native Project Documentation Workspace

### Authoring, Editing, and Versioning Extension

---

## 1. Overview

This specification defines the functional behavior of the extended documentation workspace.  
It introduces document creation, editing, autosave, versioning, and AI‑assisted content generation while maintaining full local‑first consistency.

---

## 2. Dependencies

- Existing MCP infrastructure for file management and indexing.
- EP03 (Read & Preview), EP06 (MCP Tools), EP08 (Client Interface), and EP09 (Performance) as prerequisites.
- Database support for storing multiple document versions.
- LLM integration endpoint available locally (Ollama/compatible).

---

## 3. Functional Architecture

### Components

- **Markdown Editor UI** — Provides authoring interface with toolbar for formatting (bold, italic, heading, quote, table).
- **Autosave Engine** — Detects edits, saves to disk and DB after 800ms inactivity.
- **Version Controller** — Maintains version table (file_id, version_id, timestamp, hash, diff reference).
- **Indexer Hook** — Triggers re‑index after successful save.
- **AI Assistant** — Accepts context + prompts to generate or refine sections.
- **History Viewer** — Displays past versions and enables rollback.

---

## 4. Feature Specifications

### 4.1 Document CRUD

- **Create**: User can create new document under active project folder.
- **Read**: Display content in Markdown preview or edit mode.
- **Update**: Real‑time autosave after typing stops.
- **Delete**: Move file to trash; remove index and DB entries.

### 4.2 Versioning

- Each save creates a full version record.
- Version metadata stored with user, timestamp, checksum.
- Future: optional diff‑based compression.

### 4.3 Autosave Behavior

- Debounce interval: 800ms inactivity.
- Batch multiple keystrokes to minimize disk writes.
- Save success → trigger index update.
- Failure → revert to last known good version.

### 4.4 AI‑Assisted Authoring

- **Generate Mode**: LLM creates document from user prompt.
- **Refine Mode**: LLM improves or expands user content.
- AI usage logged with metadata (model, tokens, timestamp).

### 4.5 Markdown Editor Toolbar

Buttons include:

- Heading levels (H1–H3)
- Bold / Italic / Code
- Quote / Bullet list / Numbered list
- Insert link, table, divider
- AI assist button (Generate/Refine)

### 4.6 Auto‑Indexing

- On save, call existing indexing service via MCP tool.
- Index update confirmed before user notification.

### 4.7 Project Integration

- Each document linked to active project ID.
- File saved to project folder and tracked in DB.

### 4.8 History & Rollback

- Timeline view of versions (chronological order).
- Rollback restores selected version and creates a new entry.

---

## 5. Data Model

### Tables

- **projects** (id, name, description, created_at)
- **files** (id, project_id, path, title, created_at, updated_at)
- **file_versions** (id, file_id, content, timestamp, hash)
- **ai_history** (id, file_id, version_id, model, prompt, tokens, created_at)

Relationships:

- 1 project → many files
- 1 file → many versions
- Versions link to AI interactions if generated/refined

---

## 6. UI/UX Requirements

- Dual‑pane layout (Editor / Preview).
- Toolbar with Markdown helpers.
- History sidebar or modal for version view.
- Visual confirmation for autosave (icon change).
- AI panel for prompts and results insertion.

---

## 7. Non‑Functional Requirements

| Category    | Target                                         |
| ----------- | ---------------------------------------------- |
| Performance | Autosave < 1s, version retrieval < 200ms       |
| Reliability | Autosave recovery from crash without data loss |
| Scalability | Support 10k documents, 100 versions each       |
| Privacy     | Local data only, no remote storage             |
| Usability   | Keyboard shortcuts, accessible toolbar         |

---

## 8. User Stories and Acceptance Criteria

### FS‑US‑01 — Create and Edit Documents

**Given** I am inside a project  
**When** I create a new document  
**Then** it should open in the Markdown editor and autosave after edits.

### FS‑US‑02 — Autosave and Versioning

**Given** I am editing  
**When** I stop typing for 800ms  
**Then** the system saves changes and creates a new version in DB and disk.

### FS‑US‑03 — AI‑Assisted Generation

**Given** I open AI Assist mode  
**When** I enter a prompt  
**Then** the LLM should generate content and insert it into the document.

### FS‑US‑04 — View and Rollback Versions

**Given** I open version history  
**When** I select a previous version  
**Then** I can view or restore it as the active version.

### FS‑US‑05 — Auto‑Indexing

**Given** a document is saved  
**When** autosave completes  
**Then** the index updates automatically and confirms success.

---

## 9. Open Design Questions

1. Should autosave latency be configurable by user (e.g. 500–1500ms)?
2. Should version rollback preserve the reverted version or overwrite it?
3. Should AI‑generated text be visually distinguished (e.g. background highlight)?
4. Should file deletion move to trash or delete immediately?

---
