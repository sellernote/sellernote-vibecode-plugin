---
name: nextjs-dev-orchestration
description: Orchestrate full Next.js feature and page development by coordinating data layer and UI layer skills. Use when asked to develop a complete feature, create a new page, or build end-to-end Next.js functionality. Triggers include requests like "develop new feature", "create new page", "build a feature", "implement a page", or any task requiring both data layer (queries, mutations, stores) and UI layer (components, forms) to be created together in a Next.js App Router project. Also triggers for full-stack feature planning, architecture design for new pages, or when coordinating between data and UI implementation in Next.js 15.
---

# Next.js Dev Orchestration

Orchestrate full Next.js feature development by analyzing requirements, designing architecture with feature-based co-location, and delegating to specialized sub-skills for data and UI layers.

## Convention Loading

Before starting, read from `references/` within this skill directory:

1. **Always**: `references/FRONTEND_ARCHITECTURE_CONVENTION.md`, `references/NEXTJS_CONVENTION.md`
2. **When relevant**: `references/FRONTEND_CONVENTION.md`, `references/REACT_CONVENTION.md`

## Orchestration Workflow

### Step 1: Analyze Requirements

1. Identify feature scope (page, CRUD feature, dashboard section, form, etc.)
2. List data entities and user interactions
3. Determine route structure (URL paths, route groups, dynamic segments)
4. Check auth/middleware requirements
5. Identify data fetching strategy: Server Component fetch for initial load vs TanStack Query for client interactions

### Step 2: Design Feature Structure

Use feature-based co-location. Domain-specific code lives under `features/{domain}/`. Shared domain code used by 2+ Features goes in `features/_common/{domain}/`.

```
app/                              # Next.js App Router (route files only)
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── orders/
│   │   ├── page.tsx              # Server Component — composes Feature components
│   │   ├── [id]/page.tsx
│   │   ├── loading.tsx           # Skeleton UI
│   │   └── error.tsx             # 'use client' error boundary
│   └── layout.tsx
├── actions/                      # Server Actions
│   └── order.ts

features/                         # Domain-specific co-location
├── _common/                      # Shared across Features (with domain context)
│   └── po/
│       ├── components/po-items-table/
│       │   └── POItemsTable.tsx
│       ├── api/
│       ├── types/
│       └── utils/
├── order/
│   ├── components/               # Feature components
│   │   ├── order-list/
│   │   │   ├── OrderList.tsx
│   │   │   └── OrderListItem.tsx
│   │   └── order-filter/
│   │       └── OrderFilter.tsx
│   ├── api/                      # query-options + endpoint hook files
│   │   ├── query-options.ts
│   │   ├── use-orders-query.ts
│   │   └── use-update-order-mutation.ts
│   ├── store/                    # Zustand store (optional, client UI state only)
│   ├── schemas/                  # Zod schemas (optional)
│   ├── types/                    # Feature-specific view/form types (optional)
│   └── utils/                    # Pure helpers (optional)

components/                       # Shared components (domain-agnostic)
├── ui/                           # Props-only UI components
│   └── data-table/
│       └── DataTable.tsx
└── layout/                       # Layout components
    └── page-layout/
        └── PageLayout.tsx

hooks/                            # Shared custom hooks (useDebounce, etc.)
lib/                              # Utilities (cn(), API client, etc.)
types/                            # Shared type definitions (incl. auto-generated)
schemas/                          # Shared Zod schemas
constants/                        # Shared constants
```

Sellernote-specific rules:
- `app/` contains only route files — no components, hooks, or stores
- `page.tsx` is a Server Component that only composes Feature/UI components (no business logic)
- Feature components in `features/{domain}/components/` contain all business logic
- UI components in `components/ui/` depend only on props (never on store/queries/hooks)
- No `index.ts` barrel files — always import specific file paths
- File naming: PascalCase for component files, kebab-case for directories and all other files

#### Component Classification

| Type | Location | Characteristics |
|------|----------|----------------|
| UI Component | `components/ui/{name}/` | Props-only, no business logic, no store/queries |
| Feature Component | `features/{domain}/components/{name}/` | Business logic, uses hooks/store/queries, composes UI components |
| Layout Component | `components/layout/{name}/` | Page structure/navigation, no domain business logic |
| Page Component | `app/**/page.tsx` | Server Component, composes Feature/UI components only |

#### Dependency Direction

```
Page (app/) → Domain Feature (features/{domain}/) → Feature Common (features/_common/{domain}/) → Shared (components/, hooks/, lib/, types/)
```

- Domain Feature → Domain Feature: **Forbidden** (promote to `features/_common/{domain}/` first)
- Shared → Feature/Page: **Reverse direction forbidden**
- UI components must not import store, queries, or business hooks

### Step 3: Plan Data Layer

| Category | Pattern | Location |
|----------|---------|----------|
| Query definitions | `queryOptions()` factories + query key hierarchy | `features/{domain}/api/query-options.ts` |
| Query hooks | `useQuery`/`useSuspenseQuery` with `select` transforms | `features/{domain}/api/use-{name}-query.ts` |
| Mutation hooks | `useMutation` + cache invalidation | `features/{domain}/api/use-{name}-mutation.ts` |
| Server Actions | `'use server'` mutations with `revalidatePath`/`revalidateTag` | `app/actions/{domain}.ts` |
| Client UI state | Zustand store (filters, modals, selections) | `features/{domain}/store/` |
| URL state | `nuqs` for filters, sorting, pagination | Inside Feature components |
| Types | Auto-generated API types from shared; view/form types per Feature | `types/generated/`, `features/{domain}/types/` |

Key data layer rules:
- `query-options.ts`: only query keys + `queryFn` (pure API calls). No `select` or screen-specific transforms
- Endpoint-specific transforms, helpers, and types co-locate in the endpoint hook file (e.g., `use-orders-query.ts`)
- Do not duplicate API request/response types — use auto-generated types from shared
- Do not copy TanStack Query server data into Zustand store
- URL-reflectable state (filters, sort, pagination) → use `nuqs`, not Zustand
- Single-component-only state → `useState`/`useReducer`, not Zustand

#### Hook Placement Rules

| Hook pattern | Location |
|-------------|----------|
| Endpoint hook file (`use-xxx-query.ts`, `use-xxx-mutation.ts`) | `features/{domain}/api/` |
| Other hooks (`use-xxx-permission.ts`, etc.) | `features/{domain}/hooks/` |

### Step 4: Delegate to nextjs-data-provider Skill

Invoke the `nextjs-data-provider` skill with this handoff template:

```
Use the nextjs-data-provider skill to implement the data layer for [feature name]:

1. Query definitions (query-options.ts):
   - [List each queryOptions factory: endpoint, params, query key structure]

2. Query hooks (endpoint hook files):
   - [List each use-xxx-query.ts: select transform requirements, return type]

3. Mutation hooks:
   - [List each use-xxx-mutation.ts: endpoint, params, cache invalidation targets]

4. Server Actions (if needed):
   - [List each action: name, params, revalidatePath/revalidateTag targets]

5. Zustand store (if needed):
   - [List client UI state with shape and actions]

6. Types/Schemas:
   - [List Feature-specific Zod schemas and view/form types]

Files to create under features/{domain}/:
- api/query-options.ts
- api/use-{name}-query.ts
- api/use-{name}-mutation.ts
- store/{name}-store.ts (if needed)
- schemas/{name}-schema.ts (if needed)
- types/{name}-types.ts (if needed)
```

Wait for data layer completion before proceeding.

### Step 5: Plan UI Layer

| Component Type | Location | Examples |
|----------------|----------|----------|
| UI components | `components/ui/{component-name}/` | DataTable, StatusBadge, ConfirmDialog |
| Feature components | `features/{domain}/components/{component-name}/` | OrderList, OrderForm, OrderDetail |
| Layout components | `components/layout/{component-name}/` | PageLayout, SectionHeader |

For each component, note: props interface, data hooks consumed (Feature components only), test requirements.

Dialog/overlay rules:
- Always render the overlay shell; control visibility via `open` prop
- Do not conditionally render the shell itself (`{open && <Dialog />}` is forbidden)
- Use `key={id}` to reset internal state when the target entity changes

### Step 6: Delegate to nextjs-ui-dev Skill

Invoke the `nextjs-ui-dev` skill with this handoff template:

```
Use the nextjs-ui-dev skill to implement the UI for [feature name]:

1. UI components to create:
   - [List each with props interface]

2. Feature components to create:
   - [List each with query/mutation/store hooks it uses]

3. Form components (if any):
   - [List with fields, Zod schema reference, submission handler (Server Action or mutation)]

4. Data hooks available (from data layer):
   - [List implemented query hooks, mutation hooks, store hooks]

Files to create:
- components/ui/{component-name}/{Component}.tsx
- features/{domain}/components/{component-name}/{Component}.tsx
```

### Step 7: Configure Routing (Next.js App Router)

After data and UI layers are implemented, wire everything in App Router.

**page.tsx** (Server Component):
- Import and compose Feature/UI components only — no business logic
- Use `@/` absolute paths
- For initial data, use async/await fetch with explicit cache options (`cache`, `next.revalidate`, `next.tags`)
- Wrap independent data sections in individual `<Suspense>` boundaries for streaming

**loading.tsx**:
- Skeleton UI matching page layout structure (not spinners)
- Creates automatic per-route Suspense boundary

**error.tsx**:
- Must have `'use client'` directive
- Use `error` and `reset` props
- Never expose stack traces in production

**layout.tsx**:
- Create for route groups needing shared layout (sidebar, breadcrumbs)
- Persists without re-rendering during navigation
- Do not pass fetched data as props to children (layouts don't re-render on navigation)

**middleware.ts**:
- Always define `matcher` config to limit scope
- Never run on `_next/`, static files
- Use for auth checks, redirects, request logging

**Dynamic routes with static generation**:
- Provide `generateStaticParams` for dynamic routes that should be statically built

### Step 8: Integration Verification

Verify the completed feature:

- [ ] `app/` has only route files; all business logic in `features/{domain}/`
- [ ] Feature co-location: each domain has `components/`, `api/` (required); `store/`, `schemas/`, `types/`, `utils/` (as needed)
- [ ] Dependency direction: Page → Domain Feature → Feature Common → Shared/UI (no reverse)
- [ ] No direct imports between Domain Features (shared code in `_common/{domain}/`)
- [ ] No `index.ts` barrel files anywhere
- [ ] `'use client'` only at leaf nodes (Feature components), not on Page/Layout
- [ ] All imports use `@/` absolute paths (relative only for same folder)
- [ ] `query-options.ts` has only query keys + `queryFn`; transforms in endpoint hook files
- [ ] No server data copied to Zustand store; URL state uses `nuqs`
- [ ] Route files: `loading.tsx` (skeleton), `error.tsx` (`'use client'`)
- [ ] Server Components as default; heavy components use `React.lazy` + `Suspense`
- [ ] Fetch calls have explicit cache options
- [ ] File naming: PascalCase for components, kebab-case for directories and other files

## Key Rules Summary

| Rule | Detail |
|------|--------|
| MUST | `app/` for route files only; business logic in `features/{domain}/` |
| MUST | Feature co-location: `{components,api}` required; `{store,schemas,types,utils}` as needed |
| MUST | Server Components as default; `'use client'` at leaf nodes only |
| MUST | Dependency: Page → Feature → Feature Common → Shared (never reverse) |
| MUST | `@/` absolute imports; no barrel files; specific file path imports |
| MUST | `query-options.ts` for query keys + queryFn only; transforms in endpoint hook files |
| MUST | Auto-generated types for API req/res; do not redefine in Features |
| MUST NOT | Business logic in `page.tsx` or `layout.tsx` |
| MUST NOT | UI components importing from store, queries, or hooks |
| MUST NOT | Direct imports between Domain Features |
| MUST NOT | Copy TanStack Query data to Zustand; use `nuqs` for URL state |

## Cross-Skill References

- **Data layer** (TanStack Query, Server Actions, Zustand, nuqs): Use the `nextjs-data-provider` skill
- **UI layer** (components, forms, tests): Use the `nextjs-ui-dev` skill
