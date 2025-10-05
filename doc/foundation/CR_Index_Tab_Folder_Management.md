# Change Request Epic — Index Tab with Folder Management

## Description

Currently, users can add folders and trigger indexing, but there is no dedicated UI/CLI tab to manage indexed folders.  
This change introduces an **Index tab** (UI) or `corpus list` (CLI) that shows indexed folders and enables management actions.

## Purpose

Enable users to:

- View a list of all indexed folders.
- Initiate reindexing for a specific folder.
- Remove a folder (and its contents) from the index.

## User Stories

### CR-INDEX-US-01 — List Indexed Folders

**As a** user **I want** to see a list of indexed folders **so that** I know what is currently managed.  
**Acceptance Criteria:**

- UI: Index tab lists folders with path, file count, last indexed timestamp.
- CLI: `corpus list` shows the same details.
- List updates dynamically after add/remove/reindex.

### CR-INDEX-US-02 — Reindex Folder

**As a** user **I want** to reindex a specific folder **so that** changes are applied without affecting other folders.  
**Acceptance Criteria:**

- UI: Reindex button next to each folder.
- CLI: `corpus reindex <path>` runs reindex on that folder only.
- Progress indicator shown during reindex.
- After completion, metadata updates (timestamp, file count).

### CR-INDEX-US-03 — Remove Folder from Index

**As a** user **I want** to remove a folder and its contents **so that** irrelevant or deprecated data is excluded.  
**Acceptance Criteria:**

- UI: Remove action (with confirmation dialog).
- CLI: `corpus remove <path>` removes index entries.
- Folder is fully purged from index DB.
- Remaining folders and results unaffected.

## Testing Tasks

- **Unit:**
  - Index manager correctly tracks add/list/reindex/remove.
  - Removal deletes all entries associated with folder path.

- **Integration:**
  - `corpus list` reflects correct state after add/remove/reindex.
  - Reindex updates metadata without duplicating entries.

- **E2E:**
  - UI: Navigate to Index tab, see folder list, trigger reindex/remove.
  - CLI: Run commands, verify output.
  - Confirmation dialogs prevent accidental folder deletion.

---
