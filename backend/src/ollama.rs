use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    pub options: Option<OllamaOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaOptions {
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaResponse {
    pub model: String,
    pub created_at: String,
    pub response: String,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaError {
    pub error: String,
}

pub struct OllamaClient {
    client: Client,
    base_url: String,
    model: String,
}

impl OllamaClient {
    pub fn new(base_url: String, model: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url,
            model,
        }
    }

    pub async fn generate(&self, prompt: &str, options: Option<OllamaOptions>) -> Result<String> {
        let request = OllamaRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            stream: false,
            options,
        };

        let response = self
            .client
            .post(&format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .await?;

        if response.status().is_success() {
            let ollama_response: OllamaResponse = response.json().await?;
            Ok(ollama_response.response)
        } else {
            let error: OllamaError = response.json().await?;
            Err(anyhow::anyhow!("Ollama error: {}", error.error))
        }
    }

    pub async fn summarize(&self, content: &str, length: SummaryLength) -> Result<String> {
        let length_instruction = match length {
            SummaryLength::Short => "Provide a short summary (3-5 bullet points) of the following content:",
            SummaryLength::Medium => "Provide a medium summary (1-2 paragraphs) of the following content:",
            SummaryLength::Long => "Provide a detailed summary (4-6 paragraphs) of the following content:",
        };

        let prompt = format!(
            "{}\n\nContent:\n{}\n\nSummary:",
            length_instruction,
            content
        );

        let options = OllamaOptions {
            temperature: Some(0.3),
            top_p: Some(0.9),
            max_tokens: Some(1000),
        };

        self.generate(&prompt, Some(options)).await
    }

    pub async fn answer_question(&self, question: &str, context: &str) -> Result<String> {
        let prompt = format!(
            "Based on the following context, please answer the question. If the answer cannot be found in the context, please say so clearly.\n\nContext:\n{}\n\nQuestion: {}\n\nAnswer:",
            context,
            question
        );

        let options = OllamaOptions {
            temperature: Some(0.2),
            top_p: Some(0.8),
            max_tokens: Some(800),
        };

        self.generate(&prompt, Some(options)).await
    }

    pub async fn health_check(&self) -> Result<bool> {
        match self.client.get(&format!("{}/api/tags", self.base_url)).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum SummaryLength {
    Short,
    Medium,
    Long,
}
