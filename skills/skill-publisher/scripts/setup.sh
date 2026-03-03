#!/bin/bash
# setup.sh - Main setup script for the skill-publisher skill

set -e

# 1. Get user input
read -p "Enter the GitHub repository URL (e.g., https://github.com/your-org/your-repo): " REPO_URL
read -p "Enter your ClaWHub Token (clh_...): " CLAWHUB_TOKEN
read -p "Enter your GitHub PAT with repo and workflow scopes (ghp_...): " GH_PAT

REPO_NAME=$(basename -s .git "$REPO_URL")
ORG_NAME=$(basename "$(dirname "$REPO_URL")")
REPO_FULL_NAME="$ORG_NAME/$REPO_NAME"

CLONE_DIR="/tmp/$REPO_NAME"

# 2. Clone the target repository
echo "Cloning $REPO_FULL_NAME into $CLONE_DIR..."
rm -rf "$CLONE_DIR"
GH_TOKEN="$GH_PAT" git clone "$REPO_URL" "$CLONE_DIR"
cd "$CLONE_DIR"

# 3. Copy workflow and script files
echo "Copying CI/CD files..."
SKILL_PUBLISHER_ASSETS="/home/ubuntu/skills/skill-publisher/assets"
mkdir -p .github/workflows
mkdir -p scripts

cp "$SKILL_PUBLISHER_ASSETS/workflows/publish.yml" .github/workflows/
cp "$SKILL_PUBLISHER_ASSETS/workflows/quality-check.yml" .github/workflows/
cp "$SKILL_PUBLISHER_ASSETS/workflows/submit-awesome-lists.yml" .github/workflows/

cp "$SKILL_PUBLISHER_ASSETS/scripts/release.sh" scripts/
cp "$SKILL_PUBLISHER_ASSETS/scripts/setup-github-topics.sh" scripts/
chmod +x scripts/*.sh

# 4. Set GitHub Secrets
echo "Setting GitHub Actions secrets..."
GH_TOKEN="$GH_PAT" gh secret set CLAWHUB_TOKEN --repo "$REPO_FULL_NAME" --body "$CLAWHUB_TOKEN"
GH_TOKEN="$GH_PAT" gh secret set GH_PAT --repo "$REPO_FULL_NAME" --body "$GH_PAT"

# 5. Commit and push changes
echo "Committing and pushing changes..."
git config --global user.name "$ORG_NAME"
git config --global user.email "$ORG_NAME@users.noreply.github.com"

git add .github/ scripts/
git commit -m "ci: add automated multi-channel publishing pipeline via skill-publisher"
git push origin main

# 6. Set GitHub Topics
echo "Setting GitHub Topics..."
bash scripts/setup-github-topics.sh

echo ""
echo "✅ Automated publishing pipeline successfully set up for $REPO_FULL_NAME!"
echo ""
echo "To release a new version, run this from your local clone:"
echo "  bash scripts/release.sh <version> \"<changelog>\""
