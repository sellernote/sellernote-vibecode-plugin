# Sellernote Convention Skills Design

## Overview

Create 5 Claude Code skills that guide development according to Sellernote's development conventions. Each skill bundles relevant convention documents from `sellernote-development-convention` repository and provides step-by-step workflows.

## Plugin Structure

```
sellernote-vibecode-plugin/
├── .claude/skills/
│   ├── skill-creator/              (existing)
│   ├── nestjs-api-dev/
│   │   ├── SKILL.md
│   │   └── references/             (7 convention docs)
│   ├── typeorm-dev/
│   │   ├── SKILL.md
│   │   └── references/             (6 convention docs)
│   ├── nextjs-data-provider/
│   │   ├── SKILL.md
│   │   └── references/             (5 convention docs)
│   ├── nextjs-ui-dev/
│   │   ├── SKILL.md
│   │   └── references/             (8 convention docs)
│   └── nextjs-dev-orchestration/
│       ├── SKILL.md
│       └── references/             (3 convention docs)
├── scripts/
│   └── sync-conventions.sh
└── skills-lock.json
```

## Convention Mapping

### nestjs-api-dev
- `common/COMMON_CONVENTION.md`
- `common/typescript/TYPESCRIPT_CONVENTION.md`
- `backend/BACKEND_CONVENTION.md`
- `backend/architecture/ARCHITECTURE_CONVENTION.md`
- `backend/api-spec/API_SPEC_CONVENTION.md`
- `backend/security/SECURITY_CONVENTION.md`
- `backend/nestjs/NESTJS_CONVENTION.md`

### typeorm-dev
- `common/COMMON_CONVENTION.md`
- `common/typescript/TYPESCRIPT_CONVENTION.md`
- `database/DATABASE_CONVENTION.md`
- `database/mysql/MYSQL_CONVENTION.md`
- `database/redis/REDIS_CONVENTION.md`
- `backend/typeorm/TYPEORM_CONVENTION.md`

### nextjs-data-provider
- `common/COMMON_CONVENTION.md`
- `common/typescript/TYPESCRIPT_CONVENTION.md`
- `frontend/FRONTEND_CONVENTION.md`
- `frontend/nextjs/NEXTJS_CONVENTION.md`
- `frontend/state/STATE_CONVENTION.md`

### nextjs-ui-dev
- `common/COMMON_CONVENTION.md`
- `common/typescript/TYPESCRIPT_CONVENTION.md`
- `frontend/FRONTEND_CONVENTION.md`
- `frontend/architecture/ARCHITECTURE_CONVENTION.md`
- `frontend/nextjs/NEXTJS_CONVENTION.md`
- `frontend/styling/STYLING_CONVENTION.md`
- `frontend/form/FORM_CONVENTION.md`
- `frontend/testing/TESTING_CONVENTION.md`

### nextjs-dev-orchestration
- `frontend/FRONTEND_CONVENTION.md`
- `frontend/architecture/ARCHITECTURE_CONVENTION.md`
- `frontend/nextjs/NEXTJS_CONVENTION.md`

## Skill Roles

### 1. nestjs-api-dev
- **Trigger:** NestJS API endpoint, Controller/Service/Repository, DTO, Swagger
- **Workflow:** Load conventions -> Explore codebase -> Define DTO (sellernote-nestjs-api-property) -> Controller (HTTP only) -> Service (business logic, @Transactional) -> Repository (data access only) -> Guard/Interceptor -> Swagger verify

### 2. typeorm-dev
- **Trigger:** Entity definition, Migration, Repository pattern, DB schema, Relations
- **Workflow:** Load conventions -> Explore entities -> Domain Model Interface (IXxxModel) -> Entity (BaseEntity extends, DecimalTransformer, Relation<>) -> Migration (up+down) -> Repository verify

### 3. nextjs-data-provider
- **Trigger:** Data fetching, TanStack Query hooks, Server Actions, API integration, caching
- **Workflow:** Load conventions -> Analyze data requirements -> Server Component fetch (cache/revalidate) -> Query Key Factory -> TanStack Query custom hooks (queries/) -> Server Actions (mutations) -> Cache strategy verify

### 4. nextjs-ui-dev
- **Trigger:** UI components, MUI styling, forms, Storybook, page layout
- **Workflow:** Load conventions -> Determine component type (UI/Feature/Layout/Page) -> Implement (MUI v6, theme tokens) -> Forms (RHF+Zod) -> Styling (Theme>styled>sx) -> Storybook story -> Tests (Jest+RTL)

### 5. nextjs-dev-orchestration
- **Trigger:** "new page", "develop feature" - full Next.js feature development
- **Workflow:** Analyze requirements -> Design component tree (Page->Feature->UI) -> Invoke nextjs-data-provider skill -> Invoke nextjs-ui-dev skill -> Routing/Layout (App Router) -> Integration verify

## Convention Sync

`scripts/sync-conventions.sh` downloads from GitHub raw URLs:
- Base: `https://raw.githubusercontent.com/sellernote/sellernote-development-convention/main/`
- Places files in each skill's `references/` directory
- Run on install and when conventions update

## Decisions

- **Approach:** Standalone skills with bundled convention docs (Approach A)
- **Backend skills:** Independent (nestjs-api-dev and typeorm-dev used separately)
- **Frontend orchestration:** nextjs-dev-orchestration coordinates data-provider and ui-dev skills
- **Convention format:** Downloaded .md files in references/
