use anyhow::Result;
use crate::config::Config;
use crate::database::Database;
use crate::mcp::MCPServer;
use crate::ollama::OllamaClient;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::path::PathBuf;
use uuid::Uuid;
use warp::{Filter, Rejection};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexRequest {
    pub folders: Vec<PathBuf>,
    pub project_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexResponse {
    pub success: bool,
    pub message: String,
    pub result: Option<crate::corpus::IndexingResult>,
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
                            move |request: crate::mcp::MCPRequest| {
                                let mcp_server = mcp_server.clone();
                                async move {
                                    match mcp_server.handle_request(request).await {
                                        Ok(response) => Ok::<_, Infallible>(warp::reply::json(&response)),
                                        Err(e) => Ok(warp::reply::json(&crate::mcp::MCPResponse {
                                            success: false,
                                            data: None,
                                            error: Some(e.to_string()),
                                        })),
                                    }
                                }
                            }
                        })
                )
                .or({
                    // Index management endpoints
                    let index_post = warp::path("index")
                        .and(warp::post())
                        .and(warp::body::json())
                        .and_then({
                            let db = db.clone();
                            move |request: IndexRequest| {
                                let db = db.clone();
                                async move {
                                    match index_folders(db, request.folders, request.project_id).await {
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
                        });

                    let index_list = warp::path!("index" / "folders")
                        .and(warp::get())
                        .and_then({
                            let db = db.clone();
                            move || {
                                let db = db.clone();
                                async move {
                                    let folders = db.list_indexed_folders().await;
                                    match folders {
                                        Ok(list) => Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                            "success": true,
                                            "folders": list
                                        }))),
                                        Err(e) => Ok(warp::reply::json(&serde_json::json!({
                                            "success": false,
                                            "error": e.to_string()
                                        }))),
                                    }
                                }
                            }
                        });

                    let index_remove = warp::path!("index" / "folders")
                        .and(warp::delete())
                        .and(warp::query::<std::collections::HashMap<String, String>>())
                        .and_then({
                            let db = db.clone();
                            move |params: std::collections::HashMap<String, String>| {
                                let db = db.clone();
                                async move {
                                    if let Some(path) = params.get("path") {
                                        // purge docs and remove folder record
                                        match db.purge_folder_documents(path).await {
                                            Ok(count) => {
                                                tracing::info!("Purged {} documents from folder: {}", count, path);
                                                match db.remove_indexed_folder(path).await {
                                                    Ok(_) => {
                                                        tracing::info!("Removed folder from index: {}", path);
                                                        Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                            "success": true,
                                                            "message": format!("Removed folder and purged {} documents", count)
                                                        })))
                                                    }
                                                    Err(e) => {
                                                        tracing::error!("Failed to remove folder from index: {}", e);
                                                        Ok(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": format!("Failed to remove folder from index: {}", e)
                                                        })))
                                                    }
                                                }
                                            }
                                            Err(e) => {
                                                tracing::error!("Failed to purge documents from folder: {}", e);
                                                Ok(warp::reply::json(&serde_json::json!({
                                                    "success": false,
                                                    "error": format!("Failed to purge documents: {}", e)
                                                })))
                                            }
                                        }
                                    } else {
                                        Ok(warp::reply::json(&serde_json::json!({"success": false, "error": "missing path"})))
                                    }
                                }
                            }
                        });

                    let index_update_project = warp::path!("index" / "folders")
                        .and(warp::put())
                        .and(warp::query::<std::collections::HashMap<String, String>>())
                        .and(warp::body::json())
                        .and_then({
                            let db = db.clone();
                            move |params: std::collections::HashMap<String, String>, request: serde_json::Value| {
                                let db = db.clone();
                                async move {
                                    let path = match params.get("path") {
                                        Some(p) => p,
                                        None => {
                                            return Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                "success": false,
                                                "error": "Missing path parameter"
                                            })));
                                        }
                                    };
                                    
                                    let project_id = request.get("project_id")
                                        .and_then(|v| v.as_str())
                                        .and_then(|s| Uuid::parse_str(s).ok());
                                    
                                    match db.update_folder_project(path, project_id.as_ref()).await {
                                        Ok(true) => Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                            "success": true,
                                            "message": "Folder project updated successfully"
                                        }))),
                                        Ok(false) => Ok(warp::reply::json(&serde_json::json!({
                                            "success": false,
                                            "error": "Folder not found"
                                        }))),
                                        Err(e) => Ok(warp::reply::json(&serde_json::json!({
                                            "success": false,
                                            "error": e.to_string()
                                        }))),
                                    }
                                }
                            }
                        });

                    index_post.or(index_list).or(index_remove).or(index_update_project)
                })
                .or(
                    // Project management endpoints
                    warp::path("projects")
                        .and(
                            // GET /api/projects - List all projects
                            warp::get()
                                .and_then({
                                    let db = db.clone();
                                    move || {
                                        let db = db.clone();
                                        async move {
                                            match db.list_projects().await {
                                                Ok(projects) => Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                    "success": true,
                                                    "projects": projects
                                                }))),
                                                Err(e) => Ok(warp::reply::json(&serde_json::json!({
                                                    "success": false,
                                                    "error": e.to_string()
                                                }))),
                                            }
                                        }
                                    }
                                })
                                .or(
                                    // POST /api/projects - Create new project
                                    warp::post()
                                        .and(warp::body::json())
                                        .and_then({
                                            let db = db.clone();
                                            move |request: serde_json::Value| {
                                                let db = db.clone();
                                                async move {
                                                    let name = match request.get("name")
                                                        .and_then(|v| v.as_str()) {
                                                        Some(name) => name,
                                                        None => {
                                                            return Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                                "success": false,
                                                                "error": "Missing required field: name"
                                                            })));
                                                        }
                                                    };
                                                    let description = request.get("description")
                                                        .and_then(|v| v.as_str());
                                                    
                                                    match db.create_project(name, description).await {
                                                        Ok(project) => Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                            "success": true,
                                                            "project": project
                                                        }))),
                                                        Err(e) => Ok(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": e.to_string()
                                                        }))),
                                                    }
                                                }
                                            }
                                        })
                                )
                                .or(
                                    // PUT /api/projects/{id} - Update project
                                    warp::put()
                                        .and(warp::path::param::<String>())
                                        .and(warp::body::json())
                                        .and_then({
                                            let db = db.clone();
                                            move |id_str: String, request: serde_json::Value| {
                                                let db = db.clone();
                                                async move {
                                                    let id = match Uuid::parse_str(&id_str) {
                                                        Ok(id) => id,
                                                        Err(e) => {
                                                            return Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                                "success": false,
                                                                "error": format!("Invalid project ID: {}", e)
                                                            })));
                                                        }
                                                    };
                                                    
                                                    let name = request.get("name").and_then(|v| v.as_str());
                                                    let description = request.get("description").and_then(|v| v.as_str());
                                                    
                                                    match db.update_project(&id, name, description).await {
                                                        Ok(Some(project)) => Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                            "success": true,
                                                            "project": project
                                                        }))),
                                                        Ok(None) => Ok(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": "Project not found"
                                                        }))),
                                                        Err(e) => Ok(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": e.to_string()
                                                        }))),
                                                    }
                                                }
                                            }
                                        })
                                )
                                .or(
                                    // DELETE /api/projects/{id} - Delete project
                                    warp::delete()
                                        .and(warp::path::param::<String>())
                                        .and_then({
                                            let db = db.clone();
                                            move |id_str: String| {
                                                let db = db.clone();
                                                async move {
                                                    let id = match Uuid::parse_str(&id_str) {
                                                        Ok(id) => id,
                                                        Err(e) => {
                                                            return Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                                "success": false,
                                                                "error": format!("Invalid project ID: {}", e)
                                                            })));
                                                        }
                                                    };
                                                    
                                                    match db.delete_project(&id).await {
                                                        Ok(true) => Ok::<_, Infallible>(warp::reply::json(&serde_json::json!({
                                                            "success": true,
                                                            "message": "Project deleted successfully"
                                                        }))),
                                                        Ok(false) => Ok(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": "Cannot delete project with associated documents or folders"
                                                        }))),
                                                        Err(e) => Ok(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": e.to_string()
                                                        }))),
                                                    }
                                                }
                                            }
                                        })
                                )
                        )
                )
                .or(
                    // Exclusion patterns management endpoints
                    warp::path("exclusion-patterns")
                        .and(
                            // GET /api/exclusion-patterns - List all exclusion patterns
                            warp::get()
                                .and_then({
                                    let db = db.clone();
                                    move || {
                                        let db = db.clone();
                                        async move {
                                            match db.get_exclusion_patterns().await {
                                                Ok(patterns) => Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                    "success": true,
                                                    "patterns": patterns
                                                }))),
                                                Err(e) => Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                    "success": false,
                                                    "error": e.to_string()
                                                }))),
                                            }
                                        }
                                    }
                                })
                                .or(
                                    // POST /api/exclusion-patterns - Add new exclusion pattern
                                    warp::post()
                                        .and(warp::body::json())
                                        .and_then({
                                            let db = db.clone();
                                            move |body: serde_json::Value| {
                                                let db = db.clone();
                                                async move {
                                                    let pattern = match body.get("pattern").and_then(|v| v.as_str()) {
                                                        Some(p) => p,
                                                        None => return Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": "Pattern is required"
                                                        }))),
                                                    };
                                                    
                                                    let description = body.get("description").and_then(|v| v.as_str());
                                                    
                                                    match db.add_exclusion_pattern(pattern, description).await {
                                                        Ok(new_pattern) => Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                            "success": true,
                                                            "pattern": new_pattern
                                                        }))),
                                                        Err(e) => Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": e.to_string()
                                                        }))),
                                                    }
                                                }
                                            }
                                        })
                                )
                                .or(
                                    // PUT /api/exclusion-patterns/{id} - Update exclusion pattern
                                    warp::put()
                                        .and(warp::path::param::<String>())
                                        .and(warp::body::json())
                                        .and_then({
                                            let db = db.clone();
                                            move |id: String, body: serde_json::Value| {
                                                let db = db.clone();
                                                async move {
                                                    let pattern = match body.get("pattern").and_then(|v| v.as_str()) {
                                                        Some(p) => p,
                                                        None => return Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": "Pattern is required"
                                                        }))),
                                                    };
                                                    
                                                    let description = body.get("description").and_then(|v| v.as_str());
                                                    
                                                    match db.update_exclusion_pattern(&id, pattern, description).await {
                                                        Ok(updated_pattern) => Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                            "success": true,
                                                            "pattern": updated_pattern
                                                        }))),
                                                        Err(e) => Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": e.to_string()
                                                        }))),
                                                    }
                                                }
                                            }
                                        })
                                )
                                .or(
                                    // DELETE /api/exclusion-patterns/{id} - Remove exclusion pattern
                                    warp::delete()
                                        .and(warp::path::param::<String>())
                                        .and_then({
                                            let db = db.clone();
                                            move |id: String| {
                                                let db = db.clone();
                                                async move {
                                                    match db.remove_exclusion_pattern(&id).await {
                                                        Ok(_) => Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                            "success": true,
                                                            "message": "Exclusion pattern removed successfully"
                                                        }))),
                                                        Err(e) => Ok::<warp::reply::Json, Rejection>(warp::reply::json(&serde_json::json!({
                                                            "success": false,
                                                            "error": e.to_string()
                                                        }))),
                                                    }
                                                }
                                            }
                                        })
                                )
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
                )
        );

    // Serve static files from build directory
    let static_files = warp::path("assets")
        .and(warp::fs::dir("../build/assets"))
        .or(warp::path("static")
            .and(warp::fs::dir("../build/static")))
        .or(warp::path("manifest.json")
            .and(warp::fs::file("../build/manifest.json")))
        .or(warp::path("asset-manifest.json")
            .and(warp::fs::file("../build/asset-manifest.json")))
        .or(warp::path("favicon.ico")
            .and(warp::fs::file("../build/favicon.ico")))
        .or(warp::path("logo192.png")
            .and(warp::fs::file("../build/logo192.png")));

    // Serve React app for all other routes (fallback)
    let react_app = warp::any()
        .and(warp::path::full())
        .and_then(|path: warp::path::FullPath| async move {
            // Only serve index.html for non-API, non-static file requests
            if !path.as_str().starts_with("/api") && 
               !path.as_str().starts_with("/static") &&
               !path.as_str().starts_with("/assets") &&
               !path.as_str().contains(".") {
                Ok::<_, Infallible>(warp::reply::html(
                    std::fs::read_to_string("../build/index.html").unwrap_or_default()
                ))
            } else {
                Ok::<_, Infallible>(warp::reply::html("Not Found".to_string()))
            }
        });

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

async fn index_folders(db: Database, folders: Vec<PathBuf>, project_id: Option<Uuid>) -> Result<crate::corpus::IndexingResult> {
    let mut total_result = crate::corpus::IndexingResult {
        files_processed: 0,
        files_skipped: 0,
        files_failed: 0,
        errors: Vec::new(),
    };

    // Load exclusion patterns from database
    let mut exclusions = vec![
        "node_modules".to_string(),
        ".git".to_string(),
        ".DS_Store".to_string(),
        "*.tmp".to_string(),
        "*.log".to_string(),
    ];

    // Add custom exclusion patterns from database
    match db.get_exclusion_patterns().await {
        Ok(patterns) => {
            for pattern in patterns {
                exclusions.push(pattern.pattern);
            }
        }
        Err(e) => {
            tracing::warn!("Failed to load exclusion patterns from database: {}", e);
        }
    }

    let corpus_manager = crate::corpus::CorpusManager::new(db.clone(), exclusions);

    for raw in folders {
        // Normalize: trim and canonicalize if possible
        let path_str = raw.to_string_lossy().trim().to_string();
        let normalized = std::path::PathBuf::from(&path_str);
        let folder = match std::fs::canonicalize(&normalized) {
            Ok(abs) => abs,
            Err(_) => normalized.clone(),
        };

        if !folder.exists() {
            total_result.errors.push(format!("Folder does not exist: {}", path_str));
            continue;
        }

        match corpus_manager.index_folder(&folder, project_id.as_ref()).await {
            Ok(result) => {
                total_result.files_processed += result.files_processed;
                total_result.files_skipped += result.files_skipped;
                total_result.files_failed += result.files_failed;
                total_result.errors.extend(result.errors);
                // Upsert folder stats
                let file_count = result.files_processed + result.files_skipped + result.files_failed;
                let _ = db.upsert_indexed_folder(&folder.to_string_lossy(), project_id.as_ref(), file_count).await;
            }
            Err(e) => {
                total_result.errors.push(format!("Failed to index folder {}: {}", folder.display(), e));
            }
        }
    }

    Ok(total_result)
}
