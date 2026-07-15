#!/bin/bash
# ============================================================
# Portal FYP TVET (JTM) — GitHub Push Script
# Run this on YOUR machine to push the code to GitHub
# ============================================================
#
# PREREQUISITES:
# 1. Git installed (https://git-scm.com)
# 2. A GitHub Personal Access Token (PAT) with "repo" scope
#    Create at: https://github.com/settings/tokens (classic) 
#    or: https://github.com/settings/personal-access-tokens (fine-grained)
#
# USAGE:
#   chmod +x deploy-to-github.sh
#   ./deploy-to-github.sh
#
# ============================================================

set -e

REPO_URL="https://github.com/rosliza1/Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET.git"
REPO_DIR="Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET"

echo "🚀 Portal FYP TVET (JTM) — GitHub Deployment Script"
echo "===================================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Install from https://git-scm.com"
    exit 1
fi

# Check if the repo directory already exists
if [ -d "$REPO_DIR" ]; then
    echo "📁 Found existing directory: $REPO_DIR"
    echo "   Pulling latest changes..."
    cd "$REPO_DIR"
    git pull origin main 2>/dev/null || echo "   (no remote to pull from yet)"
else
    echo "📥 Cloning your GitHub repository..."
    git clone "$REPO_URL" "$REPO_DIR"
    cd "$REPO_DIR"
fi

echo ""
echo "📦 Copying project files from sandbox..."
echo "   (Run this script from the directory containing the project source)"
echo ""

# Note: In the sandbox, the project is at /home/z/my-project
# On your machine, you'll need to download the project files first
# Option A: Use the sandbox's download feature to get a zip
# Option B: Copy files manually

echo "========================================"
echo "📋 MANUAL DEPLOYMENT INSTRUCTIONS"
echo "========================================"
echo ""
echo "Since the sandbox cannot authenticate to GitHub directly,"
echo "follow these steps on YOUR machine:"
echo ""
echo "STEP 1: Download the project from the sandbox"
echo "  • Use the file browser to download all project files"
echo "  • Or use scp/rsync if you have SSH access"
echo ""
echo "STEP 2: Initialize git and push"
echo "  cd Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET"
echo "  git init"
echo "  git remote add origin $REPO_URL"
echo "  git add -A"
echo "  git commit -m 'feat: Portal FYP TVET (JTM) — complete learning portal'"
echo "  git branch -M main"
echo "  git push -u origin main"
echo ""
echo "STEP 3: When prompted for credentials:"
echo "  Username: your-github-username (rosliza1)"
echo "  Password: your-github-personal-access-token"
echo "  (NOT your GitHub password — use a PAT from Settings → Developer settings → Tokens)"
echo ""
echo "ALTERNATIVE: If the repo already has content (e.g., auto-created README):"
echo "  git pull origin main --allow-unrelated-histories"
echo "  git push -u origin main"
echo ""
echo "========================================"
echo "✅ After pushing, your code will be at:"
echo "   https://github.com/rosliza1/Portal-Pembelajaran-Projek-Tahun-Akhir-Pelajar-TVET"
echo "========================================"
