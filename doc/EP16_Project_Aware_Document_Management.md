---
**Epic ID:** EP16  
**Title:** Project‑Aware Document Management  
**Status:** Draft  
**Owner:** Business Analyst / Client  
**Dependencies:** CR: Project Context and Management  
**Last Updated:** 2025-10-05  
---

### Overview

Integrate document creation and indexing within the existing Project Context system. Each file belongs to one project and is saved inside its assigned folder.

### User Stories

#### EP16‑US‑01 — Create Document in Project

**As a** user **I want** to create a document inside a project context **so that** the file is stored and indexed properly.

**Acceptance Criteria:**

- “New Document” prompts for project association.
- File saved in linked project folder.
- Index updates automatically.

**Development Tests:**

- Integration: File path maps to correct project.
- Unit: Project ID stored in DB.

**QA Tests:**

- E2E: Create project → add doc → verify index query scoped correctly.

---

#### EP16‑US‑02 — Project Filter in Document List

**As a** user **I want** to filter my documents by project **so that** I can focus on relevant work.

**Acceptance Criteria:**

- Document list filter by project name/ID.
- Active project visible in header.
- Changing project updates visible documents.

**Development Tests:**

- Unit: Filter query returns correct results.
- Integration: Project switch updates document list.

**QA Tests:**

- E2E: Switch projects → confirm visible docs update instantly.
