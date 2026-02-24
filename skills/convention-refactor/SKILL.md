---
name: convention-refactor
description: Refactor existing code to comply with Sellernote development conventions. Use when transforming code to match convention patterns without changing business logic. Triggers on tasks involving convention compliance refactoring, pattern migration, code structure alignment, or legacy code modernization. Also use when asked to "컨벤션에 맞게 리팩토링해줘", "convention 맞춰줘", "패턴 적용해줘", "구조 리팩토링해줘", "컨벤션 수정해줘", "아키텍처 맞춰줘", "refactor to match conventions", "apply convention patterns", "fix convention violations", "align with architecture", or any task requiring structural changes to existing code to comply with Sellernote conventions.
---

# Convention Refactor

Refactor existing code to comply with Sellernote conventions. Changes are **structural/pattern-only** -- business logic must remain unchanged.

## Convention Loading

Conventions are loaded dynamically based on the target files. Before starting, Read the relevant reference files from `references/` within this skill directory.

### Loading Strategy

1. **Always read** (apply to all refactoring):
   - `references/COMMON_CONVENTION.md` - Naming, error handling
   - `references/TYPESCRIPT_CONVENTION.md` - TS style, imports, types

2. **Read when refactoring backend files**:
   - `references/BACKEND_CONVENTION.md` - 3-layer architecture, naming
   - `references/BACKEND_ARCHITECTURE_CONVENTION.md` - Layer responsibilities
   - `references/NESTJS_CONVENTION.md` - NestJS patterns, decorators
   - `references/API_SPEC_CONVENTION.md` - Endpoint design
   - `references/SECURITY_CONVENTION.md` - Auth, guards
   - `references/TYPEORM_CONVENTION.md` - Entity patterns
   - `references/DATABASE_CONVENTION.md` - DB modeling
   - `references/MYSQL_CONVENTION.md` - MySQL-specific rules

3. **Read when refactoring frontend files**:
   - `references/FRONTEND_CONVENTION.md` - Frontend common rules
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Component types
   - `references/NEXTJS_CONVENTION.md` - App Router patterns
   - `references/STATE_CONVENTION.md` - State management
   - `references/STYLING_CONVENTION.md` - MUI theming
   - `references/FORM_CONVENTION.md` - Form patterns
   - `references/TESTING_CONVENTION.md` - Test patterns

## Workflow

### Step 1: Determine Refactoring Scope

Identify what needs refactoring from one of these sources:

| Source | How to Identify |
|--------|-----------------|
| **convention-code-review output** | User pastes or references a review report |
| **Specific files** | User points to file(s) or directory |
| **Specific rule** | User names a convention rule to apply |
| **Entire module** | User asks to align a module with conventions |

List all files that will be touched and classify them (backend/frontend/common).

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

#### 3. [MUST] Change money fields from number to string + big.js
   - Files: `create-order.dto.ts`, `order.service.ts`, `order-response.dto.ts`
   - Current: `totalAmount: number` with native arithmetic
   - Change: `totalAmount: string` + `@SellernoteApiDecimal` + `big.js` arithmetic
   - Impact: API contract change (number -> string for money fields)

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
```
Before: Controller contains business logic
After:  Controller delegates to Service; logic moved to Service method
```
- Move calculation, validation, and data transformation logic to Service
- Keep only HTTP concerns (parameter extraction, response mapping) in Controller

**Service -> Repository extraction:**
```
Before: Service contains raw QueryBuilder or TypeORM repository calls
After:  Service calls Repository methods; queries moved to Repository
```
- Move `createQueryBuilder()`, `find()`, `findOne()` chains to Repository
- Service calls named Repository methods instead

**QueryRunner -> @Transactional():**
```
Before: Manual QueryRunner with try/catch/finally
After:  @Transactional() decorator on Service method
```
- Remove QueryRunner injection and manual transaction management
- Add `@Transactional()` decorator to the Service method
- Remove `try { await queryRunner.startTransaction() }` pattern

**number -> big.js for money:**
```
Before: totalAmount: number; total = price * quantity;
After:  totalAmount: string; total = new Big(price).times(quantity).toFixed(2);
```
- Change type from `number` to `string` in DTOs and interfaces
- Replace `@SellernoteApiNumber` with `@SellernoteApiDecimal` in DTOs
- Replace native arithmetic with `big.js` operations in Service
- Add `DecimalTransformer` to Entity column if applicable

**@ApiProperty -> @SellernoteApi*:**
```
Before: @ApiProperty() + @IsString() + @IsNotEmpty()
After:  @SellernoteApiString({ description: '...', isRequired: true })
```
- Replace all `@ApiProperty`, `@IsString`, `@IsNumber`, etc.
- Use corresponding `@SellernoteApi*` decorator
- Move validation config into decorator options

**Entity convention alignment:**
```
Before: Entity with raw TypeORM BaseEntity, native enum, no Relation<>
After:  Custom BaseEntity, varchar enum, Relation<T> wrapper
```
- Change `extends BaseEntity` to custom BaseEntity from `@/common/entities/base.entity`
- Change `@Column({ type: 'enum', enum: Status })` to `@Column({ type: 'varchar', length: 50 })`
- Wrap relation types: `user: User` -> `user: Relation<User>`
- Add `DecimalTransformer` to decimal columns

#### Frontend Refactoring Patterns

**Component type-location alignment:**
```
Before: Business logic component in components/ui/
After:  Moved to components/feature/ with 'use client'
```
- Move components that use hooks/store/queries to `components/feature/`
- Keep pure presentational components in `components/ui/`

**Dependency direction fix:**
```
Before: UI component imports from store/queries
After:  UI component receives data via props; Feature component provides data
```
- Extract store/query usage into parent Feature component
- Pass data down as props to UI component

**'use client' placement:**
```
Before: 'use client' on page.tsx or layout component
After:  'use client' only on leaf Feature components
```
- Remove `'use client'` from `page.tsx` and layout files
- Add `'use client'` to Feature components that use client-side hooks

**Theme token application:**
```
Before: sx={{ color: '#1976d2', padding: '16px' }}
After:  sx={{ color: 'primary.main', p: 2 }}
```
- Replace hex colors with theme palette references
- Replace px values with theme spacing units

**Query pattern alignment:**
```
Before: useEffect + fetch for data loading
After:  TanStack Query hook with query-key-factory
```
- Create query key factory in `queries/queryKeys/`
- Create custom query hook using `useQuery()`
- Remove manual `useEffect` + `useState` data fetching pattern

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
- [MUST] 3 violations fixed
- [SHOULD] 2 violations fixed
- [RECOMMEND] 1 violation fixed

### Files Modified
1. `order.controller.ts` - Extracted business logic to Service
2. `order.service.ts` - Added big.js for money, @Transactional()
3. `create-order.dto.ts` - Replaced @ApiProperty with @SellernoteApi*
4. `order.entity.ts` - Added Relation<>, DecimalTransformer

### API Contract Changes
- `POST /orders` body: `totalAmount` changed from `number` to `string`
- `GET /orders/:id` response: `totalAmount` changed from `number` to `string`

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
- **Frontend UI patterns**: Use `nextjs-ui-dev` for correct component patterns
- **Data layer patterns**: Use `nextjs-data-provider` for query/state refactoring
