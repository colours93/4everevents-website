#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="4ever"
REPO_DESC="Repository for 4ever project"
FOLDER="/Users/daddy/Desktop/untitled folder 3"

# Ensure gh is installed
if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI 'gh' is not installed. Install it from https://github.com/cli/cli"
  exit 1
fi

# Move to the target folder and prepare git
cd "$FOLDER"

# Initialize git if not already a repo
if [ ! -d ".git" ]; then
  git init
fi

git add -A
git commit -m "Initial commit from local folder" || true
git branch -M main

# Authenticate via browser if not already authenticated
if ! gh auth status >/dev/null 2>&1; then
  echo "Launching browser-based authentication with GitHub CLI..."
  gh auth login
fi

# Create the repository on GitHub (private) and link as origin
gh repo create "$REPO_NAME" --private --description "$REPO_DESC" --source="." --remote="origin" || true

# Push to GitHub
git push -u origin main

