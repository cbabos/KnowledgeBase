export interface MCPTool {
  name: string;
  description: string;
  input_schema: any;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface IndexedFolder {
  path: string;
  project_id?: string;
  file_count: number;
  last_indexed?: string;
}

export interface Document {
  id: string;
  path: string;
  filename: string;
  extension: string;
  size: number;
  modified_at: string;
  title?: string;
  tags: string[];
  headings: string[];
  content_excerpt: string;
  content_hash: string;
  indexed_at: string;
  version: number;
  is_latest: boolean;
  project_id?: string;
}

export interface Snippet {
  text: string;
  start_pos: number;
  end_pos: number;
  highlighted: string;
}

export interface SearchResult {
  document: Document;
  score: number;
  snippets: Snippet[];
}

export interface SearchFilters {
  file_types?: string[];
  folders?: string[];
  tags?: string[];
  project_ids?: string[];
}

export interface MCPRequest {
  tool: string;
  arguments: any;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface QAAnswer {
  answer: string;
  confidence: 'low' | 'medium' | 'high';
  citations: Citation[];
  context_chunks: number;
}

export interface Citation {
  document_id: string;
  filename: string;
  path: string;
  chunk_id: number;
  excerpt: string;
  used_version: number;
  latest_version: number;
  is_latest: boolean;
}

export interface IndexingResult {
  files_processed: number;
  files_skipped: number;
  files_failed: number;
  errors: string[];
}

export interface VersionHistory {
  path: string;
  versions: Document[];
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  line: number;
  content: string;
}

export interface VersionDiff {
  path: string;
  version_a: number;
  version_b: number;
  diff: {
    lines: DiffLine[];
    summary: {
      added: number;
      removed: number;
      unchanged: number;
    };
  };
  document_a: Document;
  document_b: Document;
}
