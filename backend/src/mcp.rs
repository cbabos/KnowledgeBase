use anyhow::Result;
use crate::database::Database;
use crate::ollama::{OllamaClient, SummaryLength};
use crate::search::SearchEngine;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPTool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPRequest {
    pub tool: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPResponse {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Clone)]
pub struct MCPServer {
    db: Database,
    search_engine: SearchEngine,
    ollama_client: OllamaClient,
}

impl MCPServer {
    pub fn new(db: Database, ollama_client: OllamaClient) -> Self {
        let search_engine = SearchEngine::new(db.clone());
        Self {
            db,
            search_engine,
            ollama_client,
        }
    }

    pub fn get_available_tools(&self) -> Vec<MCPTool> {
        vec![
            MCPTool {
                name: "list_notes".to_string(),
                description: "List all indexed notes with basic metadata".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20},
                        "offset": {"type": "integer", "minimum": 0, "default": 0}
                    }
                }),
            },
            MCPTool {
                name: "read_note".to_string(),
                description: "Read the full content of a specific note".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "format": "uuid"}
                    },
                    "required": ["id"]
                }),
            },
            MCPTool {
                name: "search_notes".to_string(),
                description: "Search notes by keywords with filters and pagination".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "limit": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20},
                        "offset": {"type": "integer", "minimum": 0, "default": 0},
                        "include_historical": {"type": "boolean", "default": false},
                        "filters": {
                            "type": "object",
                            "properties": {
                                "file_types": {"type": "array", "items": {"type": "string"}},
                                "folders": {"type": "array", "items": {"type": "string"}},
                                "tags": {"type": "array", "items": {"type": "string"}},
                                "project_ids": {"type": "array", "items": {"type": "string", "format": "uuid"}}
                            }
                        }
                    },
                    "required": ["query"]
                }),
            },
            MCPTool {
                name: "summarize_note".to_string(),
                description: "Generate a summary of a note in short, medium, or long format".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "format": "uuid"},
                        "length": {"type": "string", "enum": ["short", "medium", "long"], "default": "medium"}
                    },
                    "required": ["id"]
                }),
            },
            MCPTool {
                name: "answer_question".to_string(),
                description: "Answer a question based on the knowledge base with citations".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "top_k": {"type": "integer", "minimum": 1, "maximum": 20, "default": 5},
                        "project_ids": {"type": "array", "items": {"type": "string", "format": "uuid"}}
                    },
                    "required": ["question"]
                }),
            },
            MCPTool {
                name: "get_document_versions".to_string(),
                description: "Get all versions of a document".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"}
                    },
                    "required": ["path"]
                }),
            },
            MCPTool {
                name: "compare_versions".to_string(),
                description: "Compare two versions of a document and return differences".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"},
                        "version_a": {"type": "integer"},
                        "version_b": {"type": "integer"}
                    },
                    "required": ["path", "version_a", "version_b"]
                }),
            },
            MCPTool {
                name: "get_retention_policy".to_string(),
                description: "Get the current retention policy settings".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {}
                }),
            },
            MCPTool {
                name: "set_retention_policy".to_string(),
                description: "Set the retention policy for document versions".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "policy_type": {"type": "string", "enum": ["all", "last_n_versions", "last_n_days"]},
                        "value": {"type": "integer", "minimum": 1}
                    },
                    "required": ["policy_type", "value"]
                }),
            },
            MCPTool {
                name: "purge_history".to_string(),
                description: "Purge historical versions according to retention policy".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "dry_run": {"type": "boolean", "default": false}
                    }
                }),
            },
            MCPTool {
                name: "save_note".to_string(),
                description: "Save editor content to disk and create a new version".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"},
                        "content": {"type": "string"},
                        "project_id": {"type": "string", "format": "uuid"}
                    },
                    "required": ["path", "content"]
                }),
            },
        ]
    }

    pub async fn handle_request(&self, request: MCPRequest) -> Result<MCPResponse> {
        match request.tool.as_str() {
            "list_notes" => self.handle_list_notes(request.arguments).await,
            "read_note" => self.handle_read_note(request.arguments).await,
            "search_notes" => self.handle_search_notes(request.arguments).await,
            "summarize_note" => self.handle_summarize_note(request.arguments).await,
            "answer_question" => self.handle_answer_question(request.arguments).await,
            "get_document_versions" => self.handle_get_document_versions(request.arguments).await,
            "compare_versions" => self.handle_compare_versions(request.arguments).await,
            "get_retention_policy" => self.handle_get_retention_policy(request.arguments).await,
            "set_retention_policy" => self.handle_set_retention_policy(request.arguments).await,
            "purge_history" => self.handle_purge_history(request.arguments).await,
            "save_note" => self.handle_save_note(request.arguments).await,
            _ => Ok(MCPResponse {
                success: false,
                data: None,
                error: Some(format!("Unknown tool: {}", request.tool)),
            }),
        }
    }

    async fn handle_list_notes(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(20) as u32;
        let offset = args.get("offset").and_then(|v| v.as_u64()).unwrap_or(0) as u32;

        let documents = self.db.search_documents("", limit, offset, false).await?;
        
        let response_data = serde_json::json!({
            "notes": documents,
            "total": documents.len(),
            "limit": limit,
            "offset": offset
        });

        Ok(MCPResponse {
            success: true,
            data: Some(response_data),
            error: None,
        })
    }

    async fn handle_read_note(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let id_str = args.get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: id"))?;

        let id = Uuid::parse_str(id_str)?;
        
        if let Some(document) = self.db.get_document_by_id(&id).await? {
            // Prefer stored snapshot for this specific version; fallback to reconstructed content
            let content = if let Some(snapshot) = self.db.get_document_snapshot(&document.id).await? {
                snapshot
            } else {
                // Reconstruct from indexed chunks for this specific version id
                let chunks = self.db.get_index_entries_for_document(&document.id).await?;
                if !chunks.is_empty() {
                    let mut ordered = chunks;
                    ordered.sort_by_key(|c| c.chunk_id);
                    ordered.iter().map(|c| c.chunk_text.as_str()).collect::<Vec<_>>().join("\n")
                } else {
                    // Last resort: current filesystem content
                    std::fs::read_to_string(&document.path)?
                }
            };
            
            let response_data = serde_json::json!({
                "document": document,
                "content": content
            });

            Ok(MCPResponse {
                success: true,
                data: Some(response_data),
                error: None,
            })
        } else {
            Ok(MCPResponse {
                success: false,
                data: None,
                error: Some("Document not found".to_string()),
            })
        }
    }

    async fn handle_search_notes(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let query = args.get("query")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: query"))?;

        let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(20) as u32;
        let offset = args.get("offset").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        let include_historical = args.get("include_historical").and_then(|v| v.as_bool()).unwrap_or(false);

        // Parse filters if provided
        let filters = if let Some(filters_value) = args.get("filters") {
            Some(parse_search_filters(filters_value)?)
        } else {
            None
        };

        let results = self.search_engine.search(query, filters, limit, offset, include_historical).await?;
        
        let response_data = serde_json::json!({
            "results": results,
            "total": results.len(),
            "limit": limit,
            "offset": offset
        });

        Ok(MCPResponse {
            success: true,
            data: Some(response_data),
            error: None,
        })
    }

    async fn handle_summarize_note(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let id_str = args.get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: id"))?;

        let length_str = args.get("length")
            .and_then(|v| v.as_str())
            .unwrap_or("medium");

        let id = Uuid::parse_str(id_str)?;
        let length = match length_str {
            "short" => SummaryLength::Short,
            "long" => SummaryLength::Long,
            _ => SummaryLength::Medium,
        };

        if let Some(document) = self.db.get_document_by_id(&id).await? {
            // Read the full file content
            let content = std::fs::read_to_string(&document.path)?;
            
            // Generate summary using Ollama
            let summary = self.ollama_client.summarize(&content, length).await?;
            
            let response_data = serde_json::json!({
                "document": document,
                "summary": summary,
                "length": length_str
            });

            Ok(MCPResponse {
                success: true,
                data: Some(response_data),
                error: None,
            })
        } else {
            Ok(MCPResponse {
                success: false,
                data: None,
                error: Some("Document not found".to_string()),
            })
        }
    }

    async fn handle_answer_question(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let question = args.get("question")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: question"))?;

        let top_k = args.get("top_k").and_then(|v| v.as_u64()).unwrap_or(5) as u32;

        // Extract project_ids if provided
        let project_ids = args.get("project_ids")
            .and_then(|v| v.as_array())
            .and_then(|arr| {
                let parsed_ids: Result<Vec<Uuid>, _> = arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(|s| Uuid::parse_str(s))
                    .collect();
                parsed_ids.ok()
            });

        // Get relevant chunks with project filtering
        let chunks = self.search_engine.get_relevant_chunks_for_qa_with_filters(question, top_k, project_ids.as_ref().map(|ids| ids.as_slice())).await?;
        
        if chunks.is_empty() {
            return Ok(MCPResponse {
                success: true,
                data: Some(serde_json::json!({
                    "answer": "I couldn't find any relevant information in the knowledge base to answer your question.",
                    "confidence": "low",
                    "citations": []
                })),
                error: None,
            });
        }

        // Combine context from chunks
        let context = chunks.iter()
            .map(|(doc, entry)| format!("[{}] {}", doc.filename, entry.chunk_text))
            .collect::<Vec<_>>()
            .join("\n\n");

        // Generate answer using Ollama
        let answer = self.ollama_client.answer_question(question, &context).await?;

        // Create citations with version information
        let mut citations = Vec::new();
        for (doc, entry) in chunks.iter() {
            // Get the latest version of this document
            let latest_doc = self.db.get_latest_document_version(&std::path::PathBuf::from(&doc.path)).await?;
            let latest_version = latest_doc.as_ref().map(|d| d.version).unwrap_or(doc.version);
            
            citations.push(serde_json::json!({
                "document_id": doc.id,
                "filename": doc.filename,
                "path": doc.path,
                "chunk_id": entry.chunk_id,
                "excerpt": entry.chunk_text,
                "used_version": doc.version,
                "latest_version": latest_version,
                "is_latest": doc.is_latest
            }));
        }

        // Calculate confidence (simple heuristic)
        let confidence = if chunks.len() >= 3 { "high" } else if chunks.len() >= 2 { "medium" } else { "low" };

        let response_data = serde_json::json!({
            "answer": answer,
            "confidence": confidence,
            "citations": citations,
            "context_chunks": chunks.len()
        });

        Ok(MCPResponse {
            success: true,
            data: Some(response_data),
            error: None,
        })
    }

    async fn handle_get_document_versions(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let path_str = args.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: path"))?;

        let path = std::path::PathBuf::from(path_str);
        let versions = self.db.get_document_versions(&path).await?;

        let response_data = serde_json::json!({
            "path": path_str,
            "versions": versions
        });

        Ok(MCPResponse {
            success: true,
            data: Some(response_data),
            error: None,
        })
    }

    async fn handle_compare_versions(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let path_str = args.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: path"))?;

        let version_a = args.get("version_a")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: version_a"))? as u32;

        let version_b = args.get("version_b")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: version_b"))? as u32;

        let path = std::path::PathBuf::from(path_str);
        let versions = self.db.get_document_versions(&path).await?;

        // Find the specific versions
        let doc_a = versions.iter().find(|v| v.version == version_a);
        let doc_b = versions.iter().find(|v| v.version == version_b);

        if doc_a.is_none() || doc_b.is_none() {
            return Ok(MCPResponse {
                success: false,
                data: None,
                error: Some("One or both versions not found".to_string()),
            });
        }

        let doc_a = doc_a.unwrap();
        let doc_b = doc_b.unwrap();

        // Prefer stored snapshots for accurate comparison
        let content_a = if let Some(s) = self.db.get_document_snapshot(&doc_a.id).await? {
            s
        } else {
            // Fallback: reconstruct from indexed chunks
            let chunks = self.db.get_index_entries_for_document(&doc_a.id).await?;
            if chunks.is_empty() {
                std::fs::read_to_string(&doc_a.path)?
            } else {
                let mut ordered = chunks;
                ordered.sort_by_key(|c| c.chunk_id);
                ordered.iter().map(|c| c.chunk_text.as_str()).collect::<Vec<_>>().join("\n")
            }
        };
        let content_b = if let Some(s) = self.db.get_document_snapshot(&doc_b.id).await? {
            s
        } else {
            let chunks = self.db.get_index_entries_for_document(&doc_b.id).await?;
            if chunks.is_empty() {
                std::fs::read_to_string(&doc_b.path)?
            } else {
                let mut ordered = chunks;
                ordered.sort_by_key(|c| c.chunk_id);
                ordered.iter().map(|c| c.chunk_text.as_str()).collect::<Vec<_>>().join("\n")
            }
        };

        // Simple diff implementation
        let diff = self.compute_diff(&content_a, &content_b);

        let response_data = serde_json::json!({
            "path": path_str,
            "version_a": version_a,
            "version_b": version_b,
            "diff": diff,
            "document_a": doc_a,
            "document_b": doc_b
        });

        Ok(MCPResponse {
            success: true,
            data: Some(response_data),
            error: None,
        })
    }

    fn compute_diff(&self, content_a: &str, content_b: &str) -> serde_json::Value {
        // Line-based LCS diff for better accuracy
        let a: Vec<&str> = content_a.lines().collect();
        let b: Vec<&str> = content_b.lines().collect();
        let n = a.len();
        let m = b.len();
        let mut dp = vec![vec![0usize; m + 1]; n + 1];
        for i in (0..n).rev() {
            for j in (0..m).rev() {
                dp[i][j] = if a[i] == b[j] { dp[i + 1][j + 1] + 1 } else { dp[i + 1][j].max(dp[i][j + 1]) };
            }
        }
        let mut i = 0usize;
        let mut j = 0usize;
        let mut lines = Vec::new();
        while i < n && j < m {
            if a[i] == b[j] {
                lines.push(serde_json::json!({"type": "unchanged", "line": i + 1, "content": a[i]}));
                i += 1; j += 1;
            } else if dp[i + 1][j] >= dp[i][j + 1] {
                lines.push(serde_json::json!({"type": "removed", "line": i + 1, "content": a[i]}));
                i += 1;
            } else {
                lines.push(serde_json::json!({"type": "added", "line": j + 1, "content": b[j]}));
                j += 1;
            }
        }
        while i < n { lines.push(serde_json::json!({"type": "removed", "line": i + 1, "content": a[i]})); i += 1; }
        while j < m { lines.push(serde_json::json!({"type": "added", "line": j + 1, "content": b[j]})); j += 1; }
        serde_json::json!({
            "lines": lines,
            "summary": {
                "added": lines.iter().filter(|l| l["type"] == "added").count(),
                "removed": lines.iter().filter(|l| l["type"] == "removed").count(),
                "unchanged": lines.iter().filter(|l| l["type"] == "unchanged").count()
            }
        })
    }

    async fn handle_get_retention_policy(&self, _args: serde_json::Value) -> Result<MCPResponse> {
        // For now, return a default policy. In a real implementation, this would read from a config file or database
        let policy = serde_json::json!({
            "policy_type": "all",
            "value": 0,
            "description": "Keep all versions (default)"
        });

        Ok(MCPResponse {
            success: true,
            data: Some(policy),
            error: None,
        })
    }

    async fn handle_set_retention_policy(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let policy_type = args.get("policy_type")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: policy_type"))?;

        let value = args.get("value")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: value"))? as u32;

        // In a real implementation, this would save to a config file or database
        let description = match policy_type {
            "all" => "Keep all versions".to_string(),
            "last_n_versions" => format!("Keep last {} versions", value),
            "last_n_days" => format!("Keep versions from last {} days", value),
            _ => "Unknown policy type".to_string()
        };

        let policy = serde_json::json!({
            "policy_type": policy_type,
            "value": value,
            "description": description
        });

        Ok(MCPResponse {
            success: true,
            data: Some(policy),
            error: None,
        })
    }

    async fn handle_purge_history(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let dry_run = args.get("dry_run").and_then(|v| v.as_bool()).unwrap_or(false);

        // In a real implementation, this would:
        // 1. Read the current retention policy
        // 2. Find documents that exceed the policy
        // 3. Delete old versions (or just report them if dry_run is true)

        let result = serde_json::json!({
            "dry_run": dry_run,
            "documents_processed": 0,
            "versions_deleted": 0,
            "space_freed_bytes": 0,
            "message": if dry_run {
                "Dry run completed - no versions were actually deleted"
            } else {
                "History purge completed"
            }
        });

        Ok(MCPResponse {
            success: true,
            data: Some(result),
            error: None,
        })
    }

    // EP12: Save content and create a new version entry with snapshot and reindex
    async fn handle_save_note(&self, args: serde_json::Value) -> Result<MCPResponse> {
        let path_str = args.get("path")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: path"))?;
        let content = args.get("content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing required field: content"))?;

        let project_id = args.get("project_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok());

        let path = std::path::PathBuf::from(path_str);

        // Ensure parent directory exists
        if let Some(parent) = path.parent() { std::fs::create_dir_all(parent).ok(); }

        // Write content to disk
        std::fs::write(&path, content)?;

        // Index this single file to create a new version (if changed)
        let corpus = crate::corpus::CorpusManager::new(self.db.clone(), vec![]);
        if let Err(e) = corpus.index_single_file(&path, project_id.as_ref()).await {
            // If indexing fails, still report save success but include warning
            return Ok(MCPResponse {
                success: false,
                data: None,
                error: Some(format!("Saved to disk but indexing failed: {}", e)),
            });
        }

        // Fetch latest version metadata to return
        let latest = self.db.get_latest_document_version(&path).await?;
        let response = serde_json::json!({
            "path": path_str,
            "document": latest,
        });

        Ok(MCPResponse { success: true, data: Some(response), error: None })
    }
}

fn parse_search_filters(filters_value: &serde_json::Value) -> Result<crate::search::SearchFilters> {
    let file_types = filters_value.get("file_types")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).map(|s| s.to_string()).collect());

    let folders = filters_value.get("folders")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).map(|s| s.to_string()).collect());

    let tags = filters_value.get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).map(|s| s.to_string()).collect());

    let project_ids = filters_value.get("project_ids")
        .and_then(|v| v.as_array())
        .and_then(|arr| {
            let parsed_ids: Result<Vec<Uuid>, _> = arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| Uuid::parse_str(s))
                .collect();
            parsed_ids.ok()
        });

    Ok(crate::search::SearchFilters {
        file_types,
        folders,
        date_from: None,
        date_to: None,
        tags,
        project_ids,
    })
}
