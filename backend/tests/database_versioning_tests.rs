use knowledge_base_backend::database::{Database, Document, IndexEntry};
use chrono::{TimeZone, Utc};
use uuid::Uuid;
use std::path::PathBuf;

// Helper: create a sample document
fn make_document(path: &str, version: u32, is_latest: bool) -> Document {
    Document {
        id: Uuid::new_v4(),
        path: PathBuf::from(path),
        filename: PathBuf::from(path).file_name().unwrap().to_string_lossy().to_string(),
        extension: "md".to_string(),
        size: 10,
        modified_at: Utc.timestamp_opt(1_700_000_000, 0).unwrap(),
        title: Some("Doc".to_string()),
        tags: vec!["tag".to_string()],
        headings: vec!["h1".to_string()],
        content_excerpt: "excerpt".to_string(),
        content_hash: "hash".to_string(),
        indexed_at: Utc.timestamp_opt(1_700_000_100, 0).unwrap(),
        version,
        is_latest,
    }
}

#[tokio::test]
async fn migrate_creates_version_columns_and_indexes() {
    let db = Database::new("sqlite::memory:").await.unwrap();
    db.migrate().await.unwrap();

    // Insert a document including version fields to ensure schema supports them
    let doc = make_document("/tmp/test.md", 1, true);
    db.insert_document(&doc).await.unwrap();

    // Fetch by id and assert fields round-trip
    let fetched = db.get_document_by_id(&doc.id).await.unwrap().unwrap();
    assert_eq!(fetched.version, 1);
    assert!(fetched.is_latest);
}

#[tokio::test]
async fn versioning_latest_and_next_version_behavior() {
    let db = Database::new("sqlite::memory:").await.unwrap();
    db.migrate().await.unwrap();

    let path = PathBuf::from("/tmp/file.md");

    // Initially, next version should be 1
    let next = db.get_next_version_number(&path).await.unwrap();
    assert_eq!(next, 1);

    // Insert v1 as latest
    let v1 = make_document(path.to_str().unwrap(), 1, true);
    db.insert_document(&v1).await.unwrap();

    // Next version is 2 now
    let next2 = db.get_next_version_number(&path).await.unwrap();
    assert_eq!(next2, 2);

    // Mark previous as not latest and insert v2 latest
    db.mark_previous_versions_not_latest(&path).await.unwrap();
    let v2 = make_document(path.to_str().unwrap(), 2, true);
    db.insert_document(&v2).await.unwrap();

    // Validate latest selection
    let latest = db.get_latest_document_version(&path).await.unwrap().unwrap();
    assert_eq!(latest.version, 2);
    assert!(latest.is_latest);

    // Versions listing should include both
    let versions = db.get_document_versions(&path).await.unwrap();
    assert_eq!(versions.len(), 2);
}

#[tokio::test]
async fn index_entries_round_trip() {
    let db = Database::new("sqlite::memory:").await.unwrap();
    db.migrate().await.unwrap();

    let doc = make_document("/tmp/ix.md", 1, true);
    db.insert_document(&doc).await.unwrap();

    let entry = IndexEntry {
        id: Uuid::new_v4(),
        document_id: doc.id,
        chunk_id: 1,
        chunk_text: "Hello world".to_string(),
        positions: vec![0, 6],
    };

    db.insert_index_entries(&[entry.clone()]).await.unwrap();
    let fetched = db.get_index_entries_for_document(&doc.id).await.unwrap();
    assert_eq!(fetched.len(), 1);
    assert_eq!(fetched[0].chunk_text, "Hello world");
}


