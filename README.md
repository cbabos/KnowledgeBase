# AI-Native Personal Knowledge Retriever

A local-first knowledge management system that helps you search, summarize, and ask questions about your personal notes and documents using AI.

## Features

- **Local-First**: All processing happens on your device by default
- **Fast Search**: Keyword and semantic search over your knowledge base with project filtering
- **AI Q&A**: Ask natural language questions with citations and markdown responses
- **Project Management**: Organize documents into projects for better organization
- **Document Versioning**: Track document changes with version history and diff comparison
- **Multiple File Types**: Support for Markdown, Text, and Word documents (.docx)
- **Multiple Interfaces**: Web UI and CLI with full feature parity
- **Privacy-Focused**: Optional remote processing with explicit consent
- **MCP Integration**: Model Context Protocol for AI tool integration

## Key Capabilities

### Project Organization

- Create and manage multiple projects to organize your knowledge base
- Assign folders and documents to specific projects
- Filter search and Q&A operations by project context
- Reassign folders between projects while preserving version history

### Document Versioning

- Automatic version tracking when documents are modified
- View version history with timestamps and change summaries
- Compare document versions with detailed diff display
- Preserve all historical versions for audit and recovery

### Advanced Search & Q&A

- Full-text search with project filtering and file type filtering
- Natural language Q&A with markdown-formatted responses
- Citation tracking showing document versions used
- Context-aware responses based on project selection

### File Format Support

- **Markdown**: Full rendering with syntax highlighting
- **Word Documents**: Automatic conversion to markdown with Pandoc
- **Text Files**: Plain text processing with metadata extraction
- **Future**: PDF and other formats planned

## Tech Stack

- **Backend**: Rust with SQLite database
- **Frontend**: React with TypeScript and CSS Modules
- **Styling**: CSS Modules with design token system
- **LLM**: Ollama with gpt-oss:20b model
- **CLI**: Rust CLI for power users
- **Code Quality**: Prettier formatting with Husky git hooks

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

4. **Pandoc** (Optional): For enhanced .docx support

   ```bash
   # macOS
   brew install pandoc

   # Ubuntu/Debian
   sudo apt-get install pandoc

   # Windows
   # Download from https://pandoc.org/installing.html
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

2. **Start the frontend development server**:

   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:3000` (or 3001 if 3000 is in use)

3. **Access the web interface**:
   Open your browser and go to `http://localhost:3000` (or the port shown in the terminal)

4. **Use the CLI**:

   ```bash
   # Create a project
   ./target/release/kb project create "My Project" --description "Project description"

   # Add a folder to index with project assignment
   ./target/release/kb corpus add /path/to/your/notes --project "My Project"

   # Build the index
   ./target/release/kb corpus index

   # Search your knowledge base
   ./target/release/kb search "your search query"

   # Ask a question
   ./target/release/kb ask "What did I write about Docker?"
   ```

## Usage

### Web Interface

1. **Projects**: Create and manage projects to organize your documents
2. **Indexing**: Go to the "Index" tab to add folders and assign them to projects
3. **Search**: Use the "Search" tab with project filtering to find documents
4. **Q&A**: Use the "Q&A" tab to ask questions with project-specific context
5. **Version History**: View document changes and compare versions
6. **Settings**: Configure privacy, model settings, and file exclusions

### CLI Usage

```bash
# Project management
kb project list                   # List all projects
kb project create "Name"          # Create new project
kb project update <id> "Name"     # Update project
kb project delete <id>            # Delete project

# Corpus management
kb corpus add /path/to/folder     # Add folder to corpus
kb corpus add /path/to/folder --project "Project Name"  # Add with project
kb corpus list                    # List configured folders
kb corpus index                   # Build index
kb corpus reindex                 # Rebuild index

# Search and retrieval
kb search "query"                 # Search documents
kb search "query" --project "Project Name"  # Search within project
kb list                          # List all documents
kb read <document-id>            # Read full document
kb summarize <document-id>       # Summarize document
kb ask "question"                # Ask a question
kb ask "question" --project "Project Name"  # Ask within project context
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

- **Markdown** (`.md`): Full support with frontmatter parsing and markdown rendering
- **Text** (`.txt`): Plain text files
- **Word Documents** (`.docx`): Full support with Pandoc conversion or fallback text extraction
- **PDF** (`.pdf`): Basic text extraction (experimental)

## Development

### Project Structure

```
knowledge-base/
├── backend/          # Rust backend server
├── cli/             # Rust CLI interface
├── src/             # React frontend
│   ├── components/  # React components organized by type
│   │   ├── App/     # Main application component
│   │   ├── common/  # Reusable components (Button, Dropdown, etc.)
│   │   ├── *Interface/ # Feature-specific interfaces
│   │   └── *Modal/  # Modal components
│   ├── contexts/    # React context providers
│   ├── styles/      # Design tokens and global styles
│   └── types/       # TypeScript type definitions
├── doc/             # Documentation
└── Cargo.toml       # Workspace configuration
```

### Frontend Architecture

The frontend uses a modern React architecture with:

- **Component Organization**: Components are organized into logical directories (common, interfaces, modals)
- **CSS Modules**: Each component has its own scoped CSS module file
- **Design Tokens**: Centralized design system with CSS custom properties
- **Context Providers**: Global state management with React contexts
- **TypeScript**: Full type safety with comprehensive interfaces
- **Code Quality**: Prettier formatting and Husky git hooks

### Running in Development

1. **Backend**:

   ```bash
   cd backend
   cargo run
   ```

2. **Frontend**:

   ```bash
   npm run dev
   ```

3. **CLI**:
   ```bash
   cd cli
   cargo run -- search "test query"
   ```

### Code Quality

The project includes comprehensive code quality tools:

- **Prettier**: Automatic code formatting
- **Husky**: Git hooks for pre-commit formatting
- **TypeScript**: Strict type checking
- **CSS Modules**: Scoped styling with design tokens

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Type checking
npx tsc --noEmit
```

### Testing

```bash
# Backend tests (includes project management, document versioning, .docx support)
cd backend
cargo test

# Frontend tests (includes UI components, project management, document viewer)
npm test

# CLI tests (includes project commands, corpus management)
cd cli
cargo test

# Integration tests
cd backend
cargo test --test "*"  # Run all integration tests
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
   - Ensure the frontend dev server is running on port 3000/3001
   - Check browser console for errors
   - Verify the build was successful

4. **Indexing fails**:
   - Check folder permissions
   - Ensure supported file types
   - Review exclusion patterns
   - Verify project assignment is correct

5. **Project management issues**:
   - Ensure database is properly migrated
   - Check project ID format (should be UUID)
   - Verify project exists before assigning folders

6. **Document versioning issues**:
   - Check if content snapshots are being stored
   - Verify document modification timestamps
   - Ensure proper database schema migration

### Getting Help

- Check the documentation in the `doc/` folder
- Open an issue on GitHub
- Review the logs for error messages
