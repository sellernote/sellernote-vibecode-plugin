---
name: nextjs-dev-orchestration
description: Orchestrate full Next.js feature and page development by coordinating data layer and UI layer skills. Use when asked to develop a complete feature, create a new page, or build end-to-end Next.js functionality. Triggers include requests like "새 페이지 만들어줘", "기능 개발해줘", "새 기능 추가해줘", "페이지 구현해줘", "develop new feature", "create new page", "build a feature", "implement a page", or any task requiring both data layer (queries, mutations, stores) and UI layer (components, forms, stories) to be created together in a Next.js App Router project.
---

# Next.js Dev Orchestration

Orchestrate full Next.js feature development by analyzing requirements, designing architecture, and delegating to specialized sub-skills for data and UI layers.

## Convention Loading

Before starting, read from `references/` within this skill directory:

1. **Always**: `references/FRONTEND_ARCHITECTURE_CONVENTION.md`, `references/NEXTJS_CONVENTION.md`
2. **When relevant**: `references/FRONTEND_CONVENTION.md`

## Orchestration Workflow

### Step 1: Analyze Requirements

1. Identify feature scope (page, CRUD feature, dashboard section, form, etc.)
2. List data entities and user interactions
3. Determine route structure (URL paths, route groups, dynamic segments)
4. Check auth/middleware requirements

### Step 2: Design Component Tree

Design the hierarchy following **Page -> Feature -> UI** dependency direction.

```
app/(group)/feature-name/
  page.tsx              <- Server Component, composes Feature components
  loading.tsx           <- Skeleton UI
  error.tsx             <- 'use client', error boundary

components/feature/FeatureName/
  FeatureName.tsx       <- 'use client', business logic, uses hooks/store/queries
  FeatureNameForm.tsx   <- 'use client', form handling
  index.ts

components/ui/
  (reusable UI components used by Feature components)
```

Sellernote-specific rules:
- `app/` contains only route files -- no components, hooks, or stores
- `page.tsx` is a Server Component that only composes Feature/UI components (no business logic)
- Feature components live in `components/feature/` and contain all business logic
- UI components in `components/ui/` depend only on props (never on store/queries/hooks)

### Step 3: Plan Data Layer

| Category | Items to Identify |
|----------|-------------------|
| Queries | List queries (GET), detail queries (GET by ID), search/filter queries |
| Mutations | Create, update, delete operations via Server Actions |
| Client State | UI state (filters, modals, selections) via Zustand stores |
| Server State | TanStack Query hooks for client-side data fetching/caching |
| Types | Shared TypeScript interfaces and Zod schemas |

For each query/mutation, note the API endpoint, query key structure, and cache invalidation strategy.

### Step 4: Delegate to nextjs-data-provider Skill

Invoke the `nextjs-data-provider` skill with this handoff template:

```
Use the nextjs-data-provider skill to implement the data layer for [feature name]:

1. Queries needed:
   - [List each query with endpoint, params, and query key]

2. Mutations needed (Server Actions):
   - [List each mutation with action name, params, and revalidation targets]

3. Zustand store:
   - [List client state slices with their state shape and actions]

4. Types/Schemas:
   - [List shared types and Zod validation schemas]

Files to create:
- queries/use{Feature}Query.ts
- queries/use{Feature}ListQuery.ts
- actions/{feature}.ts
- store/slices/{feature}Slice.ts
- types/{Feature}.types.ts
- schemas/{feature}Schema.ts
```

Wait for the data layer to be fully implemented before proceeding.

### Step 5: Plan UI Layer

| Component Type | Location | Examples |
|----------------|----------|----------|
| UI components | `components/ui/` | DataTable, StatusBadge, ConfirmDialog |
| Feature components | `components/feature/` | OrderList, OrderForm, OrderDetail |
| Layout components | `components/layout/` | PageLayout, SectionHeader |

For each component, note: props interface, `'use client'` need, data hooks consumed, Storybook requirements.

### Step 6: Delegate to nextjs-ui-dev Skill

Invoke the `nextjs-ui-dev` skill with this handoff template:

```
Use the nextjs-ui-dev skill to implement the UI for [feature name]:

1. UI components to create:
   - [List each component with props interface and Storybook requirements]

2. Feature components to create:
   - [List each component with the data hooks/stores it uses]

3. Form components (if any):
   - [List forms with fields, Zod schema reference, and submission action]

4. Data hooks available (from data layer):
   - [List implemented query hooks, mutation hooks, and store hooks]

Files to create:
- components/ui/{Component}/{Component}.tsx
- components/ui/{Component}/{Component}.stories.tsx
- components/ui/{Component}/index.ts
- components/feature/{Feature}/{Feature}.tsx
- components/feature/{Feature}/{Feature}.test.tsx
- components/feature/{Feature}/index.ts
```

### Step 7: Configure Routing

After data and UI layers are implemented, wire everything in App Router.

Sellernote-specific routing notes:
- `page.tsx`: Server Component only -- import and compose, no business logic, use `@/` paths
- `loading.tsx`: Use MUI `Skeleton` matching page layout structure (not spinners)
- `error.tsx`: Must have `'use client'`; Korean error messages; never expose stack traces
- `layout.tsx`: Create for route groups needing shared layout (sidebar, breadcrumbs)
- `middleware.ts`: Always define `matcher` config; never run on `_next/` or static paths

### Step 8: Integration Verification

Verify the completed feature against these checks:

- [ ] `app/` has only route files; all business logic in `components/feature/`
- [ ] Dependency direction: Page -> Feature -> UI (no reverse imports)
- [ ] `'use client'` only at leaf nodes (Feature components), not on Page/Layout
- [ ] All imports use `@/` absolute paths
- [ ] Data layer complete: query hooks, server actions, Zustand store, Zod schemas
- [ ] UI layer complete: Storybook stories for UI components, tests for Feature components
- [ ] Route files present: `loading.tsx` (skeleton), `error.tsx` (`'use client'`)
- [ ] Server Components as default; heavy components use `dynamic()` import
- [ ] Independent data sections wrapped in `<Suspense>` boundaries

## Key Rules Summary

| Rule | Detail |
|------|--------|
| MUST | `app/` for route files only; business logic in `components/`, `hooks/`, `store/`, `queries/` |
| MUST | Server Components as default; `'use client'` at leaf nodes only |
| MUST | Dependency direction: Page -> Feature -> UI (never reverse) |
| MUST | `@/` absolute import paths |
| MUST NOT | Business logic in `page.tsx` |
| MUST NOT | UI components importing from store, queries, or hooks |

## Cross-Skill References

- **Data layer** (TanStack Query, Server Actions, Zustand): Use the `nextjs-data-provider` skill
- **UI layer** (MUI components, forms, Storybook, tests): Use the `nextjs-ui-dev` skill
