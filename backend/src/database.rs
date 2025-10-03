use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub path: PathBuf,
    pub filename: String,
    pub extension: String,
    pub size: u64,
    pub modified_at: DateTime<Utc>,
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub headings: Vec<String>,
    pub content_excerpt: String,
    pub content_hash: String,
    pub indexed_at: DateTime<Utc>,
    pub version: u32,
    pub is_latest: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexEntry {
    pub id: Uuid,
    pub document_id: Uuid,
    pub chunk_id: u32,
    pub chunk_text: String,
    pub positions: Vec<u32>,
}

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = SqlitePool::connect(database_url).await?;
        Ok(Self { pool })
    }

    pub async fn migrate(&self) -> Result<()> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                filename TEXT NOT NULL,
                extension TEXT NOT NULL,
                size INTEGER NOT NULL,
                modified_at TEXT NOT NULL,
                title TEXT,
                tags TEXT,
                headings TEXT,
                content_excerpt TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                indexed_at TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                is_latest BOOLEAN NOT NULL DEFAULT 1
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS index_entries (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_id INTEGER NOT NULL,
                chunk_text TEXT NOT NULL,
                positions TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for better performance
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_documents_path ON documents (path)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents (content_hash)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_index_entries_document_id ON index_entries (document_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_documents_version ON documents (version)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_documents_is_latest ON documents (is_latest)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_documents_path_version ON documents (path, version)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn insert_document(&self, document: &Document) -> Result<()> {
        let tags_json = serde_json::to_string(&document.tags)?;
        let headings_json = serde_json::to_string(&document.headings)?;

        sqlx::query(
            r#"
            INSERT INTO documents 
            (id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(document.id.to_string())
        .bind(document.path.to_string_lossy())
        .bind(&document.filename)
        .bind(&document.extension)
        .bind(document.size as i64)
        .bind(document.modified_at.to_rfc3339())
        .bind(&document.title)
        .bind(tags_json)
        .bind(headings_json)
        .bind(&document.content_excerpt)
        .bind(&document.content_hash)
        .bind(document.indexed_at.to_rfc3339())
        .bind(document.version as i64)
        .bind(document.is_latest)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn insert_index_entries(&self, entries: &[IndexEntry]) -> Result<()> {
        for entry in entries {
            let positions_json = serde_json::to_string(&entry.positions)?;

            sqlx::query(
                r#"
                INSERT OR REPLACE INTO index_entries 
                (id, document_id, chunk_id, chunk_text, positions)
                VALUES (?, ?, ?, ?, ?)
                "#,
            )
            .bind(entry.id.to_string())
            .bind(entry.document_id.to_string())
            .bind(entry.chunk_id as i64)
            .bind(&entry.chunk_text)
            .bind(positions_json)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn search_documents(
        &self,
        query: &str,
        limit: u32,
        offset: u32,
        include_historical: bool,
    ) -> Result<Vec<Document>> {
        let where_clause = if include_historical {
            "d.filename LIKE ? OR d.content_excerpt LIKE ? OR d.title LIKE ? OR ie.chunk_text LIKE ?"
        } else {
            "d.is_latest = 1 AND (d.filename LIKE ? OR d.content_excerpt LIKE ? OR d.title LIKE ? OR ie.chunk_text LIKE ?)"
        };

        let documents = sqlx::query(&format!(
            r#"
            SELECT DISTINCT d.id, d.path, d.filename, d.extension, d.size, d.modified_at, d.title, d.tags, d.headings, d.content_excerpt, d.content_hash, d.indexed_at, d.version, d.is_latest
            FROM documents d
            LEFT JOIN index_entries ie ON d.id = ie.document_id
            WHERE {}
            ORDER BY d.modified_at DESC
            LIMIT ? OFFSET ?
            "#,
            where_clause
        ))
        .bind(format!("%{}%", query))
        .bind(format!("%{}%", query))
        .bind(format!("%{}%", query))
        .bind(format!("%{}%", query))
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        let mut results = Vec::new();
        for row in documents {
            let tags: String = row.get("tags");
            let headings: String = row.get("headings");
            
            results.push(Document {
                id: Uuid::parse_str(&row.get::<String, _>("id"))?,
                path: PathBuf::from(row.get::<String, _>("path")),
                filename: row.get("filename"),
                extension: row.get("extension"),
                size: row.get::<i64, _>("size") as u64,
                modified_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("modified_at"))?.into(),
                title: row.get("title"),
                tags: serde_json::from_str(&tags).unwrap_or_default(),
                headings: serde_json::from_str(&headings).unwrap_or_default(),
                content_excerpt: row.get("content_excerpt"),
                content_hash: row.get("content_hash"),
                indexed_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("indexed_at"))?.into(),
                version: row.get::<i64, _>("version") as u32,
                is_latest: row.get::<i64, _>("is_latest") != 0,
            });
        }

        Ok(results)
    }

    pub async fn get_document_by_id(&self, id: &Uuid) -> Result<Option<Document>> {
        let row = sqlx::query(
            r#"
            SELECT id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest
            FROM documents
            WHERE id = ?
            "#,
        )
        .bind(id.to_string())
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let tags: String = row.get("tags");
            let headings: String = row.get("headings");
            
            Ok(Some(Document {
                id: Uuid::parse_str(&row.get::<String, _>("id"))?,
                path: PathBuf::from(row.get::<String, _>("path")),
                filename: row.get("filename"),
                extension: row.get("extension"),
                size: row.get::<i64, _>("size") as u64,
                modified_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("modified_at"))?.into(),
                title: row.get("title"),
                tags: serde_json::from_str(&tags).unwrap_or_default(),
                headings: serde_json::from_str(&headings).unwrap_or_default(),
                content_excerpt: row.get("content_excerpt"),
                content_hash: row.get("content_hash"),
                indexed_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("indexed_at"))?.into(),
                version: row.get::<i64, _>("version") as u32,
                is_latest: row.get::<i64, _>("is_latest") != 0,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_document_by_path(&self, path: &PathBuf) -> Result<Option<Document>> {
        let row = sqlx::query(
            r#"
            SELECT id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest
            FROM documents
            WHERE path = ?
            "#,
        )
        .bind(path.to_string_lossy())
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let tags: String = row.get("tags");
            let headings: String = row.get("headings");
            
            Ok(Some(Document {
                id: Uuid::parse_str(&row.get::<String, _>("id"))?,
                path: PathBuf::from(row.get::<String, _>("path")),
                filename: row.get("filename"),
                extension: row.get("extension"),
                size: row.get::<i64, _>("size") as u64,
                modified_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("modified_at"))?.into(),
                title: row.get("title"),
                tags: serde_json::from_str(&tags).unwrap_or_default(),
                headings: serde_json::from_str(&headings).unwrap_or_default(),
                content_excerpt: row.get("content_excerpt"),
                content_hash: row.get("content_hash"),
                indexed_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("indexed_at"))?.into(),
                version: row.get::<i64, _>("version") as u32,
                is_latest: row.get::<i64, _>("is_latest") != 0,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_index_entries_for_document(&self, document_id: &Uuid) -> Result<Vec<IndexEntry>> {
        let rows = sqlx::query(
            r#"
            SELECT id, document_id, chunk_id, chunk_text, positions
            FROM index_entries
            WHERE document_id = ?
            ORDER BY chunk_id
            "#,
        )
        .bind(document_id.to_string())
        .fetch_all(&self.pool)
        .await?;

        let mut results = Vec::new();
        for row in rows {
            let positions: String = row.get("positions");
            
            results.push(IndexEntry {
                id: Uuid::parse_str(&row.get::<String, _>("id"))?,
                document_id: Uuid::parse_str(&row.get::<String, _>("document_id"))?,
                chunk_id: row.get::<i64, _>("chunk_id") as u32,
                chunk_text: row.get("chunk_text"),
                positions: serde_json::from_str(&positions).unwrap_or_default(),
            });
        }

        Ok(results)
    }

    pub async fn delete_document(&self, id: &Uuid) -> Result<()> {
        // Delete index entries first
        sqlx::query("DELETE FROM index_entries WHERE document_id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;

        // Delete document
        sqlx::query("DELETE FROM documents WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn get_document_versions(&self, path: &PathBuf) -> Result<Vec<Document>> {
        let rows = sqlx::query(
            r#"
            SELECT id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest
            FROM documents
            WHERE path = ?
            ORDER BY version DESC
            "#,
        )
        .bind(path.to_string_lossy())
        .fetch_all(&self.pool)
        .await?;

        let mut results = Vec::new();
        for row in rows {
            let tags: String = row.get("tags");
            let headings: String = row.get("headings");
            
            results.push(Document {
                id: Uuid::parse_str(&row.get::<String, _>("id"))?,
                path: PathBuf::from(row.get::<String, _>("path")),
                filename: row.get("filename"),
                extension: row.get("extension"),
                size: row.get::<i64, _>("size") as u64,
                modified_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("modified_at"))?.into(),
                title: row.get("title"),
                tags: serde_json::from_str(&tags).unwrap_or_default(),
                headings: serde_json::from_str(&headings).unwrap_or_default(),
                content_excerpt: row.get("content_excerpt"),
                content_hash: row.get("content_hash"),
                indexed_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("indexed_at"))?.into(),
                version: row.get::<i64, _>("version") as u32,
                is_latest: row.get::<i64, _>("is_latest") != 0,
            });
        }

        Ok(results)
    }

    pub async fn get_latest_document_version(&self, path: &PathBuf) -> Result<Option<Document>> {
        let row = sqlx::query(
            r#"
            SELECT id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest
            FROM documents
            WHERE path = ? AND is_latest = 1
            "#,
        )
        .bind(path.to_string_lossy())
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let tags: String = row.get("tags");
            let headings: String = row.get("headings");
            
            Ok(Some(Document {
                id: Uuid::parse_str(&row.get::<String, _>("id"))?,
                path: PathBuf::from(row.get::<String, _>("path")),
                filename: row.get("filename"),
                extension: row.get("extension"),
                size: row.get::<i64, _>("size") as u64,
                modified_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("modified_at"))?.into(),
                title: row.get("title"),
                tags: serde_json::from_str(&tags).unwrap_or_default(),
                headings: serde_json::from_str(&headings).unwrap_or_default(),
                content_excerpt: row.get("content_excerpt"),
                content_hash: row.get("content_hash"),
                indexed_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("indexed_at"))?.into(),
                version: row.get::<i64, _>("version") as u32,
                is_latest: row.get::<i64, _>("is_latest") != 0,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn mark_previous_versions_not_latest(&self, path: &PathBuf) -> Result<()> {
        sqlx::query("UPDATE documents SET is_latest = 0 WHERE path = ?")
            .bind(path.to_string_lossy())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn get_next_version_number(&self, path: &PathBuf) -> Result<u32> {
        let row = sqlx::query(
            "SELECT MAX(version) as max_version FROM documents WHERE path = ?"
        )
        .bind(path.to_string_lossy())
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let max_version: Option<i64> = row.get("max_version");
            Ok((max_version.unwrap_or(0) + 1) as u32)
        } else {
            Ok(1)
        }
    }
}
