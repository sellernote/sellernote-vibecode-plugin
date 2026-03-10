---
name: convention-code-review
description: Review code changes against Sellernote development conventions. Use when reviewing git diffs, pull requests, or code changes for convention compliance. Triggers on tasks involving code review, convention checking, PR review, diff analysis, or compliance verification. Also use when asked to "review my code", "check conventions", "review this PR", "check for convention violations", "find convention issues", or any task requiring evaluation of code against Sellernote conventions. This skill is READ-ONLY -- it reports violations but does NOT modify files.
---

# Convention Code Review

Review code changes against Sellernote development conventions. This skill is **read-only** -- it identifies violations but does not modify code.

## Convention Loading

Conventions are loaded dynamically based on what files were changed. Before starting, determine which files are in scope, then Read the relevant reference files from `references/` within this skill directory.

### Loading Strategy

1. **Always read** (apply to all reviews):
   - `references/COMMON_CONVENTION.md` - Naming, git, error handling, enum patterns
   - `references/TYPESCRIPT_CONVENTION.md` - TS strict mode, imports, types, naming

2. **Read when backend NestJS files changed** (files in `src/modules/`, `src/common/`, `*.entity.ts`, `*.service.ts`, `*.controller.ts`, `*.repository.ts`, `*.dto.ts`, `*.guard.ts`, `*.module.ts`, `*.interceptor.ts`, `*.filter.ts`, `*.pipe.ts`):
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, DTO/Entity naming
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer responsibilities, forbidden patterns
   - `references/NESTJS_CONVENTION.md` - NestJS-specific rules, DI, decorators, Domain Model Interface
   - `references/API_SPEC_CONVENTION.md` - Endpoint design, response formats
   - `references/SECURITY_CONVENTION.md` - Auth, guards, input validation

3. **Read when ORM/DB files changed** (`*.entity.ts`, `*.repository.ts`, `*.migration.ts`, `schema.prisma`, `*.prisma`, `prisma/**`):
   - `references/TYPEORM_CONVENTION.md` - Entity patterns, relations, migrations, DecimalTransformer
   - `references/DATABASE_CONVENTION.md` - DB modeling, indexing, naming
   - `references/MYSQL_CONVENTION.md` - MySQL-specific rules
   - `references/PRISMA_CONVENTION.md` - Prisma schema, client patterns, NestJS integration

4. **Read when frontend React Router files changed** (files in `app/routes/`, `app/features/`, `app/components/`, `*.tsx`, `*.css`, `app/root.tsx`, `app/routes.ts`):
   - `references/FRONTEND_CONVENTION.md` - Frontend common rules
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Features directory structure, dependency direction
   - `references/REACT_CONVENTION.md` - React 19 patterns, Hooks rules, Error Boundary, Context API
   - `references/REACT_ROUTER_CONVENTION.md` - React Router 7 Framework Mode (ssr:false), route modules, loader/clientLoader
   - `references/STATE_CONVENTION.md` - Zustand, TanStack Query, nuqs URL state, query-options.ts
   - `references/STYLING_CONVENTION.md` - Tailwind CSS v4, cn(), design tokens
   - `references/FORM_CONVENTION.md` - React Hook Form + Zod
   - `references/TESTING_CONVENTION.md` - Storybook, Vitest, RTL, Playwright
   - `references/API_CLIENT_CONVENTION.md` - API client common rules, token management
   - `references/API_CLIENT_AXIOS_CONVENTION.md` - Axios implementation, interceptors

5. **Read when frontend Next.js files changed** (files in `app/`, `components/`, `hooks/`, `queries/`, `store/`, `actions/`, `*.tsx`, `next.config.*`):
   - Same as group 4 above, but replace `REACT_ROUTER_CONVENTION.md` with `references/NEXTJS_CONVENTION.md`

6. **Read when Spring Boot files changed** (`*.java`, `pom.xml`, `build.gradle`, `application*.yml`, `application*.properties`):
   - `references/SPRING_CONVENTION.md` - Spring Boot patterns, DI, transactions, profiles
   - `references/BACKEND_CONVENTION.md`, `references/BACKEND_ARCHITECTURE_CONVENTION.md`
   - `references/SECURITY_CONVENTION.md`, `references/API_SPEC_CONVENTION.md`

7. **Read when infrastructure files changed** (`Dockerfile*`, `docker-compose*`, `*.tf`, `*.tfvars`, `Pulumi.*`, `infra/**`):
   - `references/INFRASTRUCTURE_CONVENTION.md` - IaC common principles
   - `references/DOCKER_CONVENTION.md` - Multi-stage builds, security, compose
   - `references/TERRAFORM_CONVENTION.md` - Module strategy, state management, naming
   - `references/PULUMI_CONVENTION.md` - ComponentResource, Output handling, stack management
   - `references/AWS_CONVENTION.md` - AWS naming, tagging, security

8. **Read when monorepo config changed** (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig*.json`, workspace config files):
   - `references/MONOREPO_CONVENTION.md` - Workspace structure, dependency direction, shared packages

## Workflow

### Step 1: Determine Review Scope

Identify what to review based on user request:

| User Request | Git Command |
|--------------|-------------|
| "Review staged changes" | `git diff --cached` |
| "Review my changes" | `git diff` (unstaged) + `git diff --cached` (staged) |
| "Review this branch" / "PR review" | `git diff main..HEAD` |
| "Review this file" | Read the specified file(s) directly |
| "Review recent commit" | `git diff HEAD~1..HEAD` |

Run the appropriate `git diff` command to get the changes, then list all changed files.

### Step 2: Classify Changed Files

Map each changed file to its domain to determine which conventions to load:

| File Pattern | Domain | Conventions to Load |
|--------------|--------|---------------------|
| `*.entity.ts` | Backend/TypeORM | BACKEND, TYPEORM, DATABASE |
| `*.service.ts` | Backend/Service | BACKEND, BACKEND_ARCHITECTURE, NESTJS |
| `*.controller.ts` | Backend/Controller | BACKEND, BACKEND_ARCHITECTURE, NESTJS, API_SPEC |
| `*.repository.ts` | Backend/Repository | BACKEND, BACKEND_ARCHITECTURE, TYPEORM |
| `*.dto.ts` | Backend/DTO | BACKEND, NESTJS, API_SPEC |
| `*.guard.ts`, `*.interceptor.ts`, `*.filter.ts` | Backend/Security | NESTJS, SECURITY |
| `*.module.ts` (NestJS) | Backend/Module | NESTJS |
| `*.migration.ts` | Database | DATABASE, MYSQL, TYPEORM |
| `*.prisma`, `schema.prisma` | Backend/Prisma | PRISMA, DATABASE |
| `prisma.service.ts`, `prisma.module.ts` | Backend/Prisma | PRISMA, NESTJS |
| `prisma-exception.filter.ts` | Backend/Prisma | PRISMA, NESTJS |
| `prisma/migrations/**` | Database/Prisma | PRISMA, DATABASE, MYSQL |
| `app/features/**/*.tsx` | Frontend/Feature | FRONTEND_ARCHITECTURE, STATE, REACT |
| `app/features/_common/**` | Frontend/Shared | FRONTEND_ARCHITECTURE, STATE |
| `app/routes/**/*.tsx` | Frontend/Route | REACT_ROUTER, FRONTEND_ARCHITECTURE |
| `app/routes.ts` | Frontend/Route Config | REACT_ROUTER |
| `app/components/ui/**` | Frontend/UI | FRONTEND_ARCHITECTURE, STYLING |
| `**/query-options.ts` | Frontend/Data | STATE, API_CLIENT |
| `**/hooks/**` | Frontend/Hooks | STATE, REACT |
| `store/**` | Frontend/State | STATE |
| `lib/api*.ts` | Frontend/API | API_CLIENT, API_CLIENT_AXIOS |
| `*.stories.tsx` | Frontend/Test | TESTING |
| `*.spec.ts`, `*.test.ts` | Testing | TESTING (frontend) or NESTJS (backend) |
| `*.java` | Backend/Spring | SPRING, BACKEND_ARCHITECTURE |
| `Dockerfile*`, `docker-compose*` | Infra/Docker | DOCKER, INFRASTRUCTURE |
| `*.tf`, `*.tfvars` | Infra/Terraform | TERRAFORM, INFRASTRUCTURE |
| `Pulumi.*`, `infra/**/*.ts` (Pulumi) | Infra/Pulumi | PULUMI, INFRASTRUCTURE |
| `pnpm-workspace.yaml`, `turbo.json` | Monorepo | MONOREPO |

Read the conventions determined by the changed file domains.

### Step 3: Analyze Violations

Review each changed file against loaded conventions. Check these categories:

#### Backend Checks (NestJS)

**Architecture (BACKEND_ARCHITECTURE_CONVENTION)**
- [ ] Controller contains only HTTP handling (no business logic, no direct DB access)
- [ ] Service contains all business logic (no HTTP concepts like Request/Response)
- [ ] Repository contains only data access (no business logic, no HTTP concepts)
- [ ] Dependency direction: Controller -> Service -> Repository (no reverse)

**NestJS Patterns (NESTJS_CONVENTION)**
- [ ] DTOs use `@sellernote/sellernote-nestjs-api-property` (never raw `@ApiProperty`, `class-validator`, `class-transformer`)
- [ ] Money fields: `string` type + `@SellernoteApiDecimal` (never `number`)
- [ ] Money arithmetic: `big.js` in Service layer (never native `number` arithmetic)
- [ ] Transaction management: `@Transactional()` from `typeorm-transactional` (never raw `QueryRunner`)
- [ ] Every endpoint has `@ApiOperation` and `@ApiResponse`
- [ ] Domain Model Interface (`I{Feature}Model`) defines domain model, Entity implements it
- [ ] DTO property decorators use library's combined API (validation + swagger + transformation in one)

**TypeORM/Entity (TYPEORM_CONVENTION)**
- [ ] Entity extends custom `BaseEntity` (not TypeORM's)
- [ ] Relations use `Relation<T>` type wrapper
- [ ] Enum columns use `varchar` (not MySQL `enum` type)
- [ ] Decimal columns have `DecimalTransformer`
- [ ] Uses `SnakeNamingStrategy` in DataSource config
- [ ] Entity implements Domain Model Interface (`I{Feature}Model`)

**Prisma (PRISMA_CONVENTION)**
- [ ] All models have common fields (id, no, createdAt, updatedAt, deletedAt)
- [ ] All fields have `@db.*` native type annotations (except BigInt)
- [ ] Models use `@@map("snake_case")` for table names
- [ ] Fields use `@map("snake_case")` for column names
- [ ] FK fields have `@@index()` defined
- [ ] M:N relations use explicit join model (no implicit many-to-many)
- [ ] Enum values are lowercase snake_case
- [ ] PrismaService extends PrismaClient with OnModuleInit/OnModuleDestroy
- [ ] PrismaModule uses @Global() decorator
- [ ] No `$queryRawUnsafe` with user input interpolation
- [ ] No `Promise.all` inside Interactive Transaction
- [ ] findUnique used for PK/@unique lookups (not findFirst)

**API Design (API_SPEC_CONVENTION)**
- [ ] Response format: `{ success, data, error }`
- [ ] Pagination follows convention pattern
- [ ] Bulk operations follow convention pattern

**Security (SECURITY_CONVENTION)**
- [ ] Auth guards applied where needed
- [ ] Input validated via DTOs (no manual validation)
- [ ] No SQL injection vectors (parameterized queries only)

#### Backend Checks (Spring Boot)

**Spring Patterns (SPRING_CONVENTION)**
- [ ] Constructor injection via `@RequiredArgsConstructor` (no `@Autowired` field injection)
- [ ] `@Transactional(readOnly = true)` at class level, `@Transactional` on mutation methods
- [ ] No `@Transactional` on `private` methods
- [ ] No self-invocation of `@Transactional` methods within same class
- [ ] External API calls / file I/O outside transaction scope
- [ ] Global exception handling via `@RestControllerAdvice`
- [ ] Environment config separated by Spring Profiles
- [ ] Sensitive info via environment variables (not hardcoded in config files)

#### Frontend Checks

**Architecture (FRONTEND_ARCHITECTURE_CONVENTION)**
- [ ] Features directory structure: `features/{domain}/` for domain-specific code
- [ ] Shared domain code in `features/_common/{domain}/`
- [ ] Dependency direction: Route -> Feature -> UI (no reverse imports)
- [ ] UI components depend only on props (no store, query, or hook imports)
- [ ] No barrel files (`index.ts`) for re-exports

**React Router 7 (REACT_ROUTER_CONVENTION)** (when using React Router)
- [ ] Framework Mode with `ssr: false` in `react-router.config.ts`
- [ ] Route modules export only: `meta`, `clientLoader`, `clientAction`, `default`, `ErrorBoundary`, `HydrateFallback`
- [ ] No `loader`/`action` exports (SSR-only; use `clientLoader`/`clientAction` with `ssr:false`)
- [ ] No `headers`/`handle` exports in route modules
- [ ] Route config in `app/routes.ts` using `flatRoutes` or helpers
- [ ] `clientLoader`/`clientAction` do NOT access `request.formData()` directly (use `data` from `submission`)
- [ ] Links use `<Link>`, `<NavLink>` components (not `<a>` tags)
- [ ] SSR-unsafe APIs (`window`, `localStorage`) used only in `clientLoader`/`clientAction` or behind `typeof window` checks

**Next.js (NEXTJS_CONVENTION)** (when using Next.js)
- [ ] `page.tsx` is Server Component (no `'use client'`, no business logic)
- [ ] `'use client'` only at leaf/Feature components (not on Page or Layout)
- [ ] `loading.tsx` uses Skeleton component (not spinners)
- [ ] `error.tsx` has `'use client'` directive
- [ ] All imports use `@/` absolute paths

**State Management (STATE_CONVENTION)**
- [ ] Server state in TanStack Query (not duplicated in Zustand)
- [ ] Client state in Zustand (UI toggles, filters, selections)
- [ ] URL state with `nuqs` (search params, filters, pagination) -- not Zustand/useState
- [ ] Query options defined in `query-options.ts` files using `queryOptions()` factory
- [ ] Query key factory pattern used (`{feature}Keys`)
- [ ] No barrel files (`index.ts`) for re-exports

**React Patterns (REACT_CONVENTION)**
- [ ] Compound Component pattern used for related component groups
- [ ] No number directly on left side of `&&` in conditional rendering
- [ ] List keys use unique IDs (not array index)
- [ ] useEffect used only for external system sync (not derived state or event handling)
- [ ] useEffect has cleanup function when using subscriptions/timers
- [ ] No `forwardRef` in new code (React 19: ref as direct prop)
- [ ] No manual `useMemo`/`useCallback` with React Compiler enabled
- [ ] Error Boundary fallback has recovery mechanism
- [ ] Context split by concern (not one mega-context)
- [ ] `ComponentPropsWithoutRef`/`ComponentPropsWithRef` used for HTML wrapping components
- [ ] Local storage accessed via `SafeStorage` utility (not raw `localStorage`)

**Styling (STYLING_CONVENTION)**
- [ ] Uses design tokens (no hex hardcoding)
- [ ] Priority: DS components > Tailwind utilities > cn() conditional
- [ ] Responsive using Tailwind breakpoints

**Forms (FORM_CONVENTION)**
- [ ] React Hook Form + Zod combination
- [ ] Zod schema validates all fields

#### Infrastructure Checks

**Docker (DOCKER_CONVENTION)**
- [ ] Production Dockerfiles use multi-stage builds
- [ ] Base images use `alpine` or `slim` variants with pinned versions
- [ ] Containers run as non-root user (`USER` directive)
- [ ] No secrets in `ENV` or `ARG` instructions
- [ ] `.dockerignore` exists and excludes `node_modules`, `.git`, `.env`
- [ ] No `latest` tag for production images
- [ ] Docker Compose: no `version:` field (deprecated), healthchecks on dependent services

**Terraform (TERRAFORM_CONVENTION)**
- [ ] Remote state backend (S3 + DynamoDB) with encryption and locking
- [ ] State separated by environment
- [ ] All variables have `type` and `description`
- [ ] Sensitive variables marked `sensitive = true`
- [ ] No hardcoded environment-specific values (use variables)
- [ ] Module versions pinned for external modules

**Pulumi (PULUMI_CONVENTION)**
- [ ] Resource names follow `{environment}-{service}-{resourceType}` pattern
- [ ] All resources tagged: `Environment`, `Service`, `ManagedBy`
- [ ] Secrets use `pulumi config set --secret` and `config.requireSecret()`
- [ ] Output values use `pulumi.interpolate` (no `.get()` synchronous access)
- [ ] Component Resources: `{ parent: this }` on children, `registerOutputs()` called
- [ ] Secret outputs wrapped with `pulumi.secret()`

**AWS (AWS_CONVENTION)**
- [ ] All resources tagged with required tags
- [ ] IAM follows least privilege principle
- [ ] No hardcoded credentials or access keys

#### Common Checks

**TypeScript (TYPESCRIPT_CONVENTION)**
- [ ] No `any` type (use `unknown` if needed)
- [ ] Import order follows convention
- [ ] Proper naming: PascalCase (classes/interfaces/types), camelCase (variables/functions)

**Common (COMMON_CONVENTION)**
- [ ] Enum keys PascalCase, values lowercase snake_case
- [ ] Conventional Commits format for git messages
- [ ] Error handling follows convention patterns

**Monorepo (MONOREPO_CONVENTION)**
- [ ] Dependency direction: Application packages -> Library packages (never reverse)
- [ ] Shared code in dedicated library packages (not cross-app imports)
- [ ] Workspace dependencies use `workspace:*` protocol

### Step 4: Generate Report

Output the review report grouped by file, with violations sorted by severity:

```
## Convention Review Report

### Summary
- Files reviewed: N
- Violations found: N (MUST: N, SHOULD: N, RECOMMEND: N)

---

### `src/modules/order/order.service.ts`

🔴 **[MUST]** Money arithmetic uses native `number` instead of `big.js`
   - Line 45: `const total = price * quantity`
   - Convention: NESTJS_CONVENTION > Money handling
   - Fix: `const total = new Big(price).times(quantity).toFixed(2)`

🟡 **[SHOULD]** Missing `@Transactional()` on multi-step DB operation
   - Line 72-85: `create()` method calls repository twice without transaction
   - Convention: BACKEND_ARCHITECTURE_CONVENTION > Transaction management

🔵 **[RECOMMEND]** Consider extracting complex query logic to Repository
   - Line 30-42: QueryBuilder chain in Service layer
   - Convention: BACKEND_ARCHITECTURE_CONVENTION > Layer responsibilities

---

### `app/features/order/components/OrderList.tsx`

🔴 **[MUST]** UI component imports from store directly
   - Line 3: `import { useOrderStore } from '@/store/orderStore'`
   - Convention: FRONTEND_ARCHITECTURE_CONVENTION > Component dependency rules
   - Fix: Move store usage to a Feature component or pass data via props

...
```

Severity levels:
- 🔴 **[MUST]** - Convention violation that must be fixed (breaks architecture rules)
- 🟡 **[SHOULD]** - Strong recommendation (improves code quality significantly)
- 🔵 **[RECOMMEND]** - Nice to have (follows best practices)

### Step 5: Offer Fix Suggestions

After presenting the report, ask the user:

> "Would you like to fix the violations? You can use the `convention-refactor` skill to automatically apply fixes."

This skill does NOT modify files. For applying fixes, delegate to `convention-refactor`.

## Key Rules Summary

| Rule | Detail |
|------|--------|
| MUST | This skill is READ-ONLY -- never modify files |
| MUST | Load conventions dynamically based on changed file types |
| MUST | Check all applicable convention rules for each file |
| MUST | Report violations with severity (MUST/SHOULD/RECOMMEND) |
| MUST | Include specific line numbers and convention references |
| MUST | Suggest concrete fixes for each violation |

## Cross-Skill References

- **Apply fixes**: Use the `convention-refactor` skill to automatically fix reported violations
- **Backend implementation**: Use `nestjs-api-dev` for NestJS patterns
- **Entity patterns**: Use `typeorm-dev` for TypeORM conventions
- **Prisma patterns**: Use `prisma-dev` for Prisma schema, client patterns, and NestJS integration
- **Frontend UI**: Use `nextjs-ui-dev` or `react-ui-dev` for component patterns
- **Frontend data layer**: Use `nextjs-data-provider` or `react-data-provider` for query/state patterns
- **Frontend orchestration**: Use `nextjs-dev-orchestration` or `react-dev-orchestration` for full-stack features
- **Project scaffolding**: Use `project-scaffold` for new project setup
