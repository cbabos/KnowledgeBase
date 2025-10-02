use anyhow::Result;
use crate::database::{Database, Document, IndexEntry};
use regex::Regex;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SearchResult {
    pub document: Document,
    pub score: f32,
    pub snippets: Vec<Snippet>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Snippet {
    pub text: String,
    pub start_pos: usize,
    pub end_pos: usize,
    pub highlighted: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SearchFilters {
    pub file_types: Option<Vec<String>>,
    pub folders: Option<Vec<String>>,
    pub date_from: Option<chrono::DateTime<chrono::Utc>>,
    pub date_to: Option<chrono::DateTime<chrono::Utc>>,
    pub tags: Option<Vec<String>>,
}

#[derive(Clone)]
pub struct SearchEngine {
    db: Database,
}

impl SearchEngine {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    pub async fn search(
        &self,
        query: &str,
        filters: Option<SearchFilters>,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<SearchResult>> {
        // Parse query for AND/OR operations and quoted phrases
        let parsed_query = self.parse_query(query);
        
        // Get all documents that match the basic text search
        let documents = self.db.search_documents(query, 1000, 0).await?;
        
        // Apply filters
        let filtered_documents = if let Some(filters) = filters {
            self.apply_filters(documents, &filters).await?
        } else {
            documents
        };

        // Score and rank results
        let mut scored_results = Vec::new();
        for document in filtered_documents {
            let score = self.calculate_score(&document, &parsed_query);
            let snippets = self.generate_snippets(&document, &parsed_query);
            
            scored_results.push(SearchResult {
                document,
                score,
                snippets,
            });
        }

        // Sort by score (highest first)
        scored_results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

        // Apply pagination
        let start = offset as usize;
        let end = std::cmp::min(start + limit as usize, scored_results.len());
        
        Ok(scored_results[start..end].to_vec())
    }

    fn parse_query(&self, query: &str) -> ParsedQuery {
        let mut terms = Vec::new();
        let mut phrases = Vec::new();
        let mut operators = Vec::new();

        // Simple query parsing - look for quoted phrases and AND/OR operators
        let re_quotes = Regex::new(r#""([^"]+)""#).unwrap();
        let re_operators = Regex::new(r"\b(AND|OR)\b").unwrap();

        // Extract quoted phrases
        for cap in re_quotes.captures_iter(query) {
            phrases.push(cap[1].to_string());
        }

        // Remove quoted phrases from query for term extraction
        let mut clean_query = query.to_string();
        for phrase in &phrases {
            clean_query = clean_query.replace(&format!("\"{}\"", phrase), "");
        }

        // Extract operators
        for cap in re_operators.captures_iter(&clean_query) {
            operators.push(cap[1].to_string());
        }

        // Extract individual terms
        for term in clean_query.split_whitespace() {
            if !term.eq_ignore_ascii_case("AND") && !term.eq_ignore_ascii_case("OR") {
                terms.push(term.to_lowercase());
            }
        }

        ParsedQuery {
            terms,
            phrases,
            operators,
        }
    }

    async fn apply_filters(
        &self,
        documents: Vec<Document>,
        filters: &SearchFilters,
    ) -> Result<Vec<Document>> {
        let mut filtered = documents;

        // Filter by file types
        if let Some(file_types) = &filters.file_types {
            filtered.retain(|doc| {
                file_types.iter().any(|ft| doc.extension.eq_ignore_ascii_case(ft))
            });
        }

        // Filter by folders
        if let Some(folders) = &filters.folders {
            filtered.retain(|doc| {
                folders.iter().any(|folder| doc.path.to_string_lossy().contains(folder))
            });
        }

        // Filter by date range
        if let Some(date_from) = filters.date_from {
            filtered.retain(|doc| doc.modified_at >= date_from);
        }
        if let Some(date_to) = filters.date_to {
            filtered.retain(|doc| doc.modified_at <= date_to);
        }

        // Filter by tags
        if let Some(tags) = &filters.tags {
            filtered.retain(|doc| {
                tags.iter().any(|tag| doc.tags.iter().any(|doc_tag| doc_tag.eq_ignore_ascii_case(tag)))
            });
        }

        Ok(filtered)
    }

    fn calculate_score(&self, document: &Document, query: &ParsedQuery) -> f32 {
        let mut score = 0.0;

        // Score based on filename matches
        let filename_lower = document.filename.to_lowercase();
        for term in &query.terms {
            if filename_lower.contains(term) {
                score += 2.0; // Higher weight for filename matches
            }
        }

        // Score based on title matches
        if let Some(title) = &document.title {
            let title_lower = title.to_lowercase();
            for term in &query.terms {
                if title_lower.contains(term) {
                    score += 1.5;
                }
            }
        }

        // Score based on content matches
        let content_lower = document.content_excerpt.to_lowercase();
        for term in &query.terms {
            let matches = content_lower.matches(term).count();
            score += matches as f32 * 0.5;
        }

        // Score based on phrase matches
        for phrase in &query.phrases {
            let phrase_lower = phrase.to_lowercase();
            if content_lower.contains(&phrase_lower) {
                score += 3.0; // Higher weight for exact phrase matches
            }
        }

        // Boost score for recent documents
        let days_old = chrono::Utc::now().signed_duration_since(document.modified_at).num_days();
        if days_old < 30 {
            score += 0.5;
        } else if days_old < 90 {
            score += 0.2;
        }

        score
    }

    fn generate_snippets(&self, document: &Document, query: &ParsedQuery) -> Vec<Snippet> {
        let mut snippets = Vec::new();
        let content = &document.content_excerpt;
        let content_lower = content.to_lowercase();

        // Find matches for terms and phrases
        let mut match_positions = Vec::new();
        
        for term in &query.terms {
            let term_lower = term.to_lowercase();
            let mut start = 0;
            while let Some(pos) = content_lower[start..].find(&term_lower) {
                let actual_pos = start + pos;
                match_positions.push((actual_pos, actual_pos + term.len()));
                start = actual_pos + 1;
            }
        }

        for phrase in &query.phrases {
            let phrase_lower = phrase.to_lowercase();
            let mut start = 0;
            while let Some(pos) = content_lower[start..].find(&phrase_lower) {
                let actual_pos = start + pos;
                match_positions.push((actual_pos, actual_pos + phrase.len()));
                start = actual_pos + 1;
            }
        }

        // Sort positions and merge overlapping ones
        match_positions.sort_by_key(|(start, _)| *start);
        let mut merged_positions = Vec::new();
        for (start, end) in match_positions {
            if let Some((last_start, last_end)) = merged_positions.last_mut() {
                if start <= *last_end + 50 { // Merge if within 50 characters
                    *last_end = end;
                } else {
                    merged_positions.push((start, end));
                }
            } else {
                merged_positions.push((start, end));
            }
        }

        // Generate snippets around matches
        for (start, end) in merged_positions {
            let snippet_start = start.saturating_sub(100);
            let snippet_end = std::cmp::min(end + 100, content.len());
            
            // Ensure we don't split in the middle of a UTF-8 character
            let mut actual_start = snippet_start;
            while actual_start < content.len() && !content.is_char_boundary(actual_start) {
                actual_start += 1;
            }
            
            let mut actual_end = snippet_end;
            while actual_end > actual_start && !content.is_char_boundary(actual_end) {
                actual_end -= 1;
            }
            
            let snippet_text = content[actual_start..actual_end].to_string();
            let highlighted = self.highlight_matches(&snippet_text, query);

            snippets.push(Snippet {
                text: snippet_text,
                start_pos: actual_start,
                end_pos: actual_end,
                highlighted,
            });

            // Limit to 2 snippets per document
            if snippets.len() >= 2 {
                break;
            }
        }

        snippets
    }

    fn highlight_matches(&self, text: &str, query: &ParsedQuery) -> String {
        let mut highlighted = text.to_string();
        
        // Highlight terms
        for term in &query.terms {
            let re = Regex::new(&format!(r"(?i)\b{}\b", regex::escape(term))).unwrap();
            highlighted = re.replace_all(&highlighted, format!("**{}**", term)).to_string();
        }

        // Highlight phrases
        for phrase in &query.phrases {
            let re = Regex::new(&format!(r"(?i){}", regex::escape(phrase))).unwrap();
            highlighted = re.replace_all(&highlighted, format!("**{}**", phrase)).to_string();
        }

        highlighted
    }

    pub async fn get_relevant_chunks_for_qa(
        &self,
        question: &str,
        top_k: u32,
    ) -> Result<Vec<(Document, IndexEntry)>> {
        // Extract keywords from the question (remove common words and punctuation)
        let keywords = self.extract_keywords_from_question(question);
        
        if keywords.is_empty() {
            return Ok(Vec::new());
        }
        
        // Search for each keyword and collect results
        let mut all_chunks = Vec::new();
        for keyword in keywords {
            let search_results = self.search(&keyword, None, top_k * 2, 0).await?;
            
            for result in search_results {
                let index_entries = self.db.get_index_entries_for_document(&result.document.id).await?;
                for entry in index_entries {
                    all_chunks.push((result.document.clone(), entry));
                }
            }
        }

        // Remove duplicates and sort by relevance
        all_chunks.sort_by(|a, b| {
            let score_a = self.calculate_chunk_relevance(&a.1.chunk_text, question);
            let score_b = self.calculate_chunk_relevance(&b.1.chunk_text, question);
            score_b.partial_cmp(&score_a).unwrap()
        });

        // Remove duplicates based on document ID and chunk ID
        let mut unique_chunks = Vec::new();
        let mut seen = std::collections::HashSet::new();
        
        for (doc, entry) in all_chunks {
            let key = (doc.id, entry.chunk_id);
            if !seen.contains(&key) {
                seen.insert(key);
                unique_chunks.push((doc, entry));
            }
        }

        unique_chunks.truncate(top_k as usize);
        Ok(unique_chunks)
    }

    fn extract_keywords_from_question(&self, question: &str) -> Vec<String> {
        // Common stop words to filter out
        let stop_words = [
            "what", "do", "does", "did", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "having", "will", "would", "could", "should", "can", "may",
            "might", "must", "shall", "the", "a", "an", "and", "or", "but", "in", "on", "at",
            "to", "for", "of", "with", "by", "from", "up", "about", "into", "through", "during",
            "before", "after", "above", "below", "between", "among", "this", "that", "these",
            "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
            "them", "my", "your", "his", "her", "its", "our", "their", "mine", "yours", "hers",
            "ours", "theirs", "who", "whom", "whose", "which", "where", "when", "why", "how",
            "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no",
            "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "now"
        ];
        
        let stop_words_set: std::collections::HashSet<&str> = stop_words.iter().cloned().collect();
        
        question
            .to_lowercase()
            .split_whitespace()
            .filter_map(|word| {
                // Remove punctuation
                let clean_word = word.trim_matches(|c: char| !c.is_alphanumeric());
                if clean_word.len() > 2 && !stop_words_set.contains(clean_word) {
                    Some(clean_word.to_string())
                } else {
                    None
                }
            })
            .collect()
    }

    fn calculate_chunk_relevance(&self, chunk_text: &str, question: &str) -> f32 {
        let chunk_lower = chunk_text.to_lowercase();
        let question_lower = question.to_lowercase();
        
        let question_terms: Vec<&str> = question_lower.split_whitespace().collect();
        let mut score = 0.0;
        
        for term in question_terms {
            if chunk_lower.contains(term) {
                score += 1.0;
            }
        }
        
        score
    }
}

#[derive(Debug, Clone)]
struct ParsedQuery {
    terms: Vec<String>,
    phrases: Vec<String>,
    operators: Vec<String>,
}
