---
name: convention-refactor
description: Refactor existing code to comply with Sellernote development conventions. Use when transforming code to match convention patterns without changing business logic. Triggers on tasks involving convention compliance refactoring, pattern migration, code structure alignment, legacy code modernization, architecture layer separation, decorator migration, ORM migration, component restructuring, or design system alignment. Also use when asked to "컨벤션에 맞게 리팩토링해줘", "convention 맞춰줘", "패턴 적용해줘", "구조 리팩토링해줘", "컨벤션 수정해줘", "아키텍처 맞춰줘", "refactor to match conventions", "apply convention patterns", "fix convention violations", "align with architecture", "migrate to Prisma", "apply feature-based architecture", "fix barrel files", "migrate to React Router v7", "apply Tailwind v4 patterns", or any task requiring structural changes to existing code to comply with Sellernote backend, frontend, or infrastructure conventions.
---

# Convention Refactor

Refactor existing code to comply with Sellernote conventions. Changes are **structural/pattern-only** -- business logic must remain unchanged.

## Convention Loading

Conventions are loaded dynamically based on the target files. Before starting, Read the relevant reference files from `references/` within this skill directory.

### Loading Strategy

1. **Always read** (apply to all refactoring):
   - `references/COMMON_CONVENTION.md` - Domain glossary, naming, error handling, logging
   - `references/TYPESCRIPT_CONVENTION.md` - Strict mode, interface vs type, imports, no `any`

2. **Read when refactoring backend files**:
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, DTO naming, test pyramid
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer responsibilities, allowed/prohibited patterns per layer
   - `references/NESTJS_CONVENTION.md` - Feature modules, Domain Model Interface, @SellernoteApi* decorators, monetary handling
   - `references/API_SPEC_CONVENTION.md` - RESTful URL design, response structure, pagination, versioning
   - `references/SECURITY_CONVENTION.md` - JWT (RS256, Refresh Token Rotation), RBAC, input validation, cookie security
   - `references/TYPEORM_CONVENTION.md` - SnakeNamingStrategy, BaseEntity, DecimalTransformer, Relation<T>, varchar enums
   - `references/DATABASE_CONVENTION.md` - 3NF, snake_case naming, common fields, soft delete, UUID v4 PK
   - `references/MYSQL_CONVENTION.md` - InnoDB, DECIMAL(15,2), DATETIME not TIMESTAMP, no ENUM type
   - `references/PRISMA_CONVENTION.md` - @@map/@@index, @db.* types, explicit join models, cursor pagination
   - `references/SPRING_CONVENTION.md` - Package by Feature, constructor injection, @Transactional patterns

3. **Read when refactoring frontend files**:
   - `references/FRONTEND_CONVENTION.md` - React Router v7 (ssr:false), React 19, component design, no barrel files
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Feature-based directory layout, component types (UI/Feature/Layout/Page), dependency direction
   - `references/REACT_CONVENTION.md` - React 19 patterns, Compound Components, hooks rules, Suspense/Error Boundary
   - `references/REACT_ROUTER_CONVENTION.md` - Framework Mode, code-based routes, +types, clientLoader for ensureQueryData only, middleware
   - `references/NEXTJS_CONVENTION.md` - Next.js 15 App Router, Server vs Client Components, Server Actions
   - `references/STATE_CONVENTION.md` - State classification (Server/URL/Local/Global UI), Zustand as last resort, TanStack Query patterns, nuqs for URL state
   - `references/STYLING_CONVENTION.md` - Tailwind CSS v4, cn() utility, cva() for variants, v4 behavior changes
   - `references/FORM_CONVENTION.md` - React Hook Form + Zod, zodResolver, Controller binding, useWatch not watch
   - `references/TESTING_CONVENTION.md` - Test pyramid (Unit 50%/Integration 35%/E2E 15%), RTL, Playwright
   - `references/API_CLIENT_CONVENTION.md` - In-memory Access Token, httpOnly cookie Refresh Token, BroadcastChannel sync
   - `references/API_CLIENT_AXIOS_CONVENTION.md` - Axios interceptors, token refresh queue, error transform

4. **Read when refactoring infrastructure files**:
   - `references/INFRASTRUCTURE_CONVENTION.md` - 3 environments, .env rules, CI/CD pipeline stages, deployment strategies
   - `references/DOCKER_CONVENTION.md` - Multi-stage builds, alpine base, non-root user, .dockerignore
   - `references/TERRAFORM_CONVENTION.md` - environments/ + modules/, remote state S3+DynamoDB, snake_case naming
   - `references/PULUMI_CONVENTION.md` - ComponentResource, Output<T> handling, pulumi.interpolate, stack management
   - `references/AWS_CONVENTION.md` - {env}-{service}-{resource}-{identifier} naming, required tags, IAM least privilege
   - `references/MONOREPO_CONVENTION.md` - apps/ + packages/ + tooling/, @sellernote/* scope, Turborepo pipeline

## Workflow

### Step 1: Determine Refactoring Scope

Identify what needs refactoring from one of these sources:

| Source | How to Identify |
|--------|-----------------|
| **convention-code-review output** | User pastes or references a review report |
| **Specific files** | User points to file(s) or directory |
| **Specific rule** | User names a convention rule to apply |
| **Entire module** | User asks to align a module with conventions |

List all files that will be touched and classify them (backend/frontend/infrastructure/common).

### Step 2: Analyze Current State

For each file in scope:

1. Read the file completely
2. Identify all convention violations (use same checklist as `convention-code-review`)
3. Classify violations by severity: MUST -> SHOULD -> RECOMMEND
4. Note any business logic that must be preserved during refactoring

### Step 3: Present Refactoring Plan

**[MUST] Always present the plan to the user before making any changes.**

```
## Refactoring Plan

### Files to modify: N

### Changes (in execution order):

#### 1. [MUST] Extract business logic from Controller to Service
   - File: `src/modules/order/order.controller.ts`
   - Current: Lines 25-50 contain price calculation logic
   - Change: Move calculation to `OrderService.calculateTotal()`
   - Impact: Controller becomes thinner, Service gains method

#### 2. [MUST] Replace raw @ApiProperty with @SellernoteApi* decorators
   - File: `src/modules/order/dto/create-order.dto.ts`
   - Current: Uses `@ApiProperty()` and `@IsString()` from class-validator
   - Change: Replace with `@SellernoteApiString()`, `@SellernoteApiDecimal()`
   - Impact: Same validation behavior, unified decorator pattern

...

### Shall I proceed? (y/n)
```

Wait for user confirmation before applying any changes.

### Step 4: Apply Changes Incrementally

Apply changes **one convention rule at a time**, in severity order:

1. **MUST violations first** (architecture-breaking issues)
2. **SHOULD violations second** (strong recommendations)
3. **RECOMMEND violations last** (nice-to-haves)

Within each severity level, apply in this order:

#### Backend Refactoring Patterns

**Controller -> Service extraction:**
- Move calculation, validation, and data transformation logic to Service
- Keep only HTTP concerns (parameter extraction, response mapping) in Controller

**Service -> Repository extraction:**
- Move `createQueryBuilder()`, `find()`, `findOne()` chains to Repository
- Service calls named Repository methods instead

**QueryRunner -> @Transactional():**
- Remove QueryRunner injection and manual transaction management
- Add `@Transactional()` decorator (from `typeorm-transactional`) to Service method

**number -> big.js for money:**
- Change type from `number` to `string` in DTOs and interfaces
- Replace `@SellernoteApiNumber` with `@SellernoteApiDecimal` in DTOs
- Replace native arithmetic with `big.js` operations in Service
- Add `DecimalTransformer` to Entity column if applicable

**@ApiProperty -> @SellernoteApi*:**
- Replace all `@ApiProperty`, `@IsString`, `@IsNumber`, etc.
- Use corresponding `@SellernoteApi*` decorator (String, Number, Decimal, Boolean, Enum, Date, Object, Array)
- Move validation config into decorator options

**Domain Model Interface alignment:**
- Create `IOrderModel` interface with own fields only
- Create `IOrderModelRelation` interface with relation fields (typed as `Relation<IRelatedModel>`)
- Entity implements `IOrderModel, IOrderModelRelation`
- DTO references `IOrderModel` fields for type consistency

**Entity convention alignment:**
- Extend custom `BaseEntity` (uuid PK + `_no` BIGINT + timestamps)
- Change `@Column({ type: 'enum', enum: Status })` to `@Column({ type: 'varchar', length: 50 })`
- Wrap relation types with `Relation<T>`
- Add `DecimalTransformer` to decimal columns
- Use `SnakeNamingStrategy` (project-level config)

**Prisma schema alignment:**
- Add `@db.*` native type annotations to all fields
- Add `@@map("snake_case")` to models and `@map("snake_case")` to fields
- Add `@@index([fkField])` for every FK column
- Replace implicit many-to-many with explicit join model
- Repeat common fields per model (no inheritance)

**NestJS module splitting:**
- One feature module per domain entity
- File naming: `[name].[type].ts` (e.g., `order.controller.ts`)
- Split large services by read/write or sub-domain

#### Frontend Refactoring Patterns

**Feature-based architecture migration:**
- Move domain code from flat `components/` to `features/{domain}/` structure
- Shared domain code goes to `features/_common/{domain}/`
- Each feature folder contains: `components/`, `hooks/`, `utils/`, `types/`, `constants/`
- API layer goes to `features/{domain}/api/` with `query-options.ts` + endpoint hooks

**Barrel file removal:**
- Delete all `index.ts` barrel/re-export files
- Update all imports to use direct file paths
- No exceptions -- barrel files are prohibited

**Component type-location alignment:**
- UI components: Pure presentational, no hooks/store/queries, receive data via props
- Feature components: Use hooks, queries, stores; marked `'use client'`
- Layout components: Structural wrappers (Header, Sidebar, PageLayout)
- Page components: Route entry points, compose Feature and Layout components

**Dependency direction fix:**
- UI must NOT import from Feature, store, or queries
- Feature can import from UI and hooks
- Page composes Feature and Layout components
- Extract store/query usage into parent Feature component, pass data as props

**Query pattern alignment (TanStack Query v5):**
- Create `query-options.ts` with `queryOptions()` factory per domain
- Use `useSuspenseQuery` with Suspense boundary (not `useQuery` + loading state)
- Use `queryClient.ensureQueryData()` in `clientLoader` for prefetching
- Never call queries directly in components -- use query-options factories

**State management alignment:**
- Server state: TanStack Query (primary data source)
- URL state: nuqs with `NuqsAdapter` (search params, filters, pagination)
- Local state: `useState`/`useReducer` (form inputs, UI toggles)
- Global UI state: Zustand only as last resort (theme, sidebar open)
- Remove Zustand stores that duplicate server or URL state

**Styling migration to Tailwind v4:**
- Use `cn()` for conditional class merging
- Use `cva()` for component variants
- Replace hardcoded hex colors with design token references
- Replace arbitrary values (`p-[16px]`) with Tailwind utilities (`p-4`)
- Note v4 changes: `border` no longer sets color (use `border-gray-200`), `ring` defaults to `ring-3`, opacity uses slash syntax (`bg-black/50`)

**Form pattern alignment:**
- Use React Hook Form + Zod with `zodResolver`
- Define schema with `z.object()`, derive type with `z.infer<typeof schema>`
- Use `Controller` for controlled components, `register` for native inputs
- Use `useWatch` not `watch` for reactive field values
- Use `FormProvider` when form fields are split across child components
- Set validation mode to `'onBlur'`

**API client alignment:**
- Access Token stored in-memory (module-level variable), NOT localStorage
- Refresh Token in httpOnly secure cookie (server-set)
- Token refresh uses queue pattern (single refresh, retry queued requests)
- Cross-tab sync via `BroadcastChannel`
- `ApiError` class with `status`, `code`, `message` properties

**React Router v7 alignment:**
- Code-based routes in `routes.ts` using `route()`, `layout()`, `index()`
- Use `+types/` auto-generated types for route params and loader data
- `clientLoader` only for `ensureQueryData` prefetching, never for runtime data
- All runtime data fetching via TanStack Query hooks in components
- Auth/guest/role guards via `layout()` route grouping
- URL state via nuqs, not custom `useSearchParams` wrappers

#### Infrastructure Refactoring Patterns

**Docker alignment:**
- Convert to multi-stage build (builder + runner stages)
- Switch to `alpine` or `slim` base image with pinned version
- Add non-root user (`adduser --system --uid 1001`)
- Remove secrets from `ENV`/`ARG`, use `--mount=type=secret`
- Add `.dockerignore` excluding `node_modules`, `.git`, `.env`, `dist`

**Terraform alignment:**
- Separate into `environments/{env}/` + `modules/` structure
- Add `type`, `description` to all variables
- Set `sensitive = true` on secret variables
- Configure remote state backend (S3 + DynamoDB)
- Apply resource naming: `snake_case` HCL names, no resource type repetition

**AWS resource naming:**
- Apply `{env}-{service}-{resource}-{identifier}` pattern
- Add required tags: `Environment`, `Service`, `ManagedBy`, `Team`
- Apply IAM least privilege (no `Action: *` policies)

### Step 5: Verify No Business Logic Changes

After all changes are applied, verify:

- [ ] All existing API endpoints still accept the same inputs
- [ ] All existing API endpoints still return the same outputs (except money type changes if applicable)
- [ ] Business rules and calculations produce the same results
- [ ] No new features or behaviors were introduced
- [ ] No existing features or behaviors were removed

If money fields changed from `number` to `string`, explicitly note this as an **intentional API contract change** required by convention.

### Step 6: Generate Summary Report

```
## Refactoring Summary

### Changes Applied
- [MUST] N violations fixed
- [SHOULD] N violations fixed
- [RECOMMEND] N violations fixed

### Files Modified
1. `file.ts` - Description of change
2. ...

### API Contract Changes
- List any input/output type changes

### Remaining Violations (not addressed)
- None / [List any skipped items with reason]
```

## Key Rules Summary

| Rule | Detail |
|------|--------|
| MUST | **Never change business logic** -- only structural/pattern changes |
| MUST | **Present plan before any changes** -- get user confirmation |
| MUST | **Apply incrementally** -- one convention rule at a time |
| MUST | Fix MUST violations before SHOULD, SHOULD before RECOMMEND |
| MUST | Verify behavior preservation after changes |
| MUST | Report any API contract changes explicitly |
| MUST NOT | Add new features or functionality during refactoring |
| MUST NOT | Remove existing features or functionality during refactoring |

## Cross-Skill References

- **Identify violations**: Use the `convention-code-review` skill to get a full violation report first
- **NestJS implementation details**: Use `nestjs-api-dev` for correct NestJS patterns
- **Entity/TypeORM patterns**: Use `typeorm-dev` for Entity refactoring details
- **Prisma schema/client patterns**: Use `prisma-dev` for Prisma-specific refactoring
- **Frontend UI patterns (Next.js)**: Use `nextjs-ui-dev` for correct component patterns
- **Frontend UI patterns (React)**: Use `react-ui-dev` for React + React Router component patterns
- **Data layer patterns (Next.js)**: Use `nextjs-data-provider` for query/state refactoring
- **Data layer patterns (React)**: Use `react-data-provider` for React Router query/state refactoring
- **Frontend orchestration (Next.js)**: Use `nextjs-dev-orchestration` for multi-step frontend work
- **Frontend orchestration (React)**: Use `react-dev-orchestration` for multi-step React frontend work
- **PR creation**: Use the `github-pr` skill to create a GitHub pull request
