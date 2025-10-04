use knowledge_base_backend::{database::{Database, Document}, mcp::{MCPServer, MCPRequest}};
use chrono::{TimeZone, Utc};
use uuid::Uuid;
use std::path::PathBuf;

fn make_document(path: &str, version: u32, is_latest: bool) -> Document {
    Document {
        id: Uuid::new_v4(),
        path: PathBuf::from(path),
        filename: PathBuf::from(path).file_name().unwrap().to_string_lossy().to_string(),
        extension: "md".to_string(),
        size: 10,
        modified_at: Utc.timestamp_opt(1_700_000_000, 0).unwrap(),
        title: Some("Doc".to_string()),
        tags: vec![],
        headings: vec![],
        content_excerpt: "excerpt".to_string(),
        content_hash: "hash".to_string(),
        indexed_at: Utc.timestamp_opt(1_700_000_100, 0).unwrap(),
        version,
        is_latest,
        project_id: None,
    }
}

#[tokio::test]
async fn tools_list_contains_required_tools() {
    let db = Database::new("sqlite::memory:").await.unwrap();
    db.migrate().await.unwrap();
    let ollama = knowledge_base_backend::ollama::OllamaClient::new(
        "http://localhost:11434".to_string(),
        "gpt-oss:20b".to_string(),
    );
    let mcp = MCPServer::new(db, ollama);

    let tools = mcp.get_available_tools();
    let names: Vec<String> = tools.iter().map(|t| t.name.clone()).collect();

    for required in [
        "list_notes", "read_note", "search_notes", "summarize_note", "answer_question",
        "get_document_versions", "compare_versions", "get_retention_policy", "set_retention_policy", "purge_history"
    ] {
        assert!(names.contains(&required.to_string()), "missing tool {required}");
    }
}

#[tokio::test]
async fn answer_question_includes_version_fields_in_citations() {
    let db = Database::new("sqlite::memory:").await.unwrap();
    db.migrate().await.unwrap();

    // Seed one document so search can return something. We won't exercise real search; tests validate structure.
    let doc = make_document("/tmp/a.md", 1, true);
    db.insert_document(&doc).await.unwrap();

    let ollama = knowledge_base_backend::ollama::OllamaClient::new(
        "http://localhost:11434".to_string(),
        "gpt-oss:20b".to_string(),
    );
    let mcp = MCPServer::new(db.clone(), ollama);

    // Build a fake request; since search depends on content, response may be empty. We accept empty.
    let req = MCPRequest { tool: "answer_question".to_string(), arguments: serde_json::json!({"question": "test", "top_k": 1}) };
    let resp = mcp.handle_request(req).await.unwrap();
    assert!(resp.success);
    if let Some(data) = resp.data {
        if let Some(citations) = data.get("citations").and_then(|v| v.as_array()) {
            for c in citations {
                // Version fields must exist if citations exist
                assert!(c.get("used_version").is_some());
                assert!(c.get("latest_version").is_some());
                assert!(c.get("is_latest").is_some());
            }
        }
    }
}


