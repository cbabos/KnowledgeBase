# Change Request Epic — Project Context and Multi-Project Management

## Description
Introduce advanced **project context support** with the ability to manage projects (CRUD), connect folders to projects, and (in the future) assign projects to specific indexed files.  
This ensures scalability when multiple projects’ documentation is managed in the same system.

## Purpose
- Enable **project-aware indexing and querying**.  
- Allow **CRUD management** of projects.  
- Provide clear **folder-to-project mapping**.  
- Future-proof the system with file-level assignments.

---

## User Stories

### CR-PROJ-US-01 — CRUD Project Management
**As a** user  
**I want** to create, view, update, and delete projects  
**So that** I can manage projects as logical containers.  

**Acceptance Criteria:**  
- UI: “Projects” tab shows all projects with name/description.  
- CLI: `project create <name>`, `project list`, `project update <id>`, `project delete <id>`.  
- Delete project prompts confirmation if files are still indexed.  
- Updates persist in DB and reflect immediately in UI/CLI.

---

### CR-PROJ-US-02 — Connect Folders to Projects
**As a** user  
**I want** to associate one or more folders with a project  
**So that** all indexed files are scoped to that project.  

**Acceptance Criteria:**  
- Adding a folder requires selecting a project.  
- DB stores folder→project association.  
- Reindex applies correct project tags to all files inside.  
- CLI: `corpus add <path> --project <id>`

---

### CR-PROJ-US-03 — Switch Active Project Context
**As a** user  
**I want** to switch my active project context  
**So that** queries are scoped to relevant files.  

**Acceptance Criteria:**  
- Active project displayed in UI header / CLI prompt.  
- All search/Q&A limited to that project by default.  
- Option to query across multiple projects: `--projects=A,B`.  

---

### CR-PROJ-US-04 — Future: File-Level Assignment
**As a** user  
**I want** to reassign individual files to projects  
**So that** shared or misclassified files can be corrected.  

**Acceptance Criteria (Future Scope):**  
- UI: File details panel includes “Change Project” action.  
- CLI: `file assign <file_id> --project <project_id>`  
- File history preserved (previous project reference in metadata).  

---

## Testing Tasks

- **Unit Tests**  
  - CRUD ops create/update/delete projects correctly.  
  - Folder association logic stores valid project IDs.  

- **Integration Tests**  
  - Indexing pipeline tags files with project ID from associated folder.  
  - Switching projects scopes queries correctly.  

- **E2E Tests**  
  - UI: Create project → add folder → index → search → confirm scoping.  
  - CLI: Same flow via commands.  
  - Deleting project removes associations; confirmation prevents accidental deletion.  

---
