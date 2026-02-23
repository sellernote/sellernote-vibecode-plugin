# Sellernote Convention Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create 5 Claude Code skills that guide Sellernote development according to official conventions, with bundled convention documents.

**Architecture:** Each skill is self-contained with SKILL.md + references/ containing downloaded convention .md files. A sync script downloads conventions from GitHub. The orchestration skill coordinates data-provider and ui-dev skills.

**Tech Stack:** Claude Code Skills (SKILL.md + references), Bash (sync script), GitHub raw URLs

---

### Task 1: Create sync-conventions.sh script

**Files:**
- Create: `scripts/sync-conventions.sh`

**Step 1: Create scripts directory and write sync script**

```bash
#!/bin/bash
set -euo pipefail

# Sellernote Development Convention Sync Script
# Downloads convention documents from GitHub and places them in each skill's references/ directory

BASE_URL="https://raw.githubusercontent.com/sellernote/sellernote-development-convention/main"
SKILLS_DIR=".claude/skills"

echo "Syncing Sellernote development conventions..."

download() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  echo "  Downloading: $src"
  curl -sL "${BASE_URL}/${src}" -o "$dest"
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
```

**Step 2: Make script executable**

Run: `chmod +x scripts/sync-conventions.sh`

**Step 3: Run the sync script to download all conventions**

Run: `cd /Users/sungwoo.yang/Documents/sellernote/sellernote/sellernote-vibecode-plugin && bash scripts/sync-conventions.sh`
Expected: All convention files downloaded to each skill's references/ directory

**Step 4: Verify downloads**

Run: `find .claude/skills/*/references -name "*.md" | sort`
Expected: 29 .md files across 5 skill directories

**Step 5: Commit**

```bash
git add scripts/sync-conventions.sh .claude/skills/*/references/*.md
git commit -m "feat: add convention sync script and download convention docs"
```

---

### Task 2: Create nestjs-api-dev skill

**Files:**
- Create: `.claude/skills/nestjs-api-dev/SKILL.md`

**Step 1: Write SKILL.md**

The SKILL.md should contain:
- Frontmatter with name `nestjs-api-dev` and description covering NestJS API development triggers
- Convention loading instructions (Read each reference file)
- Sequential workflow: Explore -> DTO -> Controller -> Service -> Repository -> Guards -> Swagger
- Key MUST/MUST NOT rules extracted from conventions:
  - MUST use `@sellernote/sellernote-nestjs-api-property` for DTO properties
  - MUST use 3-layer architecture (Controller->Service->Repository, unidirectional)
  - Controller MUST NOT contain business logic
  - Repository MUST NOT contain business branching or domain validation
  - MUST use `@Transactional()` decorator from `typeorm-transactional` (not QueryRunner)
  - Money fields MUST be `string` type in DTO with `@SellernoteApiDecimal`
  - MUST use global ValidationPipe with `whitelist: true`, `forbidNonWhitelisted: true`
  - Standard response format: `{ success, data, error }`
  - Domain Model Interface pattern: define `IXxxModel`, Entity implements it
  - MUST use constructor injection for DI
- Code patterns for Controller, Service, Repository, DTO with good/bad examples
- Reference to `typeorm-dev` skill when Entity work is needed

**Step 2: Validate the skill**

Run: `python3 .claude/skills/skill-creator/scripts/quick_validate.py .claude/skills/nestjs-api-dev`
Expected: Validation passes

**Step 3: Commit**

```bash
git add .claude/skills/nestjs-api-dev/SKILL.md
git commit -m "feat: add nestjs-api-dev skill"
```

---

### Task 3: Create typeorm-dev skill

**Files:**
- Create: `.claude/skills/typeorm-dev/SKILL.md`

**Step 1: Write SKILL.md**

The SKILL.md should contain:
- Frontmatter with name `typeorm-dev` and description covering Entity, Migration, Repository triggers
- Convention loading instructions
- Sequential workflow: Explore -> Domain Model Interface -> Entity -> Relations -> Migration -> Repository verify
- Key MUST/MUST NOT rules:
  - Every Entity MUST extend custom `BaseEntity` (NOT TypeORM's built-in one) with `id` (UUID), `_no` (BIGINT AUTO_INCREMENT UNIQUE), `createdAt`, `updatedAt`, `deletedAt`
  - `@Entity()` MUST explicitly specify table name (snake_case singular)
  - `@Column()` MUST explicitly specify database type
  - Decimal fields MUST use `DecimalTransformer`
  - Relations MUST use `Relation<>` type wrapper
  - FK columns MUST be explicit
  - `eager: true` is FORBIDDEN
  - Enum stored as VARCHAR, not MySQL ENUM
  - Transactions via `@Transactional()` from `typeorm-transactional` (not QueryRunner)
  - `synchronize: true` FORBIDDEN in production
  - Migration files MUST have both `up()` and `down()`
  - Domain Model Interface (`IXxxModel`) MUST be separate from Entity
- Code patterns for Entity, Migration, DecimalTransformer, Relations

**Step 2: Validate the skill**

Run: `python3 .claude/skills/skill-creator/scripts/quick_validate.py .claude/skills/typeorm-dev`
Expected: Validation passes

**Step 3: Commit**

```bash
git add .claude/skills/typeorm-dev/SKILL.md
git commit -m "feat: add typeorm-dev skill"
```

---

### Task 4: Create nextjs-data-provider skill

**Files:**
- Create: `.claude/skills/nextjs-data-provider/SKILL.md`

**Step 1: Write SKILL.md**

The SKILL.md should contain:
- Frontmatter with name `nextjs-data-provider` and description covering data fetching, TanStack Query, Server Actions triggers
- Convention loading instructions
- Conditional workflow: Server vs Client data fetching decision -> appropriate pattern
- Key MUST/MUST NOT rules:
  - Server Components for initial data load, Server Actions for mutations, TanStack Query for client-side
  - MUST use explicit `cache`/`revalidate` on all fetch calls
  - MUST use `@lukemorales/query-key-factory` for type-safe query keys
  - Custom hooks in `queries/` directory
  - Server state duplication in Zustand is FORBIDDEN
  - Zustand: Slice pattern in `store/slices/`, devtools + persist middleware
  - 4 state types: Server (TanStack Query), Client (Zustand), Local (useState), URL (useSearchParams)
  - Optimistic updates with rollback pattern
  - `NEXT_PUBLIC_` only for non-sensitive variables
- Code patterns for: Query Key Factory, TanStack Query custom hook, Server Action, Server Component fetch, Zustand slice

**Step 2: Validate the skill**

Run: `python3 .claude/skills/skill-creator/scripts/quick_validate.py .claude/skills/nextjs-data-provider`
Expected: Validation passes

**Step 3: Commit**

```bash
git add .claude/skills/nextjs-data-provider/SKILL.md
git commit -m "feat: add nextjs-data-provider skill"
```

---

### Task 5: Create nextjs-ui-dev skill

**Files:**
- Create: `.claude/skills/nextjs-ui-dev/SKILL.md`

**Step 1: Write SKILL.md**

The SKILL.md should contain:
- Frontmatter with name `nextjs-ui-dev` and description covering UI components, MUI styling, forms, Storybook triggers
- Convention loading instructions
- Conditional workflow: Component type determination -> Implementation -> Styling -> Forms (if needed) -> Testing
- Key MUST/MUST NOT rules:
  - 4 component types: UI (props-only, Storybook), Feature (business logic), Layout (structure), Page (composition)
  - Dependency direction: Page -> Feature -> UI (unidirectional, no reverse)
  - UI components MUST NOT depend on store/queries
  - MUI v6 with `AppRouterCacheProvider`, `cssVariables: true`
  - Styling priority: Theme overrides > `styled()` > `sx` prop
  - `theme.palette` MANDATORY for all colors; no hex hardcoding
  - No inline `style={{}}`, no `!important`, no magic px values
  - Forms: React Hook Form + Zod (mandatory combo), `z.infer<typeof schema>` for types
  - MUI components via `Controller` wrapper, `zodResolver`, `mode: 'onBlur'`
  - Client + server dual validation (same Zod schema)
  - Test pyramid: Unit 40%, Component 25%, Integration 20%, E2E 10%, Visual 5%
  - Storybook: CSF3 format, Interaction Testing with `play` functions
  - Jest + RTL: prefer `getByRole`, MSW for API mocks
  - `'use client'` boundary at tree leaf nodes
  - `next/image` mandatory (no raw `<img>`), `next/font` mandatory
  - Code colocation: component, test, story in same folder
  - Absolute imports with `@/`
- Code patterns for: UI component, Feature component, MUI styled, Form with RHF+Zod, Storybook story, Jest test

**Step 2: Validate the skill**

Run: `python3 .claude/skills/skill-creator/scripts/quick_validate.py .claude/skills/nextjs-ui-dev`
Expected: Validation passes

**Step 3: Commit**

```bash
git add .claude/skills/nextjs-ui-dev/SKILL.md
git commit -m "feat: add nextjs-ui-dev skill"
```

---

### Task 6: Create nextjs-dev-orchestration skill

**Files:**
- Create: `.claude/skills/nextjs-dev-orchestration/SKILL.md`

**Step 1: Write SKILL.md**

The SKILL.md should contain:
- Frontmatter with name `nextjs-dev-orchestration` and description covering full Next.js feature/page development orchestration
- Convention loading instructions (lightweight - only architecture/routing conventions)
- Sequential workflow:
  1. Analyze requirements & identify data needs and UI components
  2. Design component tree (Page -> Feature -> UI dependency direction)
  3. Plan data layer: identify what queries/mutations are needed
  4. Instruct user to invoke `nextjs-data-provider` skill for data layer implementation
  5. Plan UI layer: identify component types and composition
  6. Instruct user to invoke `nextjs-ui-dev` skill for UI implementation
  7. Verify routing & layout configuration (App Router, `loading.tsx`, `error.tsx`)
  8. Integration verification checklist
- Key rules:
  - `app/` for route files only; business logic in `components/`, `hooks/`, `store/`, `queries/`
  - Server Components as default, `'use client'` at leaf nodes only
  - Route-level `error.tsx` (with `'use client'`), `loading.tsx` with skeleton UI
  - Middleware with `matcher` config

**Step 2: Validate the skill**

Run: `python3 .claude/skills/skill-creator/scripts/quick_validate.py .claude/skills/nextjs-dev-orchestration`
Expected: Validation passes

**Step 3: Commit**

```bash
git add .claude/skills/nextjs-dev-orchestration/SKILL.md
git commit -m "feat: add nextjs-dev-orchestration skill"
```

---

### Task 7: Update skills-lock.json and final commit

**Files:**
- Modify: `skills-lock.json`

**Step 1: Update skills-lock.json to register all new skills**

Add entries for all 5 new skills with `sourceType: "local"`.

**Step 2: Commit**

```bash
git add skills-lock.json
git commit -m "feat: register all convention skills in skills-lock.json"
```
