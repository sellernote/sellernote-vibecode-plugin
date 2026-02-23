#!/bin/bash
set -euo pipefail

# Sellernote Development Convention Sync Script
# Downloads convention documents from GitHub (private repo) using gh CLI
# and places them in each skill's references/ directory
#
# Prerequisites: gh CLI authenticated with access to sellernote org

REPO="sellernote/sellernote-development-convention"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="${PROJECT_DIR}/skills"

echo "Syncing Sellernote development conventions..."
echo "Repository: ${REPO}"

download() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  echo "  Downloading: $src"
  if ! gh api "repos/${REPO}/contents/${src}" --jq '.content' 2>/dev/null | base64 -d > "$dest"; then
    echo "  WARNING: Failed to download $src"
    return 1
  fi
}

# ── nestjs-api-dev ──
echo ""
echo "[nestjs-api-dev]"
download "common/COMMON_CONVENTION.md" "${SKILLS_DIR}/nestjs-api-dev/references/COMMON_CONVENTION.md"
download "common/typescript/TYPESCRIPT_CONVENTION.md" "${SKILLS_DIR}/nestjs-api-dev/references/TYPESCRIPT_CONVENTION.md"
download "backend/BACKEND_CONVENTION.md" "${SKILLS_DIR}/nestjs-api-dev/references/BACKEND_CONVENTION.md"
download "backend/architecture/ARCHITECTURE_CONVENTION.md" "${SKILLS_DIR}/nestjs-api-dev/references/BACKEND_ARCHITECTURE_CONVENTION.md"
download "backend/api-spec/API_SPEC_CONVENTION.md" "${SKILLS_DIR}/nestjs-api-dev/references/API_SPEC_CONVENTION.md"
download "backend/security/SECURITY_CONVENTION.md" "${SKILLS_DIR}/nestjs-api-dev/references/SECURITY_CONVENTION.md"
download "backend/nestjs/NESTJS_CONVENTION.md" "${SKILLS_DIR}/nestjs-api-dev/references/NESTJS_CONVENTION.md"

# ── typeorm-dev ──
echo ""
echo "[typeorm-dev]"
download "common/COMMON_CONVENTION.md" "${SKILLS_DIR}/typeorm-dev/references/COMMON_CONVENTION.md"
download "common/typescript/TYPESCRIPT_CONVENTION.md" "${SKILLS_DIR}/typeorm-dev/references/TYPESCRIPT_CONVENTION.md"
download "database/DATABASE_CONVENTION.md" "${SKILLS_DIR}/typeorm-dev/references/DATABASE_CONVENTION.md"
download "database/mysql/MYSQL_CONVENTION.md" "${SKILLS_DIR}/typeorm-dev/references/MYSQL_CONVENTION.md"
download "database/redis/REDIS_CONVENTION.md" "${SKILLS_DIR}/typeorm-dev/references/REDIS_CONVENTION.md"
download "backend/typeorm/TYPEORM_CONVENTION.md" "${SKILLS_DIR}/typeorm-dev/references/TYPEORM_CONVENTION.md"

# ── nextjs-data-provider ──
echo ""
echo "[nextjs-data-provider]"
download "common/COMMON_CONVENTION.md" "${SKILLS_DIR}/nextjs-data-provider/references/COMMON_CONVENTION.md"
download "common/typescript/TYPESCRIPT_CONVENTION.md" "${SKILLS_DIR}/nextjs-data-provider/references/TYPESCRIPT_CONVENTION.md"
download "frontend/FRONTEND_CONVENTION.md" "${SKILLS_DIR}/nextjs-data-provider/references/FRONTEND_CONVENTION.md"
download "frontend/nextjs/NEXTJS_CONVENTION.md" "${SKILLS_DIR}/nextjs-data-provider/references/NEXTJS_CONVENTION.md"
download "frontend/state/STATE_CONVENTION.md" "${SKILLS_DIR}/nextjs-data-provider/references/STATE_CONVENTION.md"

# ── nextjs-ui-dev ──
echo ""
echo "[nextjs-ui-dev]"
download "common/COMMON_CONVENTION.md" "${SKILLS_DIR}/nextjs-ui-dev/references/COMMON_CONVENTION.md"
download "common/typescript/TYPESCRIPT_CONVENTION.md" "${SKILLS_DIR}/nextjs-ui-dev/references/TYPESCRIPT_CONVENTION.md"
download "frontend/FRONTEND_CONVENTION.md" "${SKILLS_DIR}/nextjs-ui-dev/references/FRONTEND_CONVENTION.md"
download "frontend/architecture/ARCHITECTURE_CONVENTION.md" "${SKILLS_DIR}/nextjs-ui-dev/references/FRONTEND_ARCHITECTURE_CONVENTION.md"
download "frontend/nextjs/NEXTJS_CONVENTION.md" "${SKILLS_DIR}/nextjs-ui-dev/references/NEXTJS_CONVENTION.md"
download "frontend/styling/STYLING_CONVENTION.md" "${SKILLS_DIR}/nextjs-ui-dev/references/STYLING_CONVENTION.md"
download "frontend/form/FORM_CONVENTION.md" "${SKILLS_DIR}/nextjs-ui-dev/references/FORM_CONVENTION.md"
download "frontend/testing/TESTING_CONVENTION.md" "${SKILLS_DIR}/nextjs-ui-dev/references/TESTING_CONVENTION.md"

# ── nextjs-dev-orchestration ──
echo ""
echo "[nextjs-dev-orchestration]"
download "frontend/FRONTEND_CONVENTION.md" "${SKILLS_DIR}/nextjs-dev-orchestration/references/FRONTEND_CONVENTION.md"
download "frontend/architecture/ARCHITECTURE_CONVENTION.md" "${SKILLS_DIR}/nextjs-dev-orchestration/references/FRONTEND_ARCHITECTURE_CONVENTION.md"
download "frontend/nextjs/NEXTJS_CONVENTION.md" "${SKILLS_DIR}/nextjs-dev-orchestration/references/NEXTJS_CONVENTION.md"

echo ""
echo "Done! All conventions synced."
