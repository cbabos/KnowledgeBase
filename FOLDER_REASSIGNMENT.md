# Folder Reassignment Guide

## Problem

When reassigning a folder to a different project, the current implementation only updates the folder record but doesn't move the associated documents (including historical versions). This creates orphaned historical data that prevents project deletion.

## Solution

Use the `reassign_folder.sh` script to safely move all document versions (current and historical) when reassigning a folder.

## Usage

```bash
./reassign_folder.sh <folder_path> <from_project_id> <to_project_id>
```

### Example

```bash
# Move all documents in /path/to/folder from project A to project B
./reassign_folder.sh "/path/to/folder" "old-project-id" "new-project-id"
```

## What the Script Does

1. **Validates Input**: Checks if the folder exists and has documents
2. **Shows Current State**: Displays current folder and document assignments
3. **Confirms Operation**: Asks for user confirmation before proceeding
4. **Updates Folder Record**: Changes the folder's project_id
5. **Moves All Documents**: Updates project_id for ALL document versions (current and historical)
6. **Verifies Results**: Shows final state and confirms no orphaned data

## Safety Features

- ✅ **No Data Loss**: All historical versions are preserved
- ✅ **Atomic Operation**: Either all documents are moved or none
- ✅ **Verification**: Shows before/after state
- ✅ **Confirmation**: Requires user approval before making changes
- ✅ **Error Handling**: Stops on any errors

## Example Output

```
🔄 Reassigning folder: /Users/cbabos/Work/ai/KnowledgeBase/doc
📤 From project: old-project-id
📥 To project: new-project-id

📊 Found 51 documents in folder assigned to source project

📋 Current state:
/Users/cbabos/Work/ai/KnowledgeBase/doc|old-project-id|17

🤔 Do you want to proceed with the reassignment? (y/N): y

🔄 Starting reassignment...
1️⃣ Updating folder record...
   ✅ Updated 1 folder record(s)
2️⃣ Updating document project assignments...
   ✅ Updated 51 document record(s)

📋 Final state:
/Users/cbabos/Work/ai/KnowledgeBase/doc|new-project-id|17

📊 Document distribution after reassignment:
   📥 Documents in new project (new-project-id): 51
   📤 Documents in old project (old-project-id): 0

✅ SUCCESS: All documents successfully moved to new project!
   🎯 No orphaned historical data remains
   🗑️  Old project can now be safely deleted

🏁 Reassignment completed!
```

## Important Notes

- **Always backup your database** before running the script
- The script works with the current database schema
- It handles both current and historical document versions
- After successful reassignment, the old project can be safely deleted
- The script is idempotent - running it multiple times is safe

## Troubleshooting

If you encounter issues:

1. **Check folder path**: Ensure the path exactly matches what's in the database
2. **Verify project IDs**: Use the exact UUIDs from the projects table
3. **Check permissions**: Ensure you have write access to the database file
4. **Backup first**: Always backup before making changes

## Database Schema

The script works with these tables:

- `indexed_folders`: Stores folder metadata and project assignments
- `documents`: Stores all document versions with project assignments
- `projects`: Stores project information
