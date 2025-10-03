# Change Request Epic — Q&A as Default Entry Point

## Description
Users find search less useful as a standalone; Q&A should become the default landing experience. Search will remain available as a secondary option.

## User Stories

### CR-QA-US-01 — Default Landing = Q&A
**As a** user **I want** the app to open to Q&A **so that** I can immediately ask questions.  
**Acceptance Criteria:**  
- Default web UI opens to Q&A input field.  
- CLI opens interactive Q&A mode (`ask>` prompt).  

### CR-QA-US-02 — Access Search Easily
**As a** user **I want** to access search quickly **so that** I can still browse results.  
**Acceptance Criteria:**  
- UI: “Switch to Search” tab/button available.  
- CLI: `search <query>` remains available.  

### CR-QA-US-03 — Show document version
**As a** user **I want** to see the version of the cited document and also the latest version of said document **so that** I can analise how fresh the information is.  
**Acceptance Criteria:**  
- UI: When showing the citation both the used version and the latest version of the document is represented on the page.  

---

## Testing Tasks

- E2E: Launch app → land on Q&A screen.  
- CLI integration: Launch CLI with no args → interactive Q&A prompt.  
- Regression: Search flows unchanged.  
