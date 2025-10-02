use anyhow::Result;
use chrono::Utc;
use crate::database::{Database, Document, IndexEntry};
use md5;
use regex::Regex;
use std::fs;
use std::path::Path;
use uuid::Uuid;
use walkdir::WalkDir;

pub struct CorpusManager {
    db: Database,
    exclusions: Vec<String>,
}

impl CorpusManager {
    pub fn new(db: Database, exclusions: Vec<String>) -> Self {
        Self { db, exclusions }
    }

    pub async fn index_folder(&self, folder_path: &Path) -> Result<IndexingResult> {
        let mut result = IndexingResult {
            files_processed: 0,
            files_skipped: 0,
            files_failed: 0,
            errors: Vec::new(),
        };

        for entry in WalkDir::new(folder_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            let path = entry.path();
            
            // Check exclusions
            if self.is_excluded(path) {
                result.files_skipped += 1;
                continue;
            }

            // Check if file type is supported
            if !self.is_supported_file_type(path) {
                result.files_skipped += 1;
                continue;
            }

            match self.index_file(path).await {
                Ok(_) => result.files_processed += 1,
                Err(e) => {
                    result.files_failed += 1;
                    result.errors.push(format!("Failed to index {}: {}", path.display(), e));
                }
            }
        }

        Ok(result)
    }

    async fn index_file(&self, path: &Path) -> Result<()> {
        let metadata = fs::metadata(path)?;
        let modified_at = metadata.modified()?.into();
        let size = metadata.len();

        // Read file content
        let content = fs::read_to_string(path)?;
        let content_hash = self.compute_hash(&content);

        // Check if file has changed
        if let Some(existing_doc) = self.db.get_document_by_path(&path.to_path_buf()).await? {
            if existing_doc.content_hash == content_hash {
                return Ok(()); // File hasn't changed
            }
        }

        // Extract metadata
        let (title, tags, headings) = self.extract_metadata(&content, path);
        let content_excerpt = self.create_excerpt(&content);

        // Create document
        let document = Document {
            id: Uuid::new_v4(),
            path: path.to_path_buf(),
            filename: path.file_name().unwrap().to_string_lossy().to_string(),
            extension: path.extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            size,
            modified_at,
            title,
            tags,
            headings,
            content_excerpt,
            content_hash,
            indexed_at: Utc::now(),
        };

        // Insert document
        self.db.insert_document(&document).await?;

        // Create index entries
        let index_entries = self.create_index_entries(&document, &content);
        self.db.insert_index_entries(&index_entries).await?;

        Ok(())
    }

    fn is_excluded(&self, path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        
        for exclusion in &self.exclusions {
            if exclusion.contains('*') {
                // Simple glob pattern matching
                let pattern = exclusion.replace('*', ".*");
                if let Ok(regex) = Regex::new(&format!("^{}$", pattern)) {
                    if regex.is_match(&path_str) {
                        return true;
                    }
                }
            } else if path_str.contains(exclusion) {
                return true;
            }
        }
        
        false
    }

    fn is_supported_file_type(&self, path: &Path) -> bool {
        if let Some(extension) = path.extension() {
            let ext = extension.to_string_lossy().to_lowercase();
            matches!(ext.as_str(), "md" | "txt" | "pdf")
        } else {
            false
        }
    }

    fn compute_hash(&self, content: &str) -> String {
        let digest = md5::compute(content.as_bytes());
        format!("{:x}", digest)
    }

    fn extract_metadata(&self, content: &str, path: &Path) -> (Option<String>, Vec<String>, Vec<String>) {
        let mut title = None;
        let mut tags = Vec::new();
        let mut headings = Vec::new();

        // Extract title from first H1 heading or filename
        if let Some(first_line) = content.lines().next() {
            if first_line.starts_with("# ") {
                title = Some(first_line[2..].trim().to_string());
            } else {
                title = path.file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string()
                    .into();
            }
        }

        // Extract frontmatter tags
        if content.starts_with("---\n") {
            if let Some(end_pos) = content.find("\n---\n") {
                let frontmatter = &content[4..end_pos];
                for line in frontmatter.lines() {
                    if line.starts_with("tags:") {
                        let tag_line = &line[5..].trim();
                        if tag_line.starts_with('[') && tag_line.ends_with(']') {
                            let tags_str = &tag_line[1..tag_line.len()-1];
                            tags = tags_str.split(',')
                                .map(|t| t.trim().trim_matches('"').to_string())
                                .collect();
                        }
                    }
                }
            }
        }

        // Extract headings
        for line in content.lines() {
            if line.starts_with("# ") {
                headings.push(line[2..].trim().to_string());
            } else if line.starts_with("## ") {
                headings.push(line[3..].trim().to_string());
            } else if line.starts_with("### ") {
                headings.push(line[4..].trim().to_string());
            }
        }

        (title, tags, headings)
    }

    fn create_excerpt(&self, content: &str) -> String {
        let max_length = 500;
        if content.len() <= max_length {
            content.to_string()
        } else {
            let mut excerpt = content.chars().take(max_length).collect::<String>();
            if let Some(last_space) = excerpt.rfind(' ') {
                excerpt.truncate(last_space);
            }
            excerpt.push_str("...");
            excerpt
        }
    }

    fn create_index_entries(&self, document: &Document, content: &str) -> Vec<IndexEntry> {
        let mut entries = Vec::new();
        let chunk_size = 1000;
        let overlap = 200;

        let mut start = 0;
        let mut chunk_id = 0;

        while start < content.len() {
            let end = std::cmp::min(start + chunk_size, content.len());
            
            // Ensure we don't split in the middle of a UTF-8 character
            let mut actual_end = end;
            while actual_end > start && !content.is_char_boundary(actual_end) {
                actual_end -= 1;
            }
            
            let chunk_text = content[start..actual_end].to_string();
            
            // Find word boundaries for better chunking
            let final_end = if actual_end < content.len() {
                if let Some(last_space) = chunk_text.rfind(' ') {
                    start + last_space
                } else {
                    actual_end
                }
            } else {
                actual_end
            };

            let chunk_text = content[start..final_end].to_string();
            
            // Find positions of important terms (simple word-based indexing)
            let positions = self.find_word_positions(&chunk_text);

            entries.push(IndexEntry {
                id: Uuid::new_v4(),
                document_id: document.id,
                chunk_id,
                chunk_text,
                positions,
            });

            start = if final_end < content.len() {
                final_end.saturating_sub(overlap)
            } else {
                break;
            };
            chunk_id += 1;
        }

        entries
    }

    fn find_word_positions(&self, text: &str) -> Vec<u32> {
        let mut positions = Vec::new();
        let words: Vec<&str> = text.split_whitespace().collect();
        
        for (i, word) in words.iter().enumerate() {
            if word.len() > 3 { // Only index words longer than 3 characters
                positions.push(i as u32);
            }
        }
        
        positions
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct IndexingResult {
    pub files_processed: u32,
    pub files_skipped: u32,
    pub files_failed: u32,
    pub errors: Vec<String>,
}
