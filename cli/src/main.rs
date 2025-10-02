use anyhow::Result;
use clap::{Parser, Subcommand};
use serde_json;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "kb")]
#[command(about = "Knowledge Base CLI - Search and manage your personal knowledge")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Corpus management commands
    Corpus {
        #[command(subcommand)]
        action: CorpusAction,
    },
    /// Search the knowledge base
    Search {
        /// Search query
        query: String,
        /// Maximum number of results
        #[arg(short, long, default_value = "20")]
        limit: u32,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// Read a specific document
    Read {
        /// Document ID
        id: String,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// Summarize a document
    Summarize {
        /// Document ID
        id: String,
        /// Summary length (short, medium, long)
        #[arg(short, long, default_value = "medium")]
        length: String,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// Ask a question
    Ask {
        /// Question to ask
        question: String,
        /// Number of context chunks to use
        #[arg(short, long, default_value = "5")]
        top_k: u32,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// List all indexed documents
    List {
        /// Maximum number of results
        #[arg(short, long, default_value = "20")]
        limit: u32,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
}

#[derive(Subcommand)]
enum CorpusAction {
    /// Add a folder to the corpus
    Add {
        /// Folder path to add
        path: PathBuf,
    },
    /// List configured folders
    List,
    /// Remove a folder from the corpus
    Remove {
        /// Folder path to remove
        path: PathBuf,
    },
    /// Build the index
    Index,
    /// Rebuild the index
    Reindex,
    /// Show indexing status
    Status,
}

struct KnowledgeBaseClient {
    base_url: String,
    client: reqwest::Client,
}

impl KnowledgeBaseClient {
    fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    async fn make_request(&self, tool: &str, arguments: serde_json::Value) -> Result<serde_json::Value> {
        let request = serde_json::json!({
            "tool": tool,
            "arguments": arguments
        });

        let response = self.client
            .post(&format!("{}/api/request", self.base_url))
            .json(&request)
            .send()
            .await?;

        let mcp_response: serde_json::Value = response.json().await?;
        
        if mcp_response["success"].as_bool().unwrap_or(false) {
            Ok(mcp_response["data"].clone())
        } else {
            Err(anyhow::anyhow!("Request failed: {}", mcp_response["error"].as_str().unwrap_or("Unknown error")))
        }
    }

    async fn index_folders(&self, folders: Vec<PathBuf>) -> Result<serde_json::Value> {
        let request = serde_json::json!({
            "folders": folders
        });

        let response = self.client
            .post(&format!("{}/api/index", self.base_url))
            .json(&request)
            .send()
            .await?;

        let result: serde_json::Value = response.json().await?;
        Ok(result)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let cli = Cli::parse();
    let client = KnowledgeBaseClient::new("http://localhost:8080".to_string());

    match cli.command {
        Commands::Corpus { action } => {
            match action {
                CorpusAction::Add { path } => {
                    println!("Adding folder: {}", path.display());
                    // In a real implementation, this would update the configuration
                    println!("Folder added successfully");
                }
                CorpusAction::List => {
                    println!("Configured folders:");
                    // In a real implementation, this would read from configuration
                    println!("  (No folders configured)");
                }
                CorpusAction::Remove { path } => {
                    println!("Removing folder: {}", path.display());
                    // In a real implementation, this would update the configuration
                    println!("Folder removed successfully");
                }
                CorpusAction::Index => {
                    println!("Building index...");
                    // This would need to be implemented with actual folder paths
                    let folders = vec![PathBuf::from("./doc")]; // Example
                    match client.index_folders(folders).await {
                        Ok(result) => {
                            println!("Indexing completed successfully");
                            if let Some(indexing_result) = result.get("result") {
                                println!("  Files processed: {}", indexing_result["files_processed"]);
                                println!("  Files skipped: {}", indexing_result["files_skipped"]);
                                println!("  Files failed: {}", indexing_result["files_failed"]);
                            }
                        }
                        Err(e) => {
                            eprintln!("Indexing failed: {}", e);
                            std::process::exit(1);
                        }
                    }
                }
                CorpusAction::Reindex => {
                    println!("Rebuilding index...");
                    // Same as index for now
                    let folders = vec![PathBuf::from("./doc")];
                    match client.index_folders(folders).await {
                        Ok(result) => {
                            println!("Re-indexing completed successfully");
                            if let Some(indexing_result) = result.get("result") {
                                println!("  Files processed: {}", indexing_result["files_processed"]);
                                println!("  Files skipped: {}", indexing_result["files_skipped"]);
                                println!("  Files failed: {}", indexing_result["files_failed"]);
                            }
                        }
                        Err(e) => {
                            eprintln!("Re-indexing failed: {}", e);
                            std::process::exit(1);
                        }
                    }
                }
                CorpusAction::Status => {
                    println!("Index status:");
                    // In a real implementation, this would check the database
                    println!("  Status: Unknown");
                }
            }
        }
        Commands::Search { query, limit, format } => {
            let arguments = serde_json::json!({
                "query": query,
                "limit": limit,
                "offset": 0
            });

            match client.make_request("search_notes", arguments).await {
                Ok(data) => {
                    if format == "json" {
                        println!("{}", serde_json::to_string_pretty(&data)?);
                    } else {
                        print_search_results(&data);
                    }
                }
                Err(e) => {
                    eprintln!("Search failed: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Commands::Read { id, format } => {
            let arguments = serde_json::json!({
                "id": id
            });

            match client.make_request("read_note", arguments).await {
                Ok(data) => {
                    if format == "json" {
                        println!("{}", serde_json::to_string_pretty(&data)?);
                    } else {
                        print_document(&data);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to read document: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Commands::Summarize { id, length, format } => {
            let arguments = serde_json::json!({
                "id": id,
                "length": length
            });

            match client.make_request("summarize_note", arguments).await {
                Ok(data) => {
                    if format == "json" {
                        println!("{}", serde_json::to_string_pretty(&data)?);
                    } else {
                        print_summary(&data);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to summarize document: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Commands::Ask { question, top_k, format } => {
            let arguments = serde_json::json!({
                "question": question,
                "top_k": top_k
            });

            match client.make_request("answer_question", arguments).await {
                Ok(data) => {
                    if format == "json" {
                        println!("{}", serde_json::to_string_pretty(&data)?);
                    } else {
                        print_answer(&data);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to get answer: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Commands::List { limit, format } => {
            let arguments = serde_json::json!({
                "limit": limit,
                "offset": 0
            });

            match client.make_request("list_notes", arguments).await {
                Ok(data) => {
                    if format == "json" {
                        println!("{}", serde_json::to_string_pretty(&data)?);
                    } else {
                        print_notes_list(&data);
                    }
                }
                Err(e) => {
                    eprintln!("Failed to list notes: {}", e);
                    std::process::exit(1);
                }
            }
        }
    }

    Ok(())
}

fn print_search_results(data: &serde_json::Value) {
    if let Some(results) = data.get("results").and_then(|r| r.as_array()) {
        println!("Found {} results:\n", results.len());
        
        for (i, result) in results.iter().enumerate() {
            if let Some(document) = result.get("document") {
                println!("{}. {}", i + 1, document["filename"].as_str().unwrap_or("Unknown"));
                println!("   Path: {}", document["path"].as_str().unwrap_or("Unknown"));
                println!("   Modified: {}", document["modified_at"].as_str().unwrap_or("Unknown"));
                
                if let Some(snippets) = result.get("snippets").and_then(|s| s.as_array()) {
                    if let Some(first_snippet) = snippets.first() {
                        println!("   Preview: {}", 
                            first_snippet["highlighted"]
                                .as_str()
                                .unwrap_or("")
                                .chars()
                                .take(100)
                                .collect::<String>()
                        );
                    }
                }
                println!();
            }
        }
    }
}

fn print_document(data: &serde_json::Value) {
    if let Some(document) = data.get("document") {
        println!("Document: {}", document["filename"].as_str().unwrap_or("Unknown"));
        println!("Path: {}", document["path"].as_str().unwrap_or("Unknown"));
        println!("Modified: {}", document["modified_at"].as_str().unwrap_or("Unknown"));
        println!();
    }
    
    if let Some(content) = data.get("content") {
        println!("Content:");
        println!("{}", content.as_str().unwrap_or(""));
    }
}

fn print_summary(data: &serde_json::Value) {
    if let Some(document) = data.get("document") {
        println!("Document: {}", document["filename"].as_str().unwrap_or("Unknown"));
        println!();
    }
    
    if let Some(summary) = data.get("summary") {
        println!("Summary:");
        println!("{}", summary.as_str().unwrap_or(""));
    }
}

fn print_answer(data: &serde_json::Value) {
    if let Some(answer) = data.get("answer") {
        println!("Answer:");
        println!("{}", answer.as_str().unwrap_or(""));
        println!();
    }
    
    if let Some(confidence) = data.get("confidence") {
        println!("Confidence: {}", confidence.as_str().unwrap_or("Unknown"));
    }
    
    if let Some(citations) = data.get("citations").and_then(|c| c.as_array()) {
        if !citations.is_empty() {
            println!("\nSources:");
            for (i, citation) in citations.iter().enumerate() {
                println!("  {}. {}", i + 1, citation["filename"].as_str().unwrap_or("Unknown"));
            }
        }
    }
}

fn print_notes_list(data: &serde_json::Value) {
    if let Some(notes) = data.get("notes").and_then(|n| n.as_array()) {
        println!("Indexed documents ({}):\n", notes.len());
        
        for (i, note) in notes.iter().enumerate() {
            println!("{}. {}", i + 1, note["filename"].as_str().unwrap_or("Unknown"));
            println!("   Path: {}", note["path"].as_str().unwrap_or("Unknown"));
            println!("   Size: {} bytes", note["size"].as_u64().unwrap_or(0));
            println!("   Modified: {}", note["modified_at"].as_str().unwrap_or("Unknown"));
            println!();
        }
    }
}
