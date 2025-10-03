# Proposal — LLM-Assisted Documentation Creation

## Background
Beyond search and retrieval, users want to **generate documentation** for new projects, storing it locally and in the DB.

## Proposal
Introduce a **Documentation Creation Workflow** powered by LLMs:
1. **New Doc Wizard:** User starts “Create Documentation” flow.  
2. **Template Selection:** Choose template (Architecture, README, BRD, etc.).  
3. **LLM Draft:** Generate draft content guided by user prompts.  
4. **Edit & Approve:** User edits draft inline.  
5. **Persist:** Save file to filesystem (Markdown/PDF) and index into DB for future retrieval.

## User Stories

### DOC-US-01 — Start New Documentation
**As a** user **I want** to create new documentation **so that** I can capture project info.  
**Acceptance Criteria:**  
- UI/CLI command: `doc new`.  
- Prompts user for project association, type, title.  

### DOC-US-02 — Generate Draft with LLM
**As a** user **I want** an AI draft **so that** I save time writing.  
**Acceptance Criteria:**  
- Calls LLM with selected template + user context.  
- Draft rendered in preview/editor.  

### DOC-US-03 — Save to Filesystem & DB
**As a** user **I want** the doc stored persistently **so that** it is reusable.  
**Acceptance Criteria:**  
- File created in project folder with Markdown format.  
- Indexed in DB with metadata.  

### DOC-US-04 — Edit & Approve
**As a** user **I want** to refine AI drafts **so that** docs meet my standards.  
**Acceptance Criteria:**  
- Inline editor available in UI.  
- CLI: open in $EDITOR env var.  
- Only approved docs saved permanently.  

---

## Testing Tasks
- Unit: Doc metadata saved in DB with correct project ID.  
- Integration: Draft→Edit→Save creates file and index entry.  
- E2E: Wizard end-to-end flow works in UI and CLI.  
