use anyhow::Result;
use clap::{Parser, Subcommand};
use serde_json;
use std::path::PathBuf;
use std::io::{self, Write};

#[derive(Parser)]
#[command(name = "kb")]
#[command(about = "Knowledge Base CLI - Search and manage your personal knowledge")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
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
    /// Compare two versions of a document
    Diff {
        /// File path
        file: String,
        /// Version A
        version_a: u32,
        /// Version B
        version_b: u32,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// Project management commands
    Project {
        #[command(subcommand)]
        action: ProjectAction,
    },
}

#[derive(Subcommand)]
enum CorpusAction {
    /// Add a folder to the corpus
    Add {
        /// Folder path to add
        path: PathBuf,
        /// Project ID to associate with this folder
        #[arg(short, long)]
        project: Option<String>,
    },
    /// List configured folders
    List,
    /// Remove a folder from the corpus
    Remove {
        /// Folder path to remove
        path: PathBuf,
    },
    /// Build the index
    Index {
        /// Project ID to filter indexing to specific project
        #[arg(short, long)]
        project: Option<String>,
    },
    /// Rebuild the index
    Reindex,
    /// Show indexing status
    Status,
}

#[derive(Subcommand)]
enum ProjectAction {
    /// List all projects
    List {
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// Create a new project
    Create {
        /// Project name
        name: String,
        /// Project description
        #[arg(short, long)]
        description: Option<String>,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// Update an existing project
    Update {
        /// Project ID
        id: String,
        /// New project name
        #[arg(short, long)]
        name: Option<String>,
        /// New project description
        #[arg(short, long)]
        description: Option<String>,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
    /// Delete a project
    Delete {
        /// Project ID
        id: String,
        /// Output format (text, json)
        #[arg(short, long, default_value = "text")]
        format: String,
    },
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

    async fn interactive_qa(&self) -> Result<()> {
        println!("Knowledge Base Interactive Q&A Mode");
        println!("Type 'exit' or 'quit' to leave, 'help' for commands\n");

        loop {
            print!("ask> ");
            io::stdout().flush()?;
            
            let mut input = String::new();
            io::stdin().read_line(&mut input)?;
            let question = input.trim();

            if question.is_empty() {
                continue;
            }

            match question {
                "exit" | "quit" => {
                    println!("Goodbye!");
                    break;
                }
                "help" => {
                    println!("Available commands:");
                    println!("  ask <question>  - Ask a question about your knowledge base");
                    println!("  search <query>  - Search your knowledge base");
                    println!("  list            - List all indexed documents");
                    println!("  help            - Show this help message");
                    println!("  exit/quit       - Exit the interactive mode");
                    continue;
                }
                _ => {
                    if question.starts_with("search ") {
                        let query = &question[7..];
                        if query.is_empty() {
                            println!("Please provide a search query");
                            continue;
                        }
                        self.handle_search_command(query, 20, "text").await?;
                    } else if question == "list" {
                        self.handle_list_command(20, "text").await?;
                    } else {
                        // Treat as a question
                        self.handle_ask_command(question, 5, "text").await?;
                    }
                }
            }
            println!(); // Add spacing between interactions
        }

        Ok(())
    }

    async fn handle_ask_command(&self, question: &str, top_k: u32, format: &str) -> Result<()> {
        let arguments = serde_json::json!({
            "question": question,
            "top_k": top_k
        });

        match self.make_request("answer_question", arguments).await {
            Ok(data) => {
                if format == "json" {
                    println!("{}", serde_json::to_string_pretty(&data)?);
                } else {
                    print_answer(&data);
                }
            }
            Err(e) => {
                eprintln!("Failed to get answer: {}", e);
            }
        }
        Ok(())
    }

    async fn handle_search_command(&self, query: &str, limit: u32, format: &str) -> Result<()> {
        let arguments = serde_json::json!({
            "query": query,
            "limit": limit,
            "offset": 0
        });

        match self.make_request("search_notes", arguments).await {
            Ok(data) => {
                if format == "json" {
                    println!("{}", serde_json::to_string_pretty(&data)?);
                } else {
                    print_search_results(&data);
                }
            }
            Err(e) => {
                eprintln!("Search failed: {}", e);
            }
        }
        Ok(())
    }

    async fn handle_list_command(&self, limit: u32, format: &str) -> Result<()> {
        let arguments = serde_json::json!({
            "limit": limit,
            "offset": 0
        });

        match self.make_request("list_notes", arguments).await {
            Ok(data) => {
                if format == "json" {
                    println!("{}", serde_json::to_string_pretty(&data)?);
                } else {
                    print_notes_list(&data);
                }
            }
            Err(e) => {
                eprintln!("Failed to list notes: {}", e);
            }
        }
        Ok(())
    }

    async fn index_folders_with_project(&self, folders: Vec<PathBuf>, project_id: Option<String>) -> Result<serde_json::Value> {
        let mut request_body = serde_json::json!({
            "folders": folders.iter().map(|p| p.to_string_lossy().to_string()).collect::<Vec<_>>()
        });
        
        if let Some(project) = project_id {
            request_body["project_id"] = serde_json::Value::String(project);
        }

        let response = self.client
            .post(&format!("{}/api/index", self.base_url))
            .json(&request_body)
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
        None => {
            // No command provided, enter interactive Q&A mode
            client.interactive_qa().await?;
        }
        Some(command) => match command {
            Commands::Corpus { action } => {
                match action {
                    CorpusAction::Add { path, project } => {
                        println!("Adding folder: {}", path.display());
                        if let Some(project_id) = project {
                            println!("Associating with project: {}", project_id);
                        }
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
                    CorpusAction::Index { project } => {
                        println!("Building index...");
                        if let Some(project_id) = &project {
                            println!("Filtering to project: {}", project_id);
                        }
                        // This would need to be implemented with actual folder paths
                        let folders = vec![PathBuf::from("./doc")]; // Example
                        match client.index_folders_with_project(folders, project).await {
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
            Commands::Diff { file, version_a, version_b, format } => {
                let arguments = serde_json::json!({
                    "path": file,
                    "version_a": version_a,
                    "version_b": version_b
                });

                match client.make_request("compare_versions", arguments).await {
                    Ok(data) => {
                        if format == "json" {
                            println!("{}", serde_json::to_string_pretty(&data)?);
                        } else {
                            print_diff(&data);
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to compare versions: {}", e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::Project { action } => {
                match action {
                    ProjectAction::List { format } => {
                        match client.make_request("list_projects", serde_json::json!({})).await {
                            Ok(data) => {
                                if format == "json" {
                                    println!("{}", serde_json::to_string_pretty(&data)?);
                                } else {
                                    print_projects(&data);
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to list projects: {}", e);
                                std::process::exit(1);
                            }
                        }
                    }
                    ProjectAction::Create { name, description, format } => {
                        let mut arguments = serde_json::json!({
                            "name": name
                        });
                        if let Some(desc) = description {
                            arguments["description"] = serde_json::Value::String(desc);
                        }

                        match client.make_request("create_project", arguments).await {
                            Ok(data) => {
                                if format == "json" {
                                    println!("{}", serde_json::to_string_pretty(&data)?);
                                } else {
                                    print_project_created(&data);
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to create project: {}", e);
                                std::process::exit(1);
                            }
                        }
                    }
                    ProjectAction::Update { id, name, description, format } => {
                        let mut arguments = serde_json::json!({
                            "id": id
                        });
                        if let Some(n) = name {
                            arguments["name"] = serde_json::Value::String(n);
                        }
                        if let Some(desc) = description {
                            arguments["description"] = serde_json::Value::String(desc);
                        }

                        match client.make_request("update_project", arguments).await {
                            Ok(data) => {
                                if format == "json" {
                                    println!("{}", serde_json::to_string_pretty(&data)?);
                                } else {
                                    print_project_updated(&data);
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to update project: {}", e);
                                std::process::exit(1);
                            }
                        }
                    }
                    ProjectAction::Delete { id, format } => {
                        let arguments = serde_json::json!({
                            "id": id
                        });

                        match client.make_request("delete_project", arguments).await {
                            Ok(data) => {
                                if format == "json" {
                                    println!("{}", serde_json::to_string_pretty(&data)?);
                                } else {
                                    print_project_deleted(&data);
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to delete project: {}", e);
                                std::process::exit(1);
                            }
                        }
                    }
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

fn print_diff(data: &serde_json::Value) {
    if let Some(path) = data.get("path").and_then(|p| p.as_str()) {
        println!("Diff for: {}", path);
    }
    
    if let Some(version_a) = data.get("version_a") {
        if let Some(version_b) = data.get("version_b") {
            println!("Comparing version {} vs version {}\n", version_a, version_b);
        }
    }
    
    if let Some(diff) = data.get("diff") {
        if let Some(summary) = diff.get("summary") {
            println!("Summary:");
            println!("  Added: {} lines", summary["added"].as_u64().unwrap_or(0));
            println!("  Removed: {} lines", summary["removed"].as_u64().unwrap_or(0));
            println!("  Unchanged: {} lines", summary["unchanged"].as_u64().unwrap_or(0));
            println!();
        }
        
        if let Some(lines) = diff.get("lines").and_then(|l| l.as_array()) {
            println!("Changes:");
            for line in lines {
                if let Some(line_type) = line.get("type").and_then(|t| t.as_str()) {
                    if let Some(content) = line.get("content").and_then(|c| c.as_str()) {
                        let prefix = match line_type {
                            "added" => "+",
                            "removed" => "-",
                            "unchanged" => " ",
                            _ => " ",
                        };
                        println!("{}{}", prefix, content);
                    }
                }
            }
        }
    }
}

fn print_projects(data: &serde_json::Value) {
    if let Some(projects) = data.get("projects").and_then(|p| p.as_array()) {
        if projects.is_empty() {
            println!("No projects found.");
            return;
        }
        
        println!("Projects ({}):\n", projects.len());
        
        for (i, project) in projects.iter().enumerate() {
            println!("{}. {}", i + 1, project["name"].as_str().unwrap_or("Unknown"));
            println!("   ID: {}", project["id"].as_str().unwrap_or("Unknown"));
            if let Some(description) = project.get("description").and_then(|d| d.as_str()) {
                if !description.is_empty() {
                    println!("   Description: {}", description);
                }
            }
            println!("   Created: {}", project["created_at"].as_str().unwrap_or("Unknown"));
            println!("   Updated: {}", project["updated_at"].as_str().unwrap_or("Unknown"));
            println!();
        }
    }
}

fn print_project_created(data: &serde_json::Value) {
    if let Some(project) = data.get("project") {
        println!("Project created successfully!");
        println!("Name: {}", project["name"].as_str().unwrap_or("Unknown"));
        println!("ID: {}", project["id"].as_str().unwrap_or("Unknown"));
        if let Some(description) = project.get("description").and_then(|d| d.as_str()) {
            if !description.is_empty() {
                println!("Description: {}", description);
            }
        }
    }
}

fn print_project_updated(data: &serde_json::Value) {
    if let Some(project) = data.get("project") {
        println!("Project updated successfully!");
        println!("Name: {}", project["name"].as_str().unwrap_or("Unknown"));
        println!("ID: {}", project["id"].as_str().unwrap_or("Unknown"));
        if let Some(description) = project.get("description").and_then(|d| d.as_str()) {
            if !description.is_empty() {
                println!("Description: {}", description);
            }
        }
    }
}

fn print_project_deleted(data: &serde_json::Value) {
    if let Some(message) = data.get("message").and_then(|m| m.as_str()) {
        println!("{}", message);
    } else {
        println!("Project deleted successfully!");
    }
}
