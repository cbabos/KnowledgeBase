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
                        "filters": {
                            "type": "object",
                            "properties": {
                                "file_types": {"type": "array", "items": {"type": "string"}},
                                "folders": {"type": "array", "items": {"type": "string"}},
                                "tags": {"type": "array", "items": {"type": "string"}}
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
                        "top_k": {"type": "integer", "minimum": 1, "maximum": 20, "default": 5}
                    },
                    "required": ["question"]
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

        let documents = self.db.search_documents("", limit, offset).await?;
        
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
            // Read the full file content
            let content = std::fs::read_to_string(&document.path)?;
            
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

        // Parse filters if provided
        let filters = if let Some(filters_value) = args.get("filters") {
            Some(parse_search_filters(filters_value)?)
        } else {
            None
        };

        let results = self.search_engine.search(query, filters, limit, offset).await?;
        
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

        // Get relevant chunks
        let chunks = self.search_engine.get_relevant_chunks_for_qa(question, top_k).await?;
        
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

        // Create citations
        let citations = chunks.iter()
            .map(|(doc, entry)| serde_json::json!({
                "document_id": doc.id,
                "filename": doc.filename,
                "path": doc.path,
                "chunk_id": entry.chunk_id,
                "excerpt": entry.chunk_text
            }))
            .collect::<Vec<_>>();

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

    Ok(crate::search::SearchFilters {
        file_types,
        folders,
        date_from: None,
        date_to: None,
        tags,
    })
}
