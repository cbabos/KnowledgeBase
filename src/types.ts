export interface MCPTool {
  name: string;
  description: string;
  input_schema: any;
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
}

export interface IndexingResult {
  files_processed: number;
  files_skipped: number;
  files_failed: number;
  errors: string[];
}
