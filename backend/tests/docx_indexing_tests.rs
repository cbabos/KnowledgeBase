use knowledge_base_backend::database::Database;
use knowledge_base_backend::corpus::CorpusManager;
use std::fs;
use std::io::Write;

#[tokio::test]
async fn docx_is_recognized_and_converted_when_pandoc_missing() {
    let db = Database::new("sqlite::memory:").await.unwrap();
    db.migrate().await.unwrap();
    let corpus = CorpusManager::new(db.clone(), vec![]);

    // Create a fake .docx by zipping minimal structure with document.xml
    let temp_dir = tempfile::tempdir().unwrap();
    let docx_path = temp_dir.path().join("sample.docx");
    {
        let file = fs::File::create(&docx_path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::FileOptions::default();
        zip.add_directory("word/", options).unwrap();
        zip.start_file("word/document.xml", options).unwrap();
        zip.write_all(b"<w:document><w:body><w:p><w:t>Hello World</w:t></w:p></w:body></w:document>").unwrap();
        zip.finish().unwrap();
    }

    let res = corpus.index_folder(temp_dir.path(), None).await.unwrap();
    assert_eq!(res.files_processed, 1);
}


