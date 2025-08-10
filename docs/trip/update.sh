#!/bin/bash

# Exit on error
set -e

# === CONFIG ===
SRC_DIR="$(pwd)"                  # Current directory
DEST_DIR="../simongooder.com/docs/trip"   # Change this to your target folder
BRANCH_NAME="main"                # Change to the branch you want

echo "Copying files from $SRC_DIR to $DEST_DIR... 🏁"

# Create destination if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy all files (excluding .git folder if present)
rsync -av --exclude='.git' "$SRC_DIR/" "$DEST_DIR/"

echo "Files copied successfully. ☑️"

# === GIT COMMANDS ===
cd "$DEST_DIR"

echo "Running git commands in $DEST_DIR..."

# Example git commands — change as needed
# git checkout "$BRANCH_NAME"
git add .
git commit -m "Update itinerary app"
git push origin "$BRANCH_NAME"

echo "Done. ✅"
