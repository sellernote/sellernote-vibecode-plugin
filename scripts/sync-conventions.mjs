#!/usr/bin/env node

/**
 * Sellernote Development Convention Sync Script
 * Downloads convention documents from GitHub (private repo) using gh CLI
 * and places them in each skill's references/ directory.
 *
 * Prerequisites: gh CLI authenticated with access to sellernote org
 * Usage: node scripts/sync-conventions.mjs
 */

import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(__dirname, '..');
const SKILLS_DIR = join(PROJECT_DIR, 'skills');
const REPO = 'sellernote/sellernote-development-convention';

function download(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  process.stdout.write(`  Downloading: ${src}\n`);
  try {
    const result = execSync(
      `gh api "repos/${REPO}/contents/${src}" --jq ".content"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const content = Buffer.from(result.trim(), 'base64').toString('utf-8');
    writeFileSync(dest, content, 'utf-8');
    return { src, content };
  } catch {
    process.stdout.write(`  WARNING: Failed to download ${src}\n`);
    return null;
  }
}

const TRANSLATE_PROMPT =
  'Translate this markdown document from Korean to English. ' +
  'Rules: (1) Preserve all markdown formatting exactly (headings, lists, tables, code blocks, bold, italic). ' +
  '(2) Do NOT translate content inside code blocks (``` or `). ' +
  '(3) Do NOT translate technical terms, variable names, class names, or proper nouns. ' +
  '(4) Only translate natural language Korean text. ' +
  '(5) Output ONLY the translated markdown — no preamble, no commentary.';

function translateAsync(content, srcLabel) {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['-p', TRANSLATE_PROMPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let errOutput = '';

    proc.stdout.on('data', (chunk) => { output += chunk; });
    proc.stderr.on('data', (chunk) => { errOutput += chunk; });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        process.stdout.write(`  WARNING: Translation failed for ${srcLabel}: ${errOutput.slice(0, 200)}\n`);
        resolve(null);
      }
    });

    proc.stdin.write(content, 'utf-8');
    proc.stdin.end();
  });
}

const SKILL_MAP = {
  'nestjs-api-dev': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['backend/BACKEND_CONVENTION.md', 'BACKEND_CONVENTION.md'],
    ['backend/architecture/ARCHITECTURE_CONVENTION.md', 'BACKEND_ARCHITECTURE_CONVENTION.md'],
    ['backend/api-spec/API_SPEC_CONVENTION.md', 'API_SPEC_CONVENTION.md'],
    ['backend/security/SECURITY_CONVENTION.md', 'SECURITY_CONVENTION.md'],
    ['backend/nestjs/NESTJS_CONVENTION.md', 'NESTJS_CONVENTION.md'],
  ],
  'typeorm-dev': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['database/DATABASE_CONVENTION.md', 'DATABASE_CONVENTION.md'],
    ['database/mysql/MYSQL_CONVENTION.md', 'MYSQL_CONVENTION.md'],
    ['database/redis/REDIS_CONVENTION.md', 'REDIS_CONVENTION.md'],
    ['backend/typeorm/TYPEORM_CONVENTION.md', 'TYPEORM_CONVENTION.md'],
  ],
  'prisma-dev': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['database/DATABASE_CONVENTION.md', 'DATABASE_CONVENTION.md'],
    ['database/mysql/MYSQL_CONVENTION.md', 'MYSQL_CONVENTION.md'],
    ['database/redis/REDIS_CONVENTION.md', 'REDIS_CONVENTION.md'],
    ['backend/prisma/PRISMA_CONVENTION.md', 'PRISMA_CONVENTION.md'],
  ],
  'nextjs-data-provider': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/state/STATE_CONVENTION.md', 'STATE_CONVENTION.md'],
  ],
  'nextjs-ui-dev': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['frontend/testing/TESTING_CONVENTION.md', 'TESTING_CONVENTION.md'],
  ],
  'nextjs-dev-orchestration': [
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
  ],
  'convention-code-review': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['backend/BACKEND_CONVENTION.md', 'BACKEND_CONVENTION.md'],
    ['backend/architecture/ARCHITECTURE_CONVENTION.md', 'BACKEND_ARCHITECTURE_CONVENTION.md'],
    ['backend/api-spec/API_SPEC_CONVENTION.md', 'API_SPEC_CONVENTION.md'],
    ['backend/security/SECURITY_CONVENTION.md', 'SECURITY_CONVENTION.md'],
    ['backend/nestjs/NESTJS_CONVENTION.md', 'NESTJS_CONVENTION.md'],
    ['backend/typeorm/TYPEORM_CONVENTION.md', 'TYPEORM_CONVENTION.md'],
    ['database/DATABASE_CONVENTION.md', 'DATABASE_CONVENTION.md'],
    ['database/mysql/MYSQL_CONVENTION.md', 'MYSQL_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/state/STATE_CONVENTION.md', 'STATE_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['frontend/testing/TESTING_CONVENTION.md', 'TESTING_CONVENTION.md'],
    ['backend/prisma/PRISMA_CONVENTION.md', 'PRISMA_CONVENTION.md'],
  ],
  'convention-refactor': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['backend/BACKEND_CONVENTION.md', 'BACKEND_CONVENTION.md'],
    ['backend/architecture/ARCHITECTURE_CONVENTION.md', 'BACKEND_ARCHITECTURE_CONVENTION.md'],
    ['backend/api-spec/API_SPEC_CONVENTION.md', 'API_SPEC_CONVENTION.md'],
    ['backend/security/SECURITY_CONVENTION.md', 'SECURITY_CONVENTION.md'],
    ['backend/nestjs/NESTJS_CONVENTION.md', 'NESTJS_CONVENTION.md'],
    ['backend/typeorm/TYPEORM_CONVENTION.md', 'TYPEORM_CONVENTION.md'],
    ['database/DATABASE_CONVENTION.md', 'DATABASE_CONVENTION.md'],
    ['database/mysql/MYSQL_CONVENTION.md', 'MYSQL_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/state/STATE_CONVENTION.md', 'STATE_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['frontend/testing/TESTING_CONVENTION.md', 'TESTING_CONVENTION.md'],
    ['backend/prisma/PRISMA_CONVENTION.md', 'PRISMA_CONVENTION.md'],
  ],
  'nestjs-testing': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['backend/BACKEND_CONVENTION.md', 'BACKEND_CONVENTION.md'],
    ['backend/architecture/ARCHITECTURE_CONVENTION.md', 'BACKEND_ARCHITECTURE_CONVENTION.md'],
    ['backend/nestjs/NESTJS_CONVENTION.md', 'NESTJS_CONVENTION.md'],
  ],
  'project-scaffold': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['backend/BACKEND_CONVENTION.md', 'BACKEND_CONVENTION.md'],
    ['backend/architecture/ARCHITECTURE_CONVENTION.md', 'BACKEND_ARCHITECTURE_CONVENTION.md'],
    ['backend/api-spec/API_SPEC_CONVENTION.md', 'API_SPEC_CONVENTION.md'],
    ['backend/security/SECURITY_CONVENTION.md', 'SECURITY_CONVENTION.md'],
    ['backend/nestjs/NESTJS_CONVENTION.md', 'NESTJS_CONVENTION.md'],
    ['backend/typeorm/TYPEORM_CONVENTION.md', 'TYPEORM_CONVENTION.md'],
    ['database/DATABASE_CONVENTION.md', 'DATABASE_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/state/STATE_CONVENTION.md', 'STATE_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['backend/prisma/PRISMA_CONVENTION.md', 'PRISMA_CONVENTION.md'],
  ],
};

console.log('Syncing Sellernote development conventions...');
console.log(`Repository: ${REPO}\n`);

// Map: srcPath -> { content, dests: [destPath, ...] }
const srcToDestMap = new Map();

for (const [skill, files] of Object.entries(SKILL_MAP)) {
  console.log(`[${skill}]`);
  for (const [src, destName] of files) {
    const dest = join(SKILLS_DIR, skill, 'references', destName);
    const result = download(src, dest);
    if (result) {
      if (!srcToDestMap.has(src)) {
        srcToDestMap.set(src, { content: result.content, dests: [] });
      }
      srcToDestMap.get(src).dests.push(dest);
    }
  }
  console.log('');
}

console.log('Done! All conventions downloaded.');
console.log(`Unique source files: ${srcToDestMap.size}\n`);
