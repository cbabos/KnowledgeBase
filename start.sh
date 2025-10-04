#!/bin/bash

# Knowledge Base Startup Script
set -e

echo "Starting Knowledge Base Application..."

# Check if Ollama is running
echo "Checking Ollama connection..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Warning: Ollama is not running or not accessible at http://localhost:11434"
    echo "   Please start Ollama with: ollama serve"
    echo "   And ensure the gpt-oss:20b model is available: ollama pull gpt-oss:20b"
    echo ""
fi

# Create necessary directories
echo "Setting up directories..."
mkdir -p ~/.local/share/knowledge-base
mkdir -p ~/.config/knowledge-base

# Set proper permissions
chmod 755 ~/.local/share/knowledge-base
chmod 755 ~/.config/knowledge-base

# Ensure database file exists in backend directory
echo "Setting up database..."
cd backend
if [ ! -f "knowledge_base.db" ]; then
    echo "Creating database file..."
    touch knowledge_base.db
fi

echo "Building and starting backend server..."
cargo build
cargo run &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

echo "Starting frontend development server..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo "Knowledge Base is starting up..."
echo "Backend: http://localhost:8080"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID
