---
**Epic ID:** EP15  
**Title:** Version History and Rollback  
**Status:** Draft  
**Owner:** Business Analyst / Client  
**Dependencies:** EP12 (Versioning), EP11 (Editor)  
**Last Updated:** 2025-10-05  
---

### Overview

Provide timeline visualization and restore options for document versions.

### User Stories

#### EP15‑US‑01 — View Version History

**As a** user **I want** to view previous document versions **so that** I can track changes and evolution.

**Acceptance Criteria:**

- History sidebar lists versions by timestamp.
- Selecting version opens read‑only preview.
- Metadata displayed (author, time, AI involvement).

**Development Tests:**

- Unit: Version list loads in correct order.
- Integration: Preview loads selected version content.

**QA Tests:**

- E2E: Create multiple edits → view history → confirm order.
- Regression: History list updates after autosave.

---

#### EP15‑US‑02 — Rollback to Previous Version

**As a** user **I want** to restore an older version **so that** I can recover lost or incorrect edits.

**Acceptance Criteria:**

- Rollback button restores selected version and creates new entry.
- No data loss of intermediate versions.
- Version restored to disk and DB.

**Development Tests:**

- Unit: Rollback creates new version entry.
- Integration: Disk + DB sync after rollback.

**QA Tests:**

- E2E: Restore old version → verify editor shows correct content.
- Regression: Undo rollback reverts to prior state.
