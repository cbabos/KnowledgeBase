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
    pub project_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexEntry {
    pub id: Uuid,
    pub document_id: Uuid,
    pub chunk_id: u32,
    pub chunk_text: String,
    pub positions: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExclusionPattern {
    pub id: String,
    pub pattern: String,
    pub description: Option<String>,
    pub is_glob: bool,
    pub created_at: String,
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

        // Optional content snapshots to enable accurate version diffs
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS document_snapshots (
                document_id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Track indexed folders
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS indexed_folders (
                path TEXT PRIMARY KEY,
                file_count INTEGER NOT NULL DEFAULT 0,
                last_indexed TEXT
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

        // Create projects table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Add project_id column to documents table if it doesn't exist
        sqlx::query("ALTER TABLE documents ADD COLUMN project_id TEXT")
            .execute(&self.pool)
            .await
            .ok(); // Ignore error if column already exists

        // Add project_id column to indexed_folders table if it doesn't exist
        sqlx::query("ALTER TABLE indexed_folders ADD COLUMN project_id TEXT")
            .execute(&self.pool)
            .await
            .ok(); // Ignore error if column already exists

        // Create indexes for project_id columns
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents (project_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_indexed_folders_project_id ON indexed_folders (project_id)")
            .execute(&self.pool)
            .await?;

        // Create exclusion patterns table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS exclusion_patterns (
                id TEXT PRIMARY KEY,
                pattern TEXT NOT NULL UNIQUE,
                description TEXT,
                is_glob BOOLEAN NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create index for exclusion patterns
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_exclusion_patterns_pattern ON exclusion_patterns (pattern)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn insert_document_snapshot(&self, document_id: &Uuid, content: &str) -> Result<()> {
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO document_snapshots (document_id, content)
            VALUES (?, ?)
            "#,
        )
        .bind(document_id.to_string())
        .bind(content)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_document_snapshot(&self, document_id: &Uuid) -> Result<Option<String>> {
        let row = sqlx::query("SELECT content FROM document_snapshots WHERE document_id = ?")
            .bind(document_id.to_string())
            .fetch_optional(&self.pool)
            .await?;
        if let Some(row) = row {
            let content: String = row.get("content");
            Ok(Some(content))
        } else {
            Ok(None)
        }
    }

    // Indexed folders CRUD
    pub async fn upsert_indexed_folder(&self, path: &str, project_id: Option<&Uuid>, file_count: u32) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO indexed_folders (path, project_id, file_count, last_indexed)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
              project_id = excluded.project_id,
              file_count = excluded.file_count,
              last_indexed = excluded.last_indexed
            "#,
        )
        .bind(path)
        .bind(project_id.map(|id| id.to_string()))
        .bind(file_count as i64)
        .bind(Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_indexed_folders(&self) -> Result<Vec<serde_json::Value>> {
        let rows = sqlx::query("SELECT path, file_count, last_indexed, project_id FROM indexed_folders ORDER BY path")
            .fetch_all(&self.pool)
            .await?;
        let mut out = Vec::new();
        for row in rows {
            let path: String = row.get("path");
            let file_count: i64 = row.get("file_count");
            let last_indexed: Option<String> = row.get("last_indexed");
            let project_id: Option<String> = row.get("project_id");
            out.push(serde_json::json!({
                "path": path,
                "file_count": file_count as u32,
                "last_indexed": last_indexed,
                "project_id": project_id
            }));
        }
        Ok(out)
    }

    pub async fn remove_indexed_folder(&self, path: &str) -> Result<()> {
        sqlx::query("DELETE FROM indexed_folders WHERE path = ?")
            .bind(path)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_folder_project(&self, path: &str, project_id: Option<&Uuid>) -> Result<bool> {
        // First, update the folder's project_id
        let folder_result = sqlx::query(
            r#"
            UPDATE indexed_folders 
            SET project_id = ?
            WHERE path = ?
            "#,
        )
        .bind(project_id.map(|id| id.to_string()))
        .bind(path)
        .execute(&self.pool)
        .await?;

        if folder_result.rows_affected() == 0 {
            return Ok(false); // Folder not found
        }

        // Then, update ALL document versions (current and historical) in this folder
        let like_pattern = format!("{}%", path);
        let _doc_result = sqlx::query(
            r#"
            UPDATE documents 
            SET project_id = ?
            WHERE path LIKE ?
            "#,
        )
        .bind(project_id.map(|id| id.to_string()))
        .bind(like_pattern)
        .execute(&self.pool)
        .await?;

        Ok(true)
    }

    // Project management methods
    pub async fn list_projects(&self) -> Result<Vec<serde_json::Value>> {
        let rows = sqlx::query("SELECT id, name, description, created_at, updated_at FROM projects ORDER BY name")
            .fetch_all(&self.pool)
            .await?;
        let mut out = Vec::new();
        for row in rows {
            out.push(serde_json::json!({
                "id": row.get::<String, _>("id"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "created_at": row.get::<String, _>("created_at"),
                "updated_at": row.get::<String, _>("updated_at")
            }));
        }
        Ok(out)
    }

    pub async fn create_project(&self, name: &str, description: Option<&str>) -> Result<serde_json::Value> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO projects (id, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(id.to_string())
        .bind(name)
        .bind(description)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(serde_json::json!({
            "id": id.to_string(),
            "name": name,
            "description": description,
            "created_at": now.to_rfc3339(),
            "updated_at": now.to_rfc3339()
        }))
    }

    pub async fn update_project(&self, id: &Uuid, name: Option<&str>, description: Option<&str>) -> Result<Option<serde_json::Value>> {
        let now = Utc::now();
        
        // Update name if provided
        if let Some(name) = name {
            sqlx::query("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?")
                .bind(name)
                .bind(now.to_rfc3339())
                .bind(id.to_string())
                .execute(&self.pool)
                .await?;
        }

        // Update description if provided
        if let Some(description) = description {
            sqlx::query("UPDATE projects SET description = ?, updated_at = ? WHERE id = ?")
                .bind(description)
                .bind(now.to_rfc3339())
                .bind(id.to_string())
                .execute(&self.pool)
                .await?;
        }

        // Get updated project
        let row = sqlx::query("SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(serde_json::json!({
                "id": row.get::<String, _>("id"),
                "name": row.get::<String, _>("name"),
                "description": row.get::<Option<String>, _>("description"),
                "created_at": row.get::<String, _>("created_at"),
                "updated_at": row.get::<String, _>("updated_at")
            })))
        } else {
            Ok(None)
        }
    }

    pub async fn delete_project(&self, id: &Uuid) -> Result<bool> {
        // Check if project has associated documents or folders
        let doc_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM documents WHERE project_id = ?")
            .bind(id.to_string())
            .fetch_one(&self.pool)
            .await?;

        let folder_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM indexed_folders WHERE project_id = ?")
            .bind(id.to_string())
            .fetch_one(&self.pool)
            .await?;

        if doc_count > 0 || folder_count > 0 {
            return Ok(false); // Cannot delete project with associated data
        }

        let result = sqlx::query("DELETE FROM projects WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // Folder purge: delete documents under a folder and their index entries
    pub async fn purge_folder_documents(&self, folder_path: &str) -> Result<u64> {
        // Find document ids under folder
        let like_pattern = format!("{}%", folder_path);
        let rows = sqlx::query("SELECT id FROM documents WHERE path LIKE ?")
            .bind(like_pattern)
            .fetch_all(&self.pool)
            .await?;
        let mut count = 0u64;
        for row in rows {
            let id_str: String = row.get("id");
            // Delete index entries
            sqlx::query("DELETE FROM index_entries WHERE document_id = ?")
                .bind(&id_str)
                .execute(&self.pool)
                .await?;
            // Delete document snapshots
            sqlx::query("DELETE FROM document_snapshots WHERE document_id = ?")
                .bind(&id_str)
                .execute(&self.pool)
                .await?;
            // Delete document
            let res = sqlx::query("DELETE FROM documents WHERE id = ?")
                .bind(&id_str)
                .execute(&self.pool)
                .await?;
            count += res.rows_affected();
        }
        Ok(count)
    }

    pub async fn insert_document(&self, document: &Document) -> Result<()> {
        let tags_json = serde_json::to_string(&document.tags)?;
        let headings_json = serde_json::to_string(&document.headings)?;

        sqlx::query(
            r#"
            INSERT INTO documents 
            (id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest, project_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        .bind(document.project_id.map(|id| id.to_string()))
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
        self.search_documents_with_filters(query, limit, offset, include_historical, None).await
    }

    pub async fn search_documents_with_filters(
        &self,
        query: &str,
        limit: u32,
        offset: u32,
        include_historical: bool,
        project_ids: Option<&[Uuid]>,
    ) -> Result<Vec<Document>> {
        let base_where_clause = if include_historical {
            "d.filename LIKE ? OR d.content_excerpt LIKE ? OR d.title LIKE ? OR ie.chunk_text LIKE ?"
        } else {
            "d.is_latest = 1 AND (d.filename LIKE ? OR d.content_excerpt LIKE ? OR d.title LIKE ? OR ie.chunk_text LIKE ?)"
        };

        // Add project filtering if specified
        let final_where_clause = if let Some(project_ids) = project_ids {
            if !project_ids.is_empty() {
                format!("({}) AND d.project_id IN ({})", 
                    base_where_clause, 
                    project_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",")
                )
            } else {
                base_where_clause.to_string()
            }
        } else {
            base_where_clause.to_string()
        };

        let query_str = format!(
            r#"
            SELECT DISTINCT d.id, d.path, d.filename, d.extension, d.size, d.modified_at, d.title, d.tags, d.headings, d.content_excerpt, d.content_hash, d.indexed_at, d.version, d.is_latest, d.project_id
            FROM documents d
            LEFT JOIN index_entries ie ON d.id = ie.document_id
            WHERE {}
            ORDER BY d.modified_at DESC
            LIMIT ? OFFSET ?
            "#,
            final_where_clause
        );

        let mut query_builder = sqlx::query(&query_str);

        // Bind the search query parameters
        query_builder = query_builder
            .bind(format!("%{}%", query))
            .bind(format!("%{}%", query))
            .bind(format!("%{}%", query))
            .bind(format!("%{}%", query));

        // Bind project IDs if specified
        if let Some(project_ids) = project_ids {
            if !project_ids.is_empty() {
                for project_id in project_ids {
                    query_builder = query_builder.bind(project_id.to_string());
                }
            }
        }

        // Bind limit and offset
        query_builder = query_builder
            .bind(limit as i64)
            .bind(offset as i64);

        let documents = query_builder.fetch_all(&self.pool).await?;

        let mut results = Vec::new();
        for row in documents {
            let tags: String = row.get("tags");
            let headings: String = row.get("headings");
            let project_id_str: Option<String> = row.get("project_id");
            let project_id = project_id_str.and_then(|s| Uuid::parse_str(&s).ok());
            
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
                project_id,
            });
        }

        Ok(results)
    }

    pub async fn get_document_by_id(&self, id: &Uuid) -> Result<Option<Document>> {
        let row = sqlx::query(
            r#"
            SELECT id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest, project_id
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
            let project_id_str: Option<String> = row.get("project_id");
            let project_id = project_id_str.and_then(|s| Uuid::parse_str(&s).ok());
            
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
                project_id,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_document_by_path(&self, path: &PathBuf) -> Result<Option<Document>> {
        let row = sqlx::query(
            r#"
            SELECT id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest, project_id
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
            let project_id_str: Option<String> = row.get("project_id");
            let project_id = project_id_str.and_then(|s| Uuid::parse_str(&s).ok());
            
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
                project_id,
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
            SELECT id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest, project_id
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
            let project_id_str: Option<String> = row.get("project_id");
            let project_id = project_id_str.and_then(|s| Uuid::parse_str(&s).ok());
            
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
                project_id,
            });
        }

        Ok(results)
    }

    pub async fn get_latest_document_version(&self, path: &PathBuf) -> Result<Option<Document>> {
        let row = sqlx::query(
            r#"
            SELECT id, path, filename, extension, size, modified_at, title, tags, headings, content_excerpt, content_hash, indexed_at, version, is_latest, project_id
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
            let project_id_str: Option<String> = row.get("project_id");
            let project_id = project_id_str.and_then(|s| Uuid::parse_str(&s).ok());
            
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
                project_id,
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

    // Exclusion Patterns Management
    pub async fn get_exclusion_patterns(&self) -> Result<Vec<ExclusionPattern>> {
        let rows = sqlx::query("SELECT id, pattern, description, is_glob, created_at FROM exclusion_patterns ORDER BY created_at ASC")
            .fetch_all(&self.pool)
            .await?;

        let mut patterns = Vec::new();
        for row in rows {
            patterns.push(ExclusionPattern {
                id: row.get("id"),
                pattern: row.get("pattern"),
                description: row.get("description"),
                is_glob: row.get::<i64, _>("is_glob") != 0,
                created_at: row.get("created_at"),
            });
        }

        Ok(patterns)
    }

    pub async fn add_exclusion_pattern(&self, pattern: &str, description: Option<&str>) -> Result<ExclusionPattern> {
        let id = Uuid::new_v4().to_string();
        let is_glob = pattern.contains('*');
        let created_at = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO exclusion_patterns (id, pattern, description, is_glob, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(pattern)
        .bind(description)
        .bind(is_glob)
        .bind(&created_at)
        .execute(&self.pool)
        .await?;

        Ok(ExclusionPattern {
            id,
            pattern: pattern.to_string(),
            description: description.map(|s| s.to_string()),
            is_glob,
            created_at,
        })
    }

    pub async fn remove_exclusion_pattern(&self, id: &str) -> Result<()> {
        sqlx::query("DELETE FROM exclusion_patterns WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn update_exclusion_pattern(&self, id: &str, pattern: &str, description: Option<&str>) -> Result<ExclusionPattern> {
        let is_glob = pattern.contains('*');

        sqlx::query(
            "UPDATE exclusion_patterns SET pattern = ?, description = ?, is_glob = ? WHERE id = ?"
        )
        .bind(pattern)
        .bind(description)
        .bind(is_glob)
        .bind(id)
        .execute(&self.pool)
        .await?;

        // Get the updated pattern
        let row = sqlx::query("SELECT id, pattern, description, is_glob, created_at FROM exclusion_patterns WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        Ok(ExclusionPattern {
            id: row.get("id"),
            pattern: row.get("pattern"),
            description: row.get("description"),
            is_glob: row.get::<i64, _>("is_glob") != 0,
            created_at: row.get("created_at"),
        })
    }
}
