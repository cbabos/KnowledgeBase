#!/bin/bash

set -e

echo "Building Knowledge Base Application..."

# Build backend
echo "Building Rust backend..."
cd backend
cargo build --release
cd ..

# Build CLI
echo "Building CLI..."
cd cli
cargo build --release
cd ..

# Build frontend
echo "Building React frontend..."
npm install
npm run build

echo "Build completed successfully!"
echo ""
echo "To run the application:"
echo "1. Start Ollama: ollama serve"
echo "2. Start backend: cd backend && cargo run"
echo "3. Open browser: http://localhost:8080"
echo ""
echo "CLI usage:"
echo "  ./cli/target/release/kb --help"
