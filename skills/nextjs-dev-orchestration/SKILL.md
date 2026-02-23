---
name: nextjs-dev-orchestration
description: Orchestrate full Next.js feature and page development by coordinating data layer and UI layer skills. Use when asked to develop a complete feature, create a new page, or build end-to-end Next.js functionality. Triggers include requests like "새 페이지 만들어줘", "기능 개발해줘", "새 기능 추가해줘", "페이지 구현해줘", "develop new feature", "create new page", "build a feature", "implement a page", or any task requiring both data layer (queries, mutations, stores) and UI layer (components, forms, stories) to be created together in a Next.js App Router project.
---

# Next.js Dev Orchestration

Orchestrate full Next.js feature development by analyzing requirements, designing architecture, and delegating to specialized sub-skills for data and UI layers.

## Convention Loading

Before starting, read the following reference files from `references/` within this skill directory:

1. **Always read first**:
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - Directory layout, component taxonomy (Page/Feature/UI/Layout), dependency direction, co-location rules
   - `references/NEXTJS_CONVENTION.md` - App Router file conventions, Server/Client Components, data fetching strategies, caching, middleware, error/loading handling

2. **Read when relevant**:
   - `references/FRONTEND_CONVENTION.md` - Tech stack overview, component design principles, naming, import rules, accessibility, performance

## Orchestration Workflow

Follow these steps sequentially for every feature or page development task.

### Step 1: Analyze Requirements

1. Identify the feature scope: what the user wants to build (page, CRUD feature, dashboard section, form, etc.)
2. List the data entities involved (e.g., orders, products, users)
3. List the user interactions required (e.g., filtering, creating, editing, deleting)
4. Determine the route structure: which URL paths, route groups, and dynamic segments are needed
5. Check whether the feature requires authentication, authorization, or middleware

### Step 2: Design Component Tree

Design the component hierarchy following the dependency direction: **Page -> Feature -> UI**.

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

Rules for the component tree:
- [MUST] `app/` contains only route files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`)
- [MUST] Business logic lives in `components/feature/`, not in `page.tsx`
- [MUST] `page.tsx` is a Server Component by default; it only composes Feature/UI components
- [MUST] Dependency flows downward: Page -> Feature -> UI (never reverse)
- [MUST] UI components (`components/ui/`) depend only on props, never on store/queries/hooks
- [MUST] Feature components (`components/feature/`) contain business logic and compose UI components
- [MUST NOT] Place components, hooks, or stores inside `app/`

### Step 3: Plan Data Layer

Identify the data requirements:

| Category | Items to Identify |
|----------|-------------------|
| Queries | List queries (GET), detail queries (GET by ID), search/filter queries |
| Mutations | Create, update, delete operations via Server Actions |
| Client State | UI state (filters, modals, selections) via Zustand stores |
| Server State | TanStack Query hooks for client-side data fetching/caching |
| Types | Shared TypeScript interfaces and Zod schemas |

For each query/mutation, note:
- The API endpoint or Server Action to call
- The query key structure for TanStack Query
- Cache invalidation strategy (which queries to invalidate after mutations)

### Step 4: Delegate to nextjs-data-provider Skill

Invoke the `nextjs-data-provider` skill to implement the data layer.

**Handoff instructions to provide:**

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

Wait for the data layer to be fully implemented before proceeding to Step 5.

### Step 5: Plan UI Layer

Identify the UI components needed:

| Component Type | Location | Examples |
|----------------|----------|----------|
| UI components | `components/ui/` | DataTable, StatusBadge, ConfirmDialog |
| Feature components | `components/feature/` | OrderList, OrderForm, OrderDetail |
| Layout components | `components/layout/` | PageLayout, SectionHeader |

For each component, note:
- Props interface
- Whether it needs `'use client'` (only if it uses hooks, event handlers, or browser APIs)
- Which data hooks/stores it consumes (Feature components only)
- Storybook story requirements (UI components)

### Step 6: Delegate to nextjs-ui-dev Skill

Invoke the `nextjs-ui-dev` skill to implement the UI layer.

**Handoff instructions to provide:**

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

### Step 7: Configure Routing and Layout

After data and UI layers are implemented, wire everything together in the App Router.

#### 7a: Create page.tsx

```typescript
// app/(group)/feature-name/page.tsx
import { FeatureName } from '@/components/feature/FeatureName';
import { PageLayout } from '@/components/layout/PageLayout';

export default function FeatureNamePage() {
  return (
    <PageLayout title="Feature Title">
      <FeatureName />
    </PageLayout>
  );
}
```

Rules:
- [MUST] Keep `page.tsx` as Server Component (no `'use client'`)
- [MUST] Only import and compose components; no business logic
- [MUST] Use `@/` absolute import paths

#### 7b: Create loading.tsx

```typescript
// app/(group)/feature-name/loading.tsx
import { Skeleton } from '@mui/material';

export default function Loading() {
  return (
    <div>
      <Skeleton variant="rectangular" height={48} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={400} />
    </div>
  );
}
```

Rules:
- [SHOULD] Use skeleton UI matching the page layout, not a spinner
- [SHOULD] Match the visual structure of the actual page content

#### 7c: Create error.tsx

```typescript
// app/(group)/feature-name/error.tsx
'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>문제가 발생했습니다</h2>
      <p>{error.message}</p>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}
```

Rules:
- [MUST] `error.tsx` requires `'use client'` directive
- [MUST] Accept `error` and `reset` props
- [MUST NOT] Expose stack traces or internal error details to users

#### 7d: Configure layout.tsx (if needed)

Create or update the route group layout when the feature requires shared layout elements (sidebar, header, breadcrumbs):

```typescript
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

#### 7e: Configure middleware (if needed)

If the feature requires authentication or route-level logic:

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

Rules:
- [MUST] Always define `matcher` config to limit middleware scope
- [MUST NOT] Run middleware on static files or `_next/` paths

### Step 8: Integration Verification

Run through this checklist to verify the feature is complete and correctly integrated.

#### Architecture Checklist

- [ ] `app/` contains only route files (page, layout, loading, error, not-found)
- [ ] No business logic in `page.tsx`; all delegated to Feature components
- [ ] Component dependency direction: Page -> Feature -> UI (no reverse imports)
- [ ] UI components depend only on props (no store, query, or hook imports)
- [ ] `'use client'` only at leaf nodes (Feature components), not on Page or Layout
- [ ] All imports use `@/` absolute paths
- [ ] Co-located files: component, test, story, index.ts in same folder

#### Data Layer Checklist

- [ ] TanStack Query hooks created with proper query keys
- [ ] Server Actions created for mutations with `'use server'` directive
- [ ] Cache invalidation configured (revalidatePath/revalidateTag after mutations)
- [ ] Zustand store created for client-only UI state
- [ ] Zod schemas defined for form validation
- [ ] TypeScript types/interfaces defined for shared data shapes

#### UI Layer Checklist

- [ ] UI components have Storybook stories
- [ ] Feature components have unit tests
- [ ] Forms use React Hook Form + Zod validation
- [ ] MUI components used for base UI (not custom CSS for standard elements)
- [ ] Accessible: semantic HTML, keyboard navigation, alt text

#### Routing Checklist

- [ ] `loading.tsx` with skeleton UI present for the route
- [ ] `error.tsx` with `'use client'` present for the route
- [ ] Route group layout configured if shared layout is needed
- [ ] Middleware with `matcher` config if authentication is required
- [ ] Dynamic routes have `generateStaticParams` if statically generated

#### Performance Checklist

- [ ] Server Components used by default; `'use client'` minimized
- [ ] Heavy components use `dynamic()` import with loading fallback
- [ ] Images use `next/image` with `priority` on LCP images
- [ ] Independent data sections wrapped in individual `<Suspense>` boundaries
- [ ] Fetch calls have explicit cache options (`cache`, `next.revalidate`, `next.tags`)

## Key Rules Summary

| Rule | Detail |
|------|--------|
| MUST | `app/` for route files only; business logic in `components/`, `hooks/`, `store/`, `queries/` |
| MUST | Server Components as default; `'use client'` at leaf nodes only |
| MUST | Dependency direction: Page -> Feature -> UI (never reverse) |
| MUST | `error.tsx` with `'use client'`; `loading.tsx` with skeleton UI per route |
| MUST | Middleware with `matcher` config |
| MUST | `@/` absolute import paths |
| MUST NOT | Business logic in `page.tsx` |
| MUST NOT | UI components importing from store, queries, or hooks |
| MUST NOT | Components, hooks, or stores placed inside `app/` directory |
| SHOULD | Co-locate component, test, story, index.ts in same folder |
| SHOULD | Use `<Suspense>` boundaries for independent data sections |

## Cross-Skill References

- **Data layer** (TanStack Query, Server Actions, Zustand): Use the `nextjs-data-provider` skill
- **UI layer** (MUI components, forms, Storybook, tests): Use the `nextjs-ui-dev` skill
