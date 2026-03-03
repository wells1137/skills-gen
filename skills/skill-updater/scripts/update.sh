#!/bin/bash
# update.sh - Main script for the skill-updater skill

set -e

# 1. Get user input
read -p "Enter the path to your skills repository: " REPO_PATH
read -p "Enter the name of the skill to update: " SKILL_NAME
read -p "Enter the new version number (e.g., 1.2.3): " NEW_VERSION
read -p "Enter a one-line changelog message: " CHANGELOG

# 2. Find and execute the release script
RELEASE_SCRIPT="$REPO_PATH/scripts/release.sh"

if [ -f "$RELEASE_SCRIPT" ]; then
  echo "Found release script. Executing..."
  cd "$REPO_PATH"
  bash "$RELEASE_SCRIPT" "$SKILL_NAME" "$NEW_VERSION" "$CHANGELOG"
  echo ""
  echo "✅ Release process for $SKILL_NAME v$NEW_VERSION triggered successfully!"
  echo "Check the GitHub Actions tab in your repository for progress."
else
  echo "Error: Could not find release script at $RELEASE_SCRIPT" >&2
  echo "Please ensure the repository has been set up with the skill-publisher pipeline first." >&2
  exit 1
fi
