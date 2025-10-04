use knowledge_base_backend::database::Database;
use std::path::PathBuf;
use uuid::Uuid;

#[tokio::test]
async fn test_create_project() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Test creating a project
    let project = db.create_project("Test Project", Some("A test project description")).await?;
    
    assert_eq!(project.name, "Test Project");
    assert_eq!(project.description, Some("A test project description".to_string()));
    assert!(!project.id.to_string().is_empty());

    Ok(())
}

#[tokio::test]
async fn test_create_project_without_description() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Test creating a project without description
    let project = db.create_project("Test Project", None).await?;
    
    assert_eq!(project.name, "Test Project");
    assert_eq!(project.description, None);
    assert!(!project.id.to_string().is_empty());

    Ok(())
}

#[tokio::test]
async fn test_get_project() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Create a project
    let created_project = db.create_project("Test Project", Some("Description")).await?;
    
    // Retrieve the project
    let retrieved_project = db.get_project(&created_project.id).await?;
    assert!(retrieved_project.is_some());
    
    let project = retrieved_project.unwrap();
    assert_eq!(project.id, created_project.id);
    assert_eq!(project.name, "Test Project");
    assert_eq!(project.description, Some("Description".to_string()));

    Ok(())
}

#[tokio::test]
async fn test_get_nonexistent_project() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Try to get a non-existent project
    let nonexistent_id = Uuid::new_v4();
    let project = db.get_project(&nonexistent_id).await?;
    assert!(project.is_none());

    Ok(())
}

#[tokio::test]
async fn test_list_projects() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Create multiple projects
    let project1 = db.create_project("Project 1", Some("Description 1")).await?;
    let project2 = db.create_project("Project 2", Some("Description 2")).await?;
    let project3 = db.create_project("Project 3", None).await?;
    
    // List all projects
    let projects = db.list_projects().await?;
    assert_eq!(projects.len(), 3);
    
    // Check that all projects are present
    let project_ids: Vec<Uuid> = projects.iter().map(|p| p.id).collect();
    assert!(project_ids.contains(&project1.id));
    assert!(project_ids.contains(&project2.id));
    assert!(project_ids.contains(&project3.id));

    Ok(())
}

#[tokio::test]
async fn test_update_project() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Create a project
    let created_project = db.create_project("Original Name", Some("Original Description")).await?;
    
    // Update the project
    let updated_project = db.update_project(
        &created_project.id, 
        Some("Updated Name"), 
        Some("Updated Description")
    ).await?;
    
    assert!(updated_project.is_some());
    let project = updated_project.unwrap();
    assert_eq!(project.id, created_project.id);
    assert_eq!(project.name, "Updated Name");
    assert_eq!(project.description, Some("Updated Description".to_string()));

    Ok(())
}

#[tokio::test]
async fn test_update_project_partial() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Create a project
    let created_project = db.create_project("Original Name", Some("Original Description")).await?;
    
    // Update only the name
    let updated_project = db.update_project(
        &created_project.id, 
        Some("Updated Name"), 
        None
    ).await?;
    
    assert!(updated_project.is_some());
    let project = updated_project.unwrap();
    assert_eq!(project.id, created_project.id);
    assert_eq!(project.name, "Updated Name");
    assert_eq!(project.description, Some("Original Description".to_string()));

    Ok(())
}

#[tokio::test]
async fn test_delete_project() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Create a project
    let created_project = db.create_project("Test Project", Some("Description")).await?;
    
    // Delete the project
    let deleted = db.delete_project(&created_project.id).await?;
    assert!(deleted);
    
    // Verify the project is gone
    let project = db.get_project(&created_project.id).await?;
    assert!(project.is_none());

    Ok(())
}

#[tokio::test]
async fn test_delete_nonexistent_project() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Try to delete a non-existent project
    let nonexistent_id = Uuid::new_v4();
    let deleted = db.delete_project(&nonexistent_id).await?;
    assert!(!deleted);

    Ok(())
}

#[tokio::test]
async fn test_project_name_uniqueness() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Create a project
    let _project1 = db.create_project("Unique Name", Some("Description")).await?;
    
    // Try to create another project with the same name
    let result = db.create_project("Unique Name", Some("Different Description")).await;
    assert!(result.is_err());

    Ok(())
}

#[tokio::test]
async fn test_project_with_documents() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Create a project
    let project = db.create_project("Test Project", Some("Description")).await?;
    
    // Create a test document associated with the project
    use knowledge_base_backend::database::Document;
    use chrono::Utc;
    
    let document = Document {
        id: Uuid::new_v4(),
        path: PathBuf::from("/test/path.md"),
        filename: "test.md".to_string(),
        extension: "md".to_string(),
        size: 100,
        modified_at: Utc::now(),
        title: Some("Test Document".to_string()),
        tags: vec!["test".to_string()],
        headings: vec!["# Test".to_string()],
        content_excerpt: "Test content".to_string(),
        content_hash: "hash123".to_string(),
        indexed_at: Utc::now(),
        version: 1,
        is_latest: true,
        project_id: Some(project.id),
    };
    
    db.insert_document(&document).await?;
    
    // Verify the document is associated with the project
    let documents = db.search_documents_with_filters("test", 10, 0, true, Some(&[project.id])).await?;
    assert_eq!(documents.len(), 1);
    assert_eq!(documents[0].project_id, Some(project.id));

    Ok(())
}

#[tokio::test]
async fn test_project_with_indexed_folders() -> anyhow::Result<()> {
    let db = Database::new("sqlite::memory:").await?;
    db.migrate().await?;

    // Create a project
    let project = db.create_project("Test Project", Some("Description")).await?;
    
    // Associate a folder with the project
    db.upsert_indexed_folder("/test/folder", Some(&project.id), 5).await?;
    
    // Verify the folder is associated with the project
    let folders = db.get_indexed_folders().await?;
    let project_folder = folders.iter().find(|f| f.path == "/test/folder");
    assert!(project_folder.is_some());
    assert_eq!(project_folder.unwrap().project_id, Some(project.id));

    Ok(())
}
