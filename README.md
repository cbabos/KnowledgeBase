# AI-Native Personal Knowledge Retriever

A local-first knowledge management system that helps you search, summarize, and ask questions about your personal notes and documents using AI.

## Features

- **Local-First**: All processing happens on your device by default
- **Fast Search**: Keyword and semantic search over your knowledge base
- **AI Summarization**: Generate summaries of documents using Ollama
- **Q&A**: Ask natural language questions with citations
- **Multiple Interfaces**: Web UI and CLI
- **Privacy-Focused**: Optional remote processing with explicit consent

## Tech Stack

- **Backend**: Rust with SQLite database
- **Frontend**: React with TypeScript and Tailwind CSS
- **LLM**: Ollama with gpt-oss:20b model
- **CLI**: Rust CLI for power users

## Quick Start

### Prerequisites

1. **Ollama**: Install and run Ollama with the gpt-oss:20b model
   ```bash
   # Install Ollama (if not already installed)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull the model
   ollama pull gpt-oss:20b
   
   # Start Ollama server
   ollama serve
   ```

2. **Rust**: Install Rust toolchain
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **Node.js**: Install Node.js for the frontend
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install node
   ```

### Installation

1. **Clone and build the backend**:
   ```bash
   cd backend
   cargo build --release
   ```

2. **Build the frontend**:
   ```bash
   # Install dependencies
   npm install
   
   # Build for production
   npm run build
   ```

3. **Build the CLI**:
   ```bash
   cd cli
   cargo build --release
   ```

### Running the Application

1. **Start the backend server**:
   ```bash
   cd backend
   cargo run
   ```
   The server will start on `http://localhost:8080`

2. **Access the web interface**:
   Open your browser and go to `http://localhost:8080`

3. **Use the CLI**:
   ```bash
   # Add a folder to index
   ./target/release/kb corpus add /path/to/your/notes
   
   # Build the index
   ./target/release/kb corpus index
   
   # Search your knowledge base
   ./target/release/kb search "your search query"
   
   # Ask a question
   ./target/release/kb ask "What did I write about Docker?"
   ```

## Usage

### Web Interface

1. **Indexing**: Go to the "Index" tab and add folders containing your notes
2. **Search**: Use the "Search" tab to find documents by keywords
3. **Q&A**: Use the "Q&A" tab to ask natural language questions
4. **Settings**: Configure privacy and model settings

### CLI Usage

```bash
# Corpus management
kb corpus add /path/to/folder     # Add folder to corpus
kb corpus list                    # List configured folders
kb corpus index                   # Build index
kb corpus reindex                 # Rebuild index

# Search and retrieval
kb search "query"                 # Search documents
kb list                          # List all documents
kb read <document-id>            # Read full document
kb summarize <document-id>       # Summarize document
kb ask "question"                # Ask a question
```

## Configuration

The application stores configuration in:
- **macOS**: `~/Library/Application Support/knowledge-base/config.toml`
- **Windows**: `%APPDATA%/knowledge-base/config.toml`
- **Linux**: `~/.config/knowledge-base/config.toml`

### Example Configuration

```toml
database_url = "sqlite:./knowledge_base.db"
server_port = 8080
ollama_url = "http://localhost:11434"
ollama_model = "gpt-oss:20b"
local_first = true
logging_enabled = false
log_retention_days = 7

[[corpus_folders]]
path = "/Users/username/notes"

[exclusions]
patterns = ["node_modules", ".git", "*.tmp"]
```

## Privacy & Security

- **Local-First**: All processing happens on your device by default
- **No Data Collection**: No telemetry or data collection by default
- **Explicit Consent**: Remote processing requires explicit opt-in
- **Content Redaction**: Logs redact document content for privacy
- **Secure Storage**: API keys stored in OS keychain when possible

## Supported File Types

- **Markdown** (`.md`): Full support with frontmatter parsing
- **Text** (`.txt`): Plain text files
- **PDF** (`.pdf`): Basic text extraction (experimental)

## Development

### Project Structure

```
knowledge-base/
├── backend/          # Rust backend server
├── cli/             # Rust CLI interface
├── src/             # React frontend
├── doc/             # Documentation
└── Cargo.toml       # Workspace configuration
```

### Running in Development

1. **Backend**:
   ```bash
   cd backend
   cargo run
   ```

2. **Frontend**:
   ```bash
   npm start
   ```

3. **CLI**:
   ```bash
   cd cli
   cargo run -- search "test query"
   ```

### Testing

```bash
# Backend tests
cd backend
cargo test

# Frontend tests
npm test

# CLI tests
cd cli
cargo test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Troubleshooting

### Common Issues

1. **Ollama not responding**:
   - Ensure Ollama is running: `ollama serve`
   - Check if the model is available: `ollama list`
   - Verify the model name in configuration

2. **Database errors**:
   - Check file permissions for the database file
   - Ensure SQLite is available

3. **Frontend not loading**:
   - Ensure the backend is running on port 8080
   - Check browser console for errors
   - Verify the build was successful

4. **Indexing fails**:
   - Check folder permissions
   - Ensure supported file types
   - Review exclusion patterns

### Getting Help

- Check the documentation in the `doc/` folder
- Open an issue on GitHub
- Review the logs for error messages
