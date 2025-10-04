#!/bin/bash

# Folder Reassignment Script
# This script safely moves all document versions (current and historical) 
# from one project to another when reassigning a folder.

set -e

DB_PATH="/Users/cbabos/Work/ai/KnowledgeBase/backend/knowledge_base.db"

if [ $# -ne 3 ]; then
    echo "Usage: $0 <folder_path> <from_project_id> <to_project_id>"
    echo "Example: $0 '/Users/cbabos/Work/ai/KnowledgeBase/doc' 'old-project-id' 'new-project-id'"
    exit 1
fi

FOLDER_PATH="$1"
FROM_PROJECT_ID="$2"
TO_PROJECT_ID="$3"

echo "🔄 Reassigning folder: $FOLDER_PATH"
echo "📤 From project: $FROM_PROJECT_ID"
echo "📥 To project: $TO_PROJECT_ID"
echo ""

# Check if folder exists
FOLDER_EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM indexed_folders WHERE path = '$FOLDER_PATH';")
if [ "$FOLDER_EXISTS" -eq 0 ]; then
    echo "❌ Error: Folder '$FOLDER_PATH' not found in indexed_folders"
    exit 1
fi

# Check if from_project has documents in this folder
DOCS_IN_FOLDER=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM documents WHERE path LIKE '$FOLDER_PATH%' AND project_id = '$FROM_PROJECT_ID';")
echo "📊 Found $DOCS_IN_FOLDER documents in folder assigned to source project"

if [ "$DOCS_IN_FOLDER" -eq 0 ]; then
    echo "⚠️  Warning: No documents found in folder for source project"
fi

# Show current state
echo ""
echo "📋 Current state:"
sqlite3 "$DB_PATH" "SELECT path, project_id, file_count FROM indexed_folders WHERE path = '$FOLDER_PATH';"
echo ""

# Confirm the operation
read -p "🤔 Do you want to proceed with the reassignment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo ""
echo "🔄 Starting reassignment..."

# Step 1: Update the folder's project_id
echo "1️⃣ Updating folder record..."
sqlite3 "$DB_PATH" "UPDATE indexed_folders SET project_id = '$TO_PROJECT_ID' WHERE path = '$FOLDER_PATH';"
FOLDER_UPDATED=$(sqlite3 "$DB_PATH" "SELECT changes();")
echo "   ✅ Updated $FOLDER_UPDATED folder record(s)"

# Step 2: Update ALL document versions (current and historical) in this folder
echo "2️⃣ Updating document project assignments..."
DOCS_UPDATED=$(sqlite3 "$DB_PATH" "UPDATE documents SET project_id = '$TO_PROJECT_ID' WHERE path LIKE '$FOLDER_PATH%' AND project_id = '$FROM_PROJECT_ID'; SELECT changes();")
echo "   ✅ Updated $DOCS_UPDATED document record(s)"

# Step 3: Verify the results
echo ""
echo "📋 Final state:"
sqlite3 "$DB_PATH" "SELECT path, project_id, file_count FROM indexed_folders WHERE path = '$FOLDER_PATH';"

DOCS_IN_NEW_PROJECT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM documents WHERE path LIKE '$FOLDER_PATH%' AND project_id = '$TO_PROJECT_ID';")
DOCS_IN_OLD_PROJECT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM documents WHERE path LIKE '$FOLDER_PATH%' AND project_id = '$FROM_PROJECT_ID';")

echo ""
echo "📊 Document distribution after reassignment:"
echo "   📥 Documents in new project ($TO_PROJECT_ID): $DOCS_IN_NEW_PROJECT"
echo "   📤 Documents in old project ($FROM_PROJECT_ID): $DOCS_IN_OLD_PROJECT"

if [ "$DOCS_IN_OLD_PROJECT" -eq 0 ] && [ "$DOCS_IN_NEW_PROJECT" -gt 0 ]; then
    echo ""
    echo "✅ SUCCESS: All documents successfully moved to new project!"
    echo "   🎯 No orphaned historical data remains"
    echo "   🗑️  Old project can now be safely deleted"
else
    echo ""
    echo "⚠️  WARNING: Some documents may not have been moved correctly"
    echo "   Please check the results manually"
fi

echo ""
echo "🏁 Reassignment completed!"
