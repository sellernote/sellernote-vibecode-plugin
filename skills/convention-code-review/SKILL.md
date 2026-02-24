---
name: convention-code-review
description: Review code changes against Sellernote development conventions. Use when reviewing git diffs, pull requests, or code changes for convention compliance. Triggers on tasks involving code review, convention checking, PR review, diff analysis, or compliance verification. Also use when asked to "코드 리뷰해줘", "컨벤션 체크해줘", "PR 리뷰해줘", "컨벤션 위반 찾아줘", "코드 검토해줘", "review my code", "check conventions", "review this PR", "check for convention violations", or any task requiring evaluation of code against Sellernote conventions. This skill is READ-ONLY -- it reports violations but does NOT modify files.
---

# Convention Code Review

Review code changes against Sellernote development conventions. This skill is **read-only** -- it identifies violations but does not modify code.

## Convention Loading

Conventions are loaded dynamically based on what files were changed. Before starting, determine which files are in scope, then Read the relevant reference files from `references/` within this skill directory.

### Loading Strategy

1. **Always read** (apply to all reviews):
   - `references/COMMON_CONVENTION.md` - Naming, git, error handling
   - `references/TYPESCRIPT_CONVENTION.md` - TS style, imports, types

2. **Read when backend files changed** (files in `src/modules/`, `src/common/`, `*.entity.ts`, `*.service.ts`, `*.controller.ts`, `*.repository.ts`, `*.dto.ts`, `*.guard.ts`):
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, DTO/Entity naming
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer responsibilities, forbidden patterns
   - `references/NESTJS_CONVENTION.md` - NestJS-specific rules, DI, decorators
   - `references/API_SPEC_CONVENTION.md` - Endpoint design, response formats
   - `references/SECURITY_CONVENTION.md` - Auth, guards, input validation
   - `references/TYPEORM_CONVENTION.md` - Entity patterns, relations, migrations
   - `references/DATABASE_CONVENTION.md` - DB modeling, indexing
   - `references/MYSQL_CONVENTION.md` - MySQL-specific rules

3. **Read when frontend files changed** (files in `app/`, `components/`, `hooks/`, `queries/`, `store/`, `actions/`, `*.tsx`, `*.stories.tsx`):
   - `references/FRONTEND_CONVENTION.md` - Frontend common rules
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Component types, dependency direction
   - `references/NEXTJS_CONVENTION.md` - App Router, Server/Client Components
   - `references/STATE_CONVENTION.md` - Zustand, TanStack Query, state classification
   - `references/STYLING_CONVENTION.md` - MUI v6, design tokens, responsive
   - `references/FORM_CONVENTION.md` - React Hook Form + Zod
   - `references/TESTING_CONVENTION.md` - Storybook, Jest, RTL, Playwright

## Workflow

### Step 1: Determine Review Scope

Identify what to review based on user request:

| User Request | Git Command |
|--------------|-------------|
| "staged 변경사항 리뷰해줘" | `git diff --cached` |
| "내 변경사항 리뷰해줘" | `git diff` (unstaged) + `git diff --cached` (staged) |
| "이 브랜치 리뷰해줘" / "PR 리뷰" | `git diff main..HEAD` |
| "이 파일 리뷰해줘" | Read the specified file(s) directly |
| "최근 커밋 리뷰해줘" | `git diff HEAD~1..HEAD` |

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
| `*.guard.ts`, `*.interceptor.ts` | Backend/Security | NESTJS, SECURITY |
| `*.module.ts` (NestJS) | Backend/Module | NESTJS |
| `*.migration.ts` | Database | DATABASE, MYSQL, TYPEORM |
| `app/**/*.tsx` | Frontend/Route | NEXTJS, FRONTEND_ARCHITECTURE |
| `components/ui/**` | Frontend/UI | FRONTEND_ARCHITECTURE, STYLING |
| `components/feature/**` | Frontend/Feature | FRONTEND_ARCHITECTURE, NEXTJS, STATE |
| `queries/**`, `hooks/**` | Frontend/Data | STATE, NEXTJS |
| `store/**` | Frontend/State | STATE |
| `actions/**` | Frontend/Actions | NEXTJS, STATE |
| `*.stories.tsx` | Frontend/Test | TESTING |
| `*.spec.ts`, `*.test.ts` | Testing | TESTING (frontend) or NESTJS (backend) |

Read the conventions determined by the changed file domains.

### Step 3: Analyze Violations

Review each changed file against loaded conventions. Check these categories:

#### Backend Checks

**Architecture (BACKEND_ARCHITECTURE_CONVENTION)**
- [ ] Controller contains only HTTP handling (no business logic, no direct DB access)
- [ ] Service contains all business logic (no HTTP concepts like Request/Response)
- [ ] Repository contains only data access (no business logic, no HTTP concepts)
- [ ] Dependency direction: Controller -> Service -> Repository (no reverse)

**NestJS Patterns (NESTJS_CONVENTION)**
- [ ] DTOs use `@sellernote/sellernote-nestjs-api-property` (never raw `@ApiProperty`, `class-validator`, `class-transformer`)
- [ ] Money fields: `string` type + `@SellernoteApiDecimal` (never `number`)
- [ ] Money arithmetic: `big.js` in Service layer (never native `number` arithmetic)
- [ ] Transaction management: `@Transactional()` (never raw `QueryRunner`)
- [ ] Every endpoint has `@ApiOperation` and `@ApiResponse`

**TypeORM/Entity (TYPEORM_CONVENTION)**
- [ ] Entity extends custom `BaseEntity` (not TypeORM's)
- [ ] Relations use `Relation<T>` type wrapper
- [ ] Enum columns use `varchar` (not MySQL `enum` type)
- [ ] Decimal columns have `DecimalTransformer`
- [ ] Domain Model Interface (`I{Feature}Model`) exists and Entity implements it

**API Design (API_SPEC_CONVENTION)**
- [ ] Response format: `{ success, data, error }`
- [ ] Pagination follows convention pattern
- [ ] Bulk operations follow convention pattern

**Security (SECURITY_CONVENTION)**
- [ ] Auth guards applied where needed
- [ ] Input validated via DTOs (no manual validation)
- [ ] No SQL injection vectors (parameterized queries only)

#### Frontend Checks

**Architecture (FRONTEND_ARCHITECTURE_CONVENTION)**
- [ ] Component type matches location (UI in `components/ui/`, Feature in `components/feature/`)
- [ ] Dependency direction: Page -> Feature -> UI (no reverse imports)
- [ ] UI components depend only on props (no store, query, or hook imports)
- [ ] `app/` contains only route files (no components, hooks, stores)

**Next.js (NEXTJS_CONVENTION)**
- [ ] `page.tsx` is Server Component (no `'use client'`, no business logic)
- [ ] `'use client'` only at leaf/Feature components (not on Page or Layout)
- [ ] `loading.tsx` uses MUI `Skeleton` (not spinners)
- [ ] `error.tsx` has `'use client'` directive
- [ ] All imports use `@/` absolute paths

**State Management (STATE_CONVENTION)**
- [ ] Server state in TanStack Query (not duplicated in Zustand)
- [ ] Client state in Zustand (UI toggles, filters, selections)
- [ ] Query key factory pattern used (`{feature}Keys`)

**Styling (STYLING_CONVENTION)**
- [ ] Uses MUI theme tokens (no hex hardcoding)
- [ ] Priority: Theme overrides > `styled()` > `sx` prop
- [ ] Responsive using MUI breakpoints (no raw media queries)

**Forms (FORM_CONVENTION)**
- [ ] React Hook Form + Zod combination
- [ ] Zod schema validates all fields

#### Common Checks

**TypeScript (TYPESCRIPT_CONVENTION)**
- [ ] No `any` type (use `unknown` if needed)
- [ ] Import order follows convention
- [ ] Proper naming: PascalCase (classes/interfaces/types), camelCase (variables/functions)

**Common (COMMON_CONVENTION)**
- [ ] Error handling follows convention patterns
- [ ] Naming conventions followed

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

### `components/feature/Order/OrderList.tsx`

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

> "위반사항을 수정하시겠습니까? `convention-refactor` skill을 사용하여 자동으로 수정할 수 있습니다."

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
- **Frontend implementation**: Use `nextjs-ui-dev` for component patterns
- **Data layer**: Use `nextjs-data-provider` for query/state patterns
