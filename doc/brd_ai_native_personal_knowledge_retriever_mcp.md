# Business Requirements Document (BRD)

**Project:** AI‑Native Personal Knowledge Retriever (MCP‑enabled)

**Client:** Internal (Software Engineering Enablement)

**Version:** 0.9 (Draft)  
**Date:** 2025‑09‑29  
**Authoring Perspective:** Client → for Business Analyst consumption

[Epics_Index](./Epics_Index.md)
[WBS](./WBS_Personal_Knowledge_Retriever.md) 

---

## 1) Executive Summary
Engineers struggle to recall relevant snippets from personal knowledge (Markdown notes, READMEs, PDFs, code comments). The proposed solution is a local‑first assistant that can search, read, summarize, and answer questions over a user’s note corpus via the **Model Context Protocol (MCP)**. The assistant exposes clearly defined tools (e.g., `list_notes`, `search_notes`, `read_note`, `summarize_note`, `answer_question`) and lets an LLM orchestrate them.

**Primary outcomes**
- Reduce time spent looking for existing knowledge by ≥30%.
- Improve reuse of prior work/decisions.
- Establish a modular foundation to add more tools/data sources later.

---

## 2) Business Context & Problem Statement
- **Context:** Individual engineers and small teams accumulate knowledge across Markdown, text files, and occasional PDFs. Traditional search is brittle (exact keywords), and manual browsing is slow.
- **Problem:** Engineers cannot quickly retrieve the exact snippet or summary they need, at the moment of work, without switching tools or manually scanning files.
- **Opportunity:** A local assistant that understands queries in natural language, scans the corpus, and returns targeted excerpts or concise summaries.

---

## 3) Goals, Non‑Goals, Success Metrics
**Goals**
1. Provide fast keyword + semantic search over a local corpus.  
2. Enable one‑click reading and summarization of found notes.  
3. Allow natural‑language Q&A grounded in the user’s notes, with citations.  
4. Keep data local by default; user explicitly opts into any remote model/provider.

**Non‑Goals (Initial Release)**
- Multi‑user collaboration/sync.  
- Real‑time collaborative editing.  
- Full document authoring tool (beyond preview).  
- Automatic web scraping/crawling beyond the specified local folders.

**Success Metrics (KPIs)**
- **Retrieval Speed:** < 1.5s P50, < 3s P90 for queries on a 2k‑file corpus.  
- **Precision@Top‑3 (measured by user feedback):** ≥ 70% perceived relevance.  
- **Usage:** ≥ 10 queries/day per active user within 2 weeks.  
- **Data Sovereignty:** 100% of default flows operate without sending documents off‑device.

---

## 4) Stakeholders & RACI
- **Client (Sponsor):** Software Engineering Enablement (R/A)
- **End Users:** Individual software engineers (I)
- **Business Analyst:** (R)
- **Tech Lead/Architect:** (C)
- **Security & Privacy:** (C)
- **Dev Team:** (R)
- **QA:** (R)

R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## 5) Personas
1. **Eva, Staff Engineer (Primary)**  
   - Needs: Fast recall of past decisions/snippets, minimal context switching.  
   - Frustrations: Keyword mismatch, too many places to look.
2. **Mark, Senior Developer (Secondary)**  
   - Needs: Quick summaries of long docs, links to sources.
3. **Lina, Tech Writer (Tertiary)**  
   - Needs: Accurate citations, metadata, and consistent summaries.

---

## 6) Scope
**In‑Scope (MVP)**
- Local corpus ingestion from configured folders (Markdown, TXT; basic PDF).  
- Tools: `list_notes`, `read_note`, `search_notes`, `summarize_note`, `answer_question`.  
- Simple UI: CLI + minimal web view for results & citations.  
- Local‑first operation; optional external LLM provider via explicit toggle.  
- Basic metadata extraction (title, headings, last modified, frontmatter tags).

**Out‑of‑Scope (MVP)**
- Real‑time file system watch with immediate re‑index (can be on‑demand).  
- Editors or note creation flows.  
- Multi‑tenant user management and sharing.

---

## 7) Assumptions & Constraints
- **Assumptions:**  
  - Users can provide one or more local directories containing notes.  
  - Users are comfortable running a desktop app or CLI locally.  
  - Some notes include YAML frontmatter or headings; many do not.  
- **Constraints:**  
  - **Privacy/EU GDPR:** default local processing; clear disclosure if remote models are enabled.  
  - **Performance:** acceptable on a modern laptop; no GPU required for MVP.  
  - **Portability:** works on macOS and Windows (Linux best‑effort in MVP).

---

## 8) High‑Level Solution Concept
A local **MCP server** exposes retrieval/summarization capabilities as tools. An **LLM‑enabled client** (chat UI or CLI) decides which tool(s) to call. The user asks questions in natural language; the system returns concise answers with links to source snippets.

**Core MCP Tools (Initial):**
- `list_notes()` → list indexed files with basic metadata.  
- `read_note(path)` → return file content (with safety limits).  
- `search_notes(query, top_k)` → keyword search (AND/OR, stemming optional).  
- `summarize_note(path, length)` → summary (short/medium/long).  
- `answer_question(query, top_k)` → retrieve relevant chunks and synthesize an answer with citations.

---

## 9) Functional Requirements (MVP)
**FR‑1: Corpus Configuration**
- FR‑1.1: User can add/remove folders from the corpus.  
- FR‑1.2: User can run an explicit index (initial and re‑index).  
- FR‑1.3: Exclude patterns (e.g., `node_modules`, `.git`).

**FR‑2: Search**
- FR‑2.1: Keyword search over filenames and content.  
- FR‑2.2: Return ranked results with snippet previews and match highlights.  
- FR‑2.3: Filters: file type, folder, last modified date, tag (from frontmatter).

**FR‑3: Read & Preview**
- FR‑3.1: Open a note preview with basic Markdown rendering.  
- FR‑3.2: Navigate to headings/sections if available.  
- FR‑3.3: Copy snippet to clipboard.

**FR‑4: Summarization**
- FR‑4.1: Summarize a single note into short/medium/long variants.  
- FR‑4.2: Include a bullet key‑points mode.

**FR‑5: Question Answering**
- FR‑5.1: Accept natural‑language questions.  
- FR‑5.2: Retrieve top‑k relevant chunks and generate an answer grounded in text.  
- FR‑5.3: Provide citations (file and heading with offsets).  
- FR‑5.4: Show uncertainty (e.g., “Low confidence”) if evidence is weak.

**FR‑6: MCP Interface**
- FR‑6.1: Tools are discoverable and typed (schemas for inputs/outputs).  
- FR‑6.2: Safe output sizes with pagination/chunking.  
- FR‑6.3: Tool errors include actionable messages.

**FR‑7: Settings & Privacy**
- FR‑7.1: Toggle between local and remote LLMs; default is local‑only.  
- FR‑7.2: Clear disclosure if any data may leave device; opt‑in required.  
- FR‑7.3: Configurable data retention for logs (off by default).

---

## 10) Non‑Functional Requirements (NFRs)
- **NFR‑1 Performance:** P50 query latency < 1.5s on 2k files/200MB corpus.  
- **NFR‑2 Reliability:** Indexing completes without crash on 50k files/2GB.  
- **NFR‑3 Security/Privacy:** Default operation keeps documents on device; redact content from logs.  
- **NFR‑4 Usability:** New user can complete setup in ≤ 5 minutes.  
- **NFR‑5 Accessibility:** Keyboard navigation and screen‑reader friendly basic UI.  
- **NFR‑6 Observability:** Minimal, local debug logs with opt‑in detail.

---

## 11) User Stories with Acceptance Criteria (MVP)
**US‑1 Configure Corpus**  
*As a user, I want to add a folder so that the app indexes my notes.*  
**AC:**  
- Given a valid path, when I click **Add Folder**, then it appears in the corpus list.  
- Given a folder with files, when I click **Index Now**, then I see progress and a success state.

**US‑2 Exclude Patterns**  
*As a user, I want to exclude noisy folders/files so searches stay relevant.*  
**AC:**  
- Given I add `node_modules` to exclusions, when I search, then files inside it are absent from results.

**US‑3 Keyword Search**  
*As a user, I want to search by keyword and see relevant snippets quickly.*  
**AC:**  
- Given a query, when results load, then I see filename, path, modified time, and 1–2 highlighted snippets.  
- Results return within NFR‑1 thresholds.

**US‑4 Filters**  
*As a user, I want to filter results by type, folder, date, or tag.*  
**AC:**  
- Given I select `Markdown` type and `last 30 days`, when I search, then only matching files appear.

**US‑5 Read Note**  
*As a user, I want to open a note preview to validate context.*  
**AC:**  
- Given I click a result, when the preview opens, then Markdown is rendered and headings are navigable.

**US‑6 Summarize Note**  
*As a user, I want a concise summary of a long note.*  
**AC:**  
- Given I click **Summarize → Short**, when processing completes, then I see ~3–5 bullet points with a link to the source.

**US‑7 Ask a Question**  
*As a user, I want to ask a natural‑language question and get an answer grounded in my notes.*  
**AC:**  
- Given I ask “What did I decide about Docker volumes?”, when the answer shows, then it includes citations to the exact files/snippets used.

**US‑8 Confidence & Limits**  
*As a user, I want the assistant to avoid hallucinations.*  
**AC:**  
- Given evidence is weak, when an answer is shown, then the UI displays a **Low confidence** indicator and encourages opening sources.

**US‑9 Local‑First Privacy**  
*As a user, I want processing to remain local by default.*  
**AC:**  
- Given default settings, when I query, then no document content is sent to remote services.

**US‑10 Remote Model Opt‑In**  
*As a user, I want to optionally use a cloud LLM.*  
**AC:**  
- Given I toggle **Use Cloud Model** and provide an API key, when I query, then PII warnings and a confirm dialog appear once.

**US‑11 Re‑index**  
*As a user, I want to rebuild the index after changing files.*  
**AC:**  
- Given I click **Re‑index**, when it completes, then new/removed files are reflected in searches.

**US‑12 Logs**  
*As a user, I want optional query logs for troubleshooting.*  
**AC:**  
- Given logs are ON, when I query, then redacted logs (no full document text) are stored locally.

---

## 12) Data Model (Conceptual)
**Document**  
- `id`, `path`, `filename`, `extension`, `size`, `modified_at`  
- `title` (from H1/frontmatter), `tags` (frontmatter), `headings` (array)  
- `content_excerpt` (first N chars), `hash` (for change detection)

**IndexEntry**  
- `document_id`, `chunk_id`, `chunk_text`, `positions` (for highlighting)  
- Optional: `embedding_vector` (if semantic search is enabled post‑MVP)

**Settings**  
- `folders[]`, `exclusions[]`, `model = local|remote`, `logging = off|on`

---

## 13) Process Flows (Textual)
**Flow A: Search → Preview**  
User enters query → `search_notes` returns ranked hits → UI shows results with snippets → user opens preview via `read_note`.

**Flow B: Question → Answer with Citations**  
User asks question → `answer_question` performs retrieval (keyword; optional embeddings later) → LLM composes answer → UI displays answer + citations → user can open sources.

**Flow C: Summarize**  
User selects file → `summarize_note` reads content → LLM produces short/medium/long → UI shows summary with link to full note.

---

## 14) Compliance & Privacy
- **Default Local Processing:** All content remains on device unless the user opt‑ins to a remote model.  
- **GDPR Considerations (EU):** Treat notes as potentially personal data. Provide: clear consent for remote processing, data handling notice, and an easy “delete logs” action.  
- **Telemetry:** Off by default; if enabled, must be anonymized and content‑free.

---

## 15) Release Plan (Phased)
**MVP (v1.0)**  
- FR‑1 to FR‑7 as listed; file types: `.md`, `.txt` (basic `.pdf` text extraction); CLI + minimal web view; local model.  
- Success Criteria: KPIs hit on a 2k‑file corpus; positive user feedback.

**v1.1 Enhancements**  
- Optional embeddings + semantic search; caching; better PDF parsing.  
- File‑watcher incremental indexing.

**v1.2 Integrations**  
- Add importers: browser bookmarks export, Git READMEs.  
- Tag editor and saved searches.

---

## 16) Risks & Mitigations
- **R‑1 PDF Extraction Quality** → Mitigate by labeling “experimental” and providing open‑in‑app fallback.  
- **R‑2 Performance on Large Corpora** → Provide chunked indexing, progress UI, and clear guidance on exclusions.  
- **R‑3 Hallucinations** → Ground answers in retrieved text only; display confidence; show citations.

---

## 17) UX Requirements (MVP)
- Clean search bar, clear results list with highlights, compact preview pane.  
- Keyboard shortcuts for search (⌘/Ctrl‑K), open result (Enter), back (Esc).  
- Dark/light mode toggle.  
- Clear privacy indicators (Local vs Remote badge).

---

## 18) Glossary
- **MCP (Model Context Protocol):** Standard for LLM↔tool communication.  
- **Tool:** A callable capability (search, read, summarize) exposed over MCP.  
- **RAG:** Retrieval‑augmented generation (retrieve relevant text before answering).  
- **Embedding:** Vector representation for semantic similarity search.  
- **Frontmatter:** YAML header in Markdown providing metadata.

---

## 19) Open Questions (for BA to drive)
1. What is the minimum set of file types for MVP beyond `.md` and `.txt`?  
2. Do we require Linux support at parity with macOS/Windows for v1.0?  
3. What level of PDF fidelity is acceptable (text‑only vs layout‑aware)?  
4. Should we support Hungarian UI/localization in v1.0?  
5. What retention window (if any) for local logs is acceptable (e.g., 7 days)?

---

## 20) Quality Checklist (Self‑Review)
- [x] Clear problem statement and measurable outcomes.  
- [x] In/Out of scope crisply defined.  
- [x] Functional + non‑functional requirements enumerated.  
- [x] User stories with acceptance criteria included.  
- [x] Privacy/GDPR considerations addressed.  
- [x] Risks & mitigations listed.  
- [x] Open questions for BA facilitation captured.

---

### Change Log
- **v0.9:** Initial BRD draft for BA review.

