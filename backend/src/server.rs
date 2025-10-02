use anyhow::Result;
use config::Config;
use database::Database;
use mcp::MCPServer;
use ollama::OllamaClient;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::path::PathBuf;
use warp::Filter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexRequest {
    pub folders: Vec<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexResponse {
    pub success: bool,
    pub message: String,
    pub result: Option<corpus::IndexingResult>,
}

pub async fn start_server(config: Config, db: Database) -> Result<()> {
    // Initialize Ollama client
    let ollama_client = OllamaClient::new(config.ollama_url.clone(), config.ollama_model.clone());
    
    // Check Ollama health
    if !ollama_client.health_check().await? {
        tracing::warn!("Ollama is not available at {}", config.ollama_url);
    }

    // Initialize MCP server
    let mcp_server = MCPServer::new(db.clone(), ollama_client);

    // CORS configuration
    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE"]);

    // API routes
    let api_routes = warp::path("api")
        .and(
            // MCP tools endpoint
            warp::path("tools")
                .and(warp::get())
                .map({
                    let mcp_server = mcp_server.clone();
                    move || {
                        let tools = mcp_server.get_available_tools();
                        warp::reply::json(&tools)
                    }
                })
                .or(
                    // MCP request handler
                    warp::path("request")
                        .and(warp::post())
                        .and(warp::body::json())
                        .and_then({
                            let mcp_server = mcp_server.clone();
                            move |request: mcp::MCPRequest| {
                                let mcp_server = mcp_server.clone();
                                async move {
                                    match mcp_server.handle_request(request).await {
                                        Ok(response) => Ok::<_, Infallible>(warp::reply::json(&response)),
                                        Err(e) => Ok(warp::reply::json(&mcp::MCPResponse {
                                            success: false,
                                            data: None,
                                            error: Some(e.to_string()),
                                        })),
                                    }
                                }
                            }
                        })
                )
        )
        .or(
            // Index management endpoints
            warp::path("index")
                .and(
                    warp::post()
                        .and(warp::body::json())
                        .and_then({
                            let db = db.clone();
                            move |request: IndexRequest| {
                                let db = db.clone();
                                async move {
                                    match index_folders(db, request.folders).await {
                                        Ok(result) => Ok::<_, Infallible>(warp::reply::json(&IndexResponse {
                                            success: true,
                                            message: "Indexing completed".to_string(),
                                            result: Some(result),
                                        })),
                                        Err(e) => Ok(warp::reply::json(&IndexResponse {
                                            success: false,
                                            message: e.to_string(),
                                            result: None,
                                        })),
                                    }
                                }
                            }
                        })
                )
        )
        .or(
            // Health check
            warp::path("health")
                .and(warp::get())
                .map(|| warp::reply::json(&serde_json::json!({
                    "status": "healthy",
                    "timestamp": chrono::Utc::now()
                })))
        );

    // Serve static files (React app)
    let static_files = warp::path("static")
        .and(warp::fs::dir("./frontend/build"));

    // Serve React app for all other routes
    let react_app = warp::fs::file("./frontend/build/index.html");

    let routes = api_routes
        .or(static_files)
        .or(react_app)
        .with(cors);

    let port = config.server_port;
    println!("Starting server on http://localhost:{}", port);
    
    warp::serve(routes)
        .run(([0, 0, 0, 0], port))
        .await;

    Ok(())
}

async fn index_folders(db: Database, folders: Vec<PathBuf>) -> Result<corpus::IndexingResult> {
    let mut total_result = corpus::IndexingResult {
        files_processed: 0,
        files_skipped: 0,
        files_failed: 0,
        errors: Vec::new(),
    };

    let exclusions = vec![
        "node_modules".to_string(),
        ".git".to_string(),
        ".DS_Store".to_string(),
        "*.tmp".to_string(),
        "*.log".to_string(),
    ];

    let corpus_manager = corpus::CorpusManager::new(db, exclusions);

    for folder in folders {
        if !folder.exists() {
            total_result.errors.push(format!("Folder does not exist: {}", folder.display()));
            continue;
        }

        match corpus_manager.index_folder(&folder).await {
            Ok(result) => {
                total_result.files_processed += result.files_processed;
                total_result.files_skipped += result.files_skipped;
                total_result.files_failed += result.files_failed;
                total_result.errors.extend(result.errors);
            }
            Err(e) => {
                total_result.errors.push(format!("Failed to index folder {}: {}", folder.display(), e));
            }
        }
    }

    Ok(total_result)
}
