# Work Breakdown Structure (WBS)

**Project:** AI‑Native Personal Knowledge Retriever (MCP‑enabled)  
**Format:** Deliverable‑oriented WBS  
**Level convention:**

- Level 1 = Major Phase
- Level 2 = Deliverable/Work Package
- Level 3 = Task

---

## 1. Project Management & Analysis

### 1.1 Project Initiation

- 1.1.1 Define scope and objectives
- 1.1.2 Identify stakeholders & roles
- 1.1.3 Initial risk assessment

### 1.2 Requirements Analysis

- 1.2.1 Validate BRD with stakeholders
- 1.2.2 Clarify open questions (file types, OS support, PDF fidelity, localization, logging retention)
- 1.2.3 Finalize functional & non‑functional requirements

### 1.3 Planning

- 1.3.1 High‑level roadmap sign‑off
- 1.3.2 Resource planning (team, infra)
- 1.3.3 Timeline & milestones

---

## 2. Architecture & Design

### 2.1 Technical Architecture

- 2.1.1 Define local‑first architecture
- 2.1.2 Select LLM integration method (local/remote)
- 2.1.3 Decide indexing approach (keyword vs embeddings)

### 2.2 Data Model & Schema

- 2.2.1 Document entity schema (metadata, content, hash)
- 2.2.2 Index schema design (chunks, positions, vectors)
- 2.2.3 Settings schema (folders, exclusions, privacy toggles)

### 2.3 UX/UI Design

- 2.3.1 Wireframes (search bar, results, preview)
- 2.3.2 Interaction design (filters, navigation, shortcuts)
- 2.3.3 Privacy indicators (local/remote badge)

---

## 3. Development

### 3.1 Corpus Management

- 3.1.1 Folder configuration & exclusions
- 3.1.2 Index build & re‑index functions
- 3.1.3 Incremental updates (later phase)

### 3.2 Search Functionality

- 3.2.1 Keyword search (filenames, content)
- 3.2.2 Filters (type, folder, date, tag)
- 3.2.3 Snippet highlighting

### 3.3 Read & Preview

- 3.3.1 Markdown rendering
- 3.3.2 Section navigation (headings)
- 3.3.3 Copy snippet function

### 3.4 Summarization

- 3.4.1 Single‑note summarization (short/medium/long)
- 3.4.2 Bullet point mode
- 3.4.3 UI integration

### 3.5 Question Answering (Q&A)

- 3.5.1 Retrieval (top‑k relevant chunks)
- 3.5.2 Answer synthesis via LLM
- 3.5.3 Citations display
- 3.5.4 Confidence indication

### 3.6 MCP Interface Implementation

- 3.6.1 Define MCP tools (`list_notes`, `read_note`, `search_notes`, etc.)
- 3.6.2 Input/output schema validation
- 3.6.3 Error handling & limits

### 3.7 Settings & Privacy

- 3.7.1 Local/remote LLM toggle
- 3.7.2 Opt‑in confirmation dialogs
- 3.7.3 Log retention options

---

## 4. Testing & QA

### 4.1 Unit Testing

- 4.1.1 Corpus functions
- 4.1.2 Search & filters
- 4.1.3 Summarization & Q&A

### 4.2 Integration Testing

- 4.2.1 MCP tool orchestration
- 4.2.2 Local/remote LLM switching
- 4.2.3 CLI & web UI consistency

### 4.3 Non‑Functional Testing

- 4.3.1 Performance & latency (2k files corpus)
- 4.3.2 Large corpus resilience (50k files)
- 4.3.3 Privacy & GDPR compliance

---

## 5. Deployment & Release

### 5.1 Environment Setup

- 5.1.1 Dev/test environment
- 5.1.2 Packaging for macOS & Windows
- 5.1.3 Linux best‑effort build

### 5.2 Release Management

- 5.2.1 MVP release (v1.0)
- 5.2.2 v1.1 semantic search enhancements
- 5.2.3 v1.2 integrations (bookmarks, Git repos)

### 5.3 Documentation & Training

- 5.3.1 User guide (setup, search, summarize, Q&A)
- 5.3.2 Technical documentation (MCP tools, API schemas)
- 5.3.3 Privacy/consent notices

---

## 6. Post‑Release & Continuous Improvement

### 6.1 User Feedback

- 6.1.1 Gather structured feedback (survey, logs if enabled)
- 6.1.2 Analyze KPIs (usage, retrieval speed, relevance)
- 6.1.3 Prioritize backlog

### 6.2 Enhancements

- 6.2.1 Semantic embeddings
- 6.2.2 Incremental file watching
- 6.2.3 Additional file formats (HTML, advanced PDFs)

### 6.3 Maintenance

- 6.3.1 Bug fixes
- 6.3.2 Dependency updates
- 6.3.3 Security reviews
