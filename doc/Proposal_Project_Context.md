# Proposal — Project Context and Multi-Project Support

## Background
As the tool scales to store documentation from multiple projects, users need a way to scope context to avoid irrelevant results. The goal: **project-aware indexing and querying**.

## Proposal
Introduce a **Project Context Model**:
- **Projects Table:** Each project has an ID, name, description, root folder(s), tags.  
- **Association:** Every note belongs to one project (default project = “General”).  
- **Context Switching:** Users set active project context for search/Q&A.  
- **Cross-Project Search:** Advanced option to include multiple projects.

## User Stories

### PROJ-US-01 — Define Project Context
**As a** user **I want** to define projects **so that** notes are grouped logically.  
**Acceptance Criteria:**  
- Add project with name + folder mappings.  
- Project metadata persists in DB.  

### PROJ-US-02 — Switch Project Context
**As a** user **I want** to switch between projects **so that** results are scoped.  
**Acceptance Criteria:**  
- Active project shown in UI header; CLI prompt indicates `[project]`.  
- All queries default to active project scope.  

### PROJ-US-03 — Cross-Project Queries
**As a** user **I want** to query multiple projects **so that** I can compare across them.  
**Acceptance Criteria:**  
- Multi-select projects in UI.  
- CLI: `--projects=A,B`.  

---

## Testing Tasks
- Unit: Notes indexed under correct project IDs.  
- Integration: Switching context restricts search/Q&A results.  
- E2E: Project switch reflected in UI header + queries.  
