#!/bin/bash
# release.sh - 一键发布新版本到所有渠道
# 用法: bash scripts/release.sh 2.1.0 "Add new feature X"

set -e

VERSION=$1
CHANGELOG=$2

if [ -z "$VERSION" ]; then
  echo "❌ Usage: bash scripts/release.sh <version> [changelog]"
  echo "   Example: bash scripts/release.sh 2.1.0 'Add Stable Diffusion support'"
  exit 1
fi

if [ -z "$CHANGELOG" ]; then
  CHANGELOG="Release v$VERSION"
fi

echo "🚀 Releasing v$VERSION..."
echo "📝 Changelog: $CHANGELOG"
echo ""

# 1. 确认工作目录干净
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory is not clean. Please commit or stash changes first."
  exit 1
fi

# 2. 创建 git tag
echo "🏷️  Creating git tag v$VERSION..."
git tag -a "v$VERSION" -m "$CHANGELOG"

# 3. 推送 tag（触发 GitHub Actions 自动发布）
echo "📤 Pushing tag to GitHub (this triggers automated publishing)..."
git push origin "v$VERSION"

echo ""
echo "✅ Tag v$VERSION pushed!"
echo ""
echo "📊 GitHub Actions will now automatically:"
echo "   1. Validate all SKILL.md files"
echo "   2. Publish to ClaWHub"
echo "   3. Trigger skills.sh install count"
echo "   4. Create GitHub Release"
echo ""
echo "🔗 Monitor progress at:"
echo "   https://github.com/wells1137/skills-gen/actions"
echo ""
echo "📦 After ~5 minutes, verify publishing at:"
echo "   ClaWHub:  https://clawhub.ai/wells1137"
echo "   SkillsMP: https://skillsmp.com/search?q=wells1137"
