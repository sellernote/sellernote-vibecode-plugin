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
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
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
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 }
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

    proc.on('error', (err) => {
      process.stdout.write(`  WARNING: Failed to spawn claude for ${srcLabel}: ${err.message}\n`);
      resolve(null);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        process.stdout.write(`  WARNING: Translation failed for ${srcLabel}: ${errOutput.slice(0, 200)}\n`);
        resolve(null);
      }
    });

    proc.stdin.on('error', (err) => {
      process.stdout.write(`  WARNING: stdin error for ${srcLabel}: ${err.message}\n`);
      resolve(null);
    });
    proc.stdin.write(content, 'utf-8');
    proc.stdin.end();
  });
}

function updateSkillWithCreator(skillName) {
  const skillDir = join('skills', skillName);
  const prompt = [
    `Use the skill-creator skill (at .agents/skills/skill-creator/) to update an existing skill.`,
    `Read the skill-creator SKILL.md first and follow its Step 4 (Edit the Skill) guidelines.`,
    ``,
    `Target skill to update: ${skillDir}/`,
    ``,
    `The reference documents in ${skillDir}/references/ have just been updated and translated to English.`,
    `Read ALL reference .md files in ${skillDir}/references/ to understand the latest Sellernote development conventions,`,
    `then read the current ${skillDir}/SKILL.md and update it to accurately reflect these conventions.`,
    `Write the updated content directly to ${skillDir}/SKILL.md.`,
    ``,
    `Key requirements:`,
    `- Keep the same skill name and overall purpose`,
    `- Update YAML frontmatter description to comprehensively describe when to trigger`,
    `- Update the body to reference and reflect the updated convention documents`,
    `- Follow skill-creator best practices: concise, progressive disclosure, imperative form`,
    `- Keep SKILL.md under 500 lines`,
    `- Only include Sellernote-specific conventions (omit general knowledge Claude already has)`,
    `- All prose in SKILL.md must be in English`,
    `- These skills are used by multiple AI development agents, not limited to any specific IDE`,
  ].join('\n');

  return new Promise((resolve) => {
    const proc = spawn('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_DIR,
    });

    let errOutput = '';

    proc.stderr.on('data', (chunk) => { errOutput += chunk; });

    proc.on('error', (err) => {
      process.stdout.write(`  WARNING: Failed to spawn claude for ${skillName}: ${err.message}\n`);
      resolve(false);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        process.stdout.write(`  WARNING: Skill update failed for ${skillName} (exit ${code}): ${errOutput.slice(0, 300)}\n`);
        resolve(false);
      }
    });

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
    ['frontend/api/API_CLIENT_CONVENTION.md', 'API_CLIENT_CONVENTION.md'],
    ['frontend/api/axios/API_CLIENT_AXIOS_CONVENTION.md', 'API_CLIENT_AXIOS_CONVENTION.md'],
  ],
  'nextjs-ui-dev': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['frontend/testing/TESTING_CONVENTION.md', 'TESTING_CONVENTION.md'],
  ],
  'nextjs-dev-orchestration': [
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
  ],
  'react-dev': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
  ],
  'react-data-provider': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
    ['frontend/react-router/REACT_ROUTER_CONVENTION.md', 'REACT_ROUTER_CONVENTION.md'],
    ['frontend/state/STATE_CONVENTION.md', 'STATE_CONVENTION.md'],
    ['frontend/api/API_CLIENT_CONVENTION.md', 'API_CLIENT_CONVENTION.md'],
    ['frontend/api/axios/API_CLIENT_AXIOS_CONVENTION.md', 'API_CLIENT_AXIOS_CONVENTION.md'],
  ],
  'react-ui-dev': [
    ['common/COMMON_CONVENTION.md', 'COMMON_CONVENTION.md'],
    ['common/typescript/TYPESCRIPT_CONVENTION.md', 'TYPESCRIPT_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
    ['frontend/react-router/REACT_ROUTER_CONVENTION.md', 'REACT_ROUTER_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['frontend/testing/TESTING_CONVENTION.md', 'TESTING_CONVENTION.md'],
  ],
  'react-dev-orchestration': [
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
    ['frontend/react-router/REACT_ROUTER_CONVENTION.md', 'REACT_ROUTER_CONVENTION.md'],
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
    ['backend/prisma/PRISMA_CONVENTION.md', 'PRISMA_CONVENTION.md'],
    ['backend/spring/SPRING_CONVENTION.md', 'SPRING_CONVENTION.md'],
    ['database/DATABASE_CONVENTION.md', 'DATABASE_CONVENTION.md'],
    ['database/mysql/MYSQL_CONVENTION.md', 'MYSQL_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
    ['frontend/react-router/REACT_ROUTER_CONVENTION.md', 'REACT_ROUTER_CONVENTION.md'],
    ['frontend/state/STATE_CONVENTION.md', 'STATE_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['frontend/testing/TESTING_CONVENTION.md', 'TESTING_CONVENTION.md'],
    ['frontend/api/API_CLIENT_CONVENTION.md', 'API_CLIENT_CONVENTION.md'],
    ['frontend/api/axios/API_CLIENT_AXIOS_CONVENTION.md', 'API_CLIENT_AXIOS_CONVENTION.md'],
    ['infrastructure/INFRASTRUCTURE_CONVENTION.md', 'INFRASTRUCTURE_CONVENTION.md'],
    ['infrastructure/aws/AWS_CONVENTION.md', 'AWS_CONVENTION.md'],
    ['infrastructure/docker/DOCKER_CONVENTION.md', 'DOCKER_CONVENTION.md'],
    ['infrastructure/monorepo/MONOREPO_CONVENTION.md', 'MONOREPO_CONVENTION.md'],
    ['infrastructure/pulumi/PULUMI_CONVENTION.md', 'PULUMI_CONVENTION.md'],
    ['infrastructure/terraform/TERRAFORM_CONVENTION.md', 'TERRAFORM_CONVENTION.md'],
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
    ['backend/prisma/PRISMA_CONVENTION.md', 'PRISMA_CONVENTION.md'],
    ['backend/spring/SPRING_CONVENTION.md', 'SPRING_CONVENTION.md'],
    ['database/DATABASE_CONVENTION.md', 'DATABASE_CONVENTION.md'],
    ['database/mysql/MYSQL_CONVENTION.md', 'MYSQL_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
    ['frontend/react-router/REACT_ROUTER_CONVENTION.md', 'REACT_ROUTER_CONVENTION.md'],
    ['frontend/state/STATE_CONVENTION.md', 'STATE_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['frontend/testing/TESTING_CONVENTION.md', 'TESTING_CONVENTION.md'],
    ['frontend/api/API_CLIENT_CONVENTION.md', 'API_CLIENT_CONVENTION.md'],
    ['frontend/api/axios/API_CLIENT_AXIOS_CONVENTION.md', 'API_CLIENT_AXIOS_CONVENTION.md'],
    ['infrastructure/INFRASTRUCTURE_CONVENTION.md', 'INFRASTRUCTURE_CONVENTION.md'],
    ['infrastructure/aws/AWS_CONVENTION.md', 'AWS_CONVENTION.md'],
    ['infrastructure/docker/DOCKER_CONVENTION.md', 'DOCKER_CONVENTION.md'],
    ['infrastructure/monorepo/MONOREPO_CONVENTION.md', 'MONOREPO_CONVENTION.md'],
    ['infrastructure/pulumi/PULUMI_CONVENTION.md', 'PULUMI_CONVENTION.md'],
    ['infrastructure/terraform/TERRAFORM_CONVENTION.md', 'TERRAFORM_CONVENTION.md'],
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
    ['backend/prisma/PRISMA_CONVENTION.md', 'PRISMA_CONVENTION.md'],
    ['database/DATABASE_CONVENTION.md', 'DATABASE_CONVENTION.md'],
    ['frontend/FRONTEND_CONVENTION.md', 'FRONTEND_CONVENTION.md'],
    ['frontend/TEMPLATES.md', 'TEMPLATES.md'],
    ['frontend/architecture/ARCHITECTURE_CONVENTION.md', 'FRONTEND_ARCHITECTURE_CONVENTION.md'],
    ['frontend/nextjs/NEXTJS_CONVENTION.md', 'NEXTJS_CONVENTION.md'],
    ['frontend/react/REACT_CONVENTION.md', 'REACT_CONVENTION.md'],
    ['frontend/react-router/REACT_ROUTER_CONVENTION.md', 'REACT_ROUTER_CONVENTION.md'],
    ['frontend/state/STATE_CONVENTION.md', 'STATE_CONVENTION.md'],
    ['frontend/styling/STYLING_CONVENTION.md', 'STYLING_CONVENTION.md'],
    ['frontend/form/FORM_CONVENTION.md', 'FORM_CONVENTION.md'],
    ['frontend/api/API_CLIENT_CONVENTION.md', 'API_CLIENT_CONVENTION.md'],
    ['frontend/api/axios/API_CLIENT_AXIOS_CONVENTION.md', 'API_CLIENT_AXIOS_CONVENTION.md'],
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

console.log(`Unique source files: ${srcToDestMap.size}\n`);

console.log('Translating conventions to English (parallel)...\n');

await Promise.all(
  Array.from(srcToDestMap.entries()).map(async ([src, { content, dests }]) => {
    process.stdout.write(`  Translating: ${src}\n`);
    const translated = await translateAsync(content, src);
    if (translated) {
      for (const dest of dests) {
        writeFileSync(dest, translated, 'utf-8');
      }
      process.stdout.write(`  ✓ Done: ${src} → ${dests.length} file(s)\n`);
    } else {
      for (const dest of dests) {
        process.stdout.write(`  WARNING: ${dest} left in Korean (translation failed)\n`);
      }
    }
  })
);

// Step 3: Update SKILL.md files using skill-creator skill (claude invokes it directly)
console.log('\nUpdating SKILL.md files using skill-creator skill (parallel)...\n');

const updateResults = await Promise.all(
  Object.keys(SKILL_MAP).map(async (skillName) => {
    const skillMdPath = join(SKILLS_DIR, skillName, 'SKILL.md');
    if (!existsSync(skillMdPath)) {
      process.stdout.write(`  Skipping ${skillName}: SKILL.md not found\n`);
      return { skillName, success: false };
    }

    process.stdout.write(`  Updating: ${skillName}\n`);
    const success = await updateSkillWithCreator(skillName);
    if (success) {
      process.stdout.write(`  ✓ Updated: ${skillName}\n`);
    }
    return { skillName, success };
  })
);

const successCount = updateResults.filter(r => r.success).length;
console.log(`\nSkill updates: ${successCount}/${updateResults.length} succeeded`);
console.log('\nDone! All conventions synced, translated, and skills updated.');
