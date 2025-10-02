use anyhow::Result;
use tracing::{info, Level};
use tracing_subscriber;

mod config;
mod corpus;
mod database;
mod mcp;
mod ollama;
mod search;
mod server;

use config::Config;
use server::start_server;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    info!("Starting Knowledge Base Backend");

    // Load configuration
    let config = Config::load()?;
    info!("Configuration loaded: {:?}", config);

    // Initialize database
    let db = database::Database::new(&config.database_url).await?;
    db.migrate().await?;
    info!("Database initialized and migrated");

    // Start the web server
    start_server(config, db).await?;

    Ok(())
}
