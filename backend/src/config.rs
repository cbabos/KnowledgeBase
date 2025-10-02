use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub server_port: u16,
    pub ollama_url: String,
    pub ollama_model: String,
    pub corpus_folders: Vec<PathBuf>,
    pub exclusions: Vec<String>,
    pub local_first: bool,
    pub logging_enabled: bool,
    pub log_retention_days: u32,
}

impl Default for Config {
    fn default() -> Self {
        // Use a more reliable database path
        let db_path = Self::default_database_path().unwrap_or_else(|_| "./knowledge_base.db".to_string());
        Self {
            database_url: format!("sqlite:{}", db_path),
            server_port: 8080,
            ollama_url: "http://localhost:11434".to_string(),
            ollama_model: "gpt-oss:20b".to_string(),
            corpus_folders: Vec::new(),
            exclusions: vec![
                "node_modules".to_string(),
                ".git".to_string(),
                ".DS_Store".to_string(),
                "*.tmp".to_string(),
                "*.log".to_string(),
            ],
            local_first: true,
            logging_enabled: false,
            log_retention_days: 7,
        }
    }
}

impl Config {
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;
        
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)?;
            let config: Config = toml::from_str(&content)?;
            Ok(config)
        } else {
            let config = Config::default();
            config.save()?;
            Ok(config)
        }
    }

    pub fn save(&self) -> Result<()> {
        let config_path = Self::config_path()?;
        let content = toml::to_string_pretty(self)?;
        std::fs::write(&config_path, content)?;
        Ok(())
    }

    fn config_path() -> Result<PathBuf> {
        let mut path = dirs::config_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?;
        path.push("knowledge-base");
        std::fs::create_dir_all(&path)?;
        path.push("config.toml");
        Ok(path)
    }

    fn default_database_path() -> Result<String> {
        let mut path = dirs::data_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not find data directory"))?;
        path.push("knowledge-base");
        std::fs::create_dir_all(&path)?;
        path.push("knowledge_base.db");
        Ok(path.to_string_lossy().to_string())
    }
}
