# Change Request Epic — Historical Versions of Notes

## Description
Currently, when a file is updated and re-indexed, the old version is overwritten. This removes the possibility of comparing historical versions or retrieving older context. Introduce **versioned indexing** so that users can access historical versions if desired.

## User Stories

### CR-HIST-US-01 — Enable Versioned Indexing
**As a** user **I want** the system to preserve historical versions **so that** I can review changes over time.  
**Acceptance Criteria:**  
- Default indexing stores each file version keyed by content hash + timestamp.  
- “Latest” version remains the default for search and Q&A.  
- User can toggle “include historical” in advanced search filters.  

### CR-HIST-US-02 — View Version History
**As a** user **I want** to see past versions of a note **so that** I can inspect changes.  
**Acceptance Criteria:**  
- UI shows timeline with modified dates.  
- Clicking a version opens preview side-by-side with latest.  

### CR-HIST-US-03 — Compare Versions
**As a** user **I want** to compare two versions **so that** I can see differences.  
**Acceptance Criteria:**  
- Diff view highlights added/removed/changed lines.  
- CLI: `notes diff <file> <versionA> <versionB>` returns unified diff.  

### CR-HIST-US-04 — Storage & Retention Policy
**As a** user **I want** control of history storage **so that** disk space remains manageable.  
**Acceptance Criteria:**  
- Settings allow retention (all versions / last N versions / last N days).  
- “Purge history” action available.  

---

## Testing Tasks

- Unit: Indexer stores new version without overwriting previous.  
- Integration: Search returns only latest by default; advanced flag includes older.  
- E2E: UI displays timeline, allows preview + diff.  
- Performance: Verify indexing large version history meets latency budgets.  
