---
name: react-dev-orchestration
description: Orchestrates full feature development for React Router 7 Framework Mode (ssr:false) SPA projects. Coordinates data layer and UI layer to implement complete features. Use for requests like "create a new page", "develop a feature", "add a new feature", "implement a page", "develop new feature", "create new page", "build a feature" — any task that requires building both the data layer (queries, mutations, stores) and the UI layer (Feature components, UI components, route modules) together. Do NOT use for Next.js projects — use the nextjs-dev-orchestration skill instead.
---

# React Dev Orchestration

Orchestrates end-to-end feature development in React Router 7 Framework Mode (`ssr: false`) SPA projects — from requirements analysis through integration verification.

> **Project characteristics**: React Router 7 Framework Mode with `ssr: false`. No runtime server — all code runs client-side. Routes are defined code-based in `app/routes.ts`, not with `createBrowserRouter`. TanStack Query handles all runtime data fetching. Server Components and Server Actions are not used.

## Convention Loading

Read these reference files before starting work:

1. **Always**: `references/FRONTEND_ARCHITECTURE_CONVENTION.md`, `references/FRONTEND_CONVENTION.md`
2. **As needed**: `references/REACT_CONVENTION.md`, `references/REACT_ROUTER_CONVENTION.md`

## Orchestration Workflow

### Step 1: Requirements Analysis

1. Identify feature scope (page, CRUD, dashboard section, form, etc.)
2. List data entities and user interactions
3. Determine route structure (URL paths, nested routes, dynamic segments, layout groups)
4. Confirm authentication/authorization requirements (AuthGuard, RoleGuard needed?)

### Step 2: Component Tree Design

Design the hierarchy following the **Page -> Feature -> UI** dependency direction.

```
app/
├── routes/
│   └── dashboard/
│       └── orders.tsx              <- Route module (Feature component composition only)
│
├── features/order/
│   ├── components/
│   │   ├── order-list/
│   │   │   └── OrderList.tsx       <- Feature component (business logic, hooks/store/queries)
│   │   └── order-filter/
│   │       └── OrderFilter.tsx
│   ├── api/                        <- TanStack Query hooks + query options
│   │   ├── query-options.ts
│   │   ├── use-orders-query.ts
│   │   └── use-update-order-mutation.ts
│   ├── store/                      <- Feature-specific Zustand store (optional)
│   ├── schemas/                    <- Feature-specific Zod schemas (optional)
│   └── types/                      <- Feature-specific types (optional)
│
├── components/
│   ├── ui/                         <- Props-only UI components (no store/queries)
│   └── layout/                     <- Layout components (Header, Sidebar)
```

Sellernote rules:
- Route modules in `routes/` only compose Feature/UI components — no business logic
- Feature components in `features/{domain}/components/` contain all business logic
- UI components in `components/ui/` depend only on props — store/queries forbidden
- Cross-feature sharing goes in `features/_common/{domain}/` (not direct Feature-to-Feature imports)
- No `index.ts` barrel files — use specific file path imports

### Step 3: Data Layer Plan

| Category | Identify |
|----------|----------|
| Queries | List query (GET), detail query (GET by ID), search/filter queries |
| Mutations | Create, update, delete — `useMutation` + REST API |
| Client State | UI state (filters, modals, selections) — Zustand stores |
| Server State | TanStack Query hooks (client-side data fetching/caching) |
| URL State | Filters, sorting, pagination — nuqs (`useQueryStates`) |
| Types | Auto-generated API types from shared + feature-specific form/view types |

For each query/mutation, record: API endpoint, query key structure, cache invalidation strategy.

#### API File Structure

Within `features/{domain}/api/`:
- `query-options.ts` — query keys + `queryOptions()` factories + `queryFn` definitions. No `select` or screen-specific transforms here.
- Endpoint hook files (`use-xxx-query.ts`, `use-xxx-mutation.ts`) — `useQuery`/`useMutation` with endpoint-specific transforms co-located privately in the file.

```typescript
// features/order/api/query-options.ts
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GetOrdersRequest, GetOrdersResponse } from '@/types/generated/order.generated';

const fetchOrders = (params: GetOrdersRequest): Promise<GetOrdersResponse> =>
  apiClient.get('/orders', { params });

export const orderQueries = {
  all: ['orders'] as const,
  list: (params: GetOrdersRequest) => queryOptions({
    queryKey: [...orderQueries.all, 'list', params] as const,
    queryFn: () => fetchOrders(params),
  }),
};
```

```typescript
// features/order/api/use-orders-query.ts — endpoint-specific transform co-located
import { useQuery } from '@tanstack/react-query';
import { orderQueries } from './query-options';

type OrderListItem = { id: string; displayTotal: string; statusLabel: string };

const toOrderListItems = (data: GetOrdersResponse): OrderListItem[] =>
  data.orders.map((o) => ({
    id: o.id,
    displayTotal: formatCurrency(o.total),
    statusLabel: ORDER_STATUS_LABELS[o.status],
  }));

export function useOrdersQuery(params: GetOrdersRequest) {
  return useQuery({ ...orderQueries.list(params), select: toOrderListItems });
}
```

### Step 4: Delegate to react-data-provider Skill

Use the `react-data-provider` skill to implement the data layer:

```
react-data-provider skill — implement [FeatureName] data layer:

1. Queries:
   - [endpoint, params, query key for each query]

2. Mutations:
   - [API endpoint, params, cache invalidation targets for each mutation]

3. Zustand store (if needed):
   - [client UI state shape and actions]

4. Types/Schemas:
   - [shared types to import, feature-specific Zod schemas]

Files to create:
- features/{domain}/api/query-options.ts
- features/{domain}/api/use-{feature}-query.ts
- features/{domain}/api/use-{feature}-list-query.ts
- features/{domain}/api/use-{action}-{feature}-mutation.ts
- features/{domain}/store/{feature}-filter-store.ts (if needed)
- features/{domain}/schemas/{feature}-create-schema.ts (if needed)
```

Proceed to the next step after the data layer is complete.

### Step 5: UI Layer Plan

| Component Type | Location | Examples |
|----------------|----------|----------|
| UI Component | `components/ui/` | DataTable, StatusBadge, ConfirmDialog |
| Feature Component | `features/{domain}/components/` | OrderList, OrderForm, OrderDetail |
| Shared Feature Component | `features/_common/{domain}/components/` | POPickerDialog, InstallmentTable |
| Layout Component | `components/layout/` | PageLayout, SectionHeader |

For each component: props interface, data hooks it consumes, any Storybook requirements.

### Step 6: Delegate to react-ui-dev Skill

Use the `react-ui-dev` skill to implement the UI layer:

```
react-ui-dev skill — implement [FeatureName] UI layer:

1. UI Components:
   - [props interface and Storybook requirements for each]

2. Feature Components:
   - [data hooks/stores each component consumes]

3. Form Components (if any):
   - [form fields, Zod schema reference, submit mutation]

4. Available data hooks (already implemented):
   - [list of implemented query/mutation/store hooks]

Files to create:
- features/{domain}/components/{component-name}/{Component}.tsx
- components/ui/{component-name}/{Component}.tsx (if new UI components needed)
```

### Step 7: Route Configuration

After data and UI layers are complete, configure routes in `app/routes.ts`.

```typescript
// app/routes.ts
import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  // Public routes
  index("./routes/home.tsx"),

  // Auth guard — wraps protected routes
  layout("./routes/guards/auth-guard.tsx", [
    layout("./routes/dashboard/layout.tsx", [
      index("./routes/dashboard/home.tsx"),
      route("orders", "./routes/dashboard/orders.tsx"),
      route("orders/:id", "./routes/dashboard/order-detail.tsx"),
    ]),
  ]),

  route("*", "./routes/not-found.tsx"),
] satisfies RouteConfig;
```

Route module structure:

```typescript
// app/routes/dashboard/orders.tsx
import type { Route } from "./+types/orders";
import { OrderList } from "@/features/order/components/order-list/OrderList";
import { OrderFilter } from "@/features/order/components/order-filter/OrderFilter";
import { PageLayout } from "@/components/layout/page-layout/PageLayout";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Order Management" }];
}

export default function OrdersPage() {
  return (
    <PageLayout title="Order Management">
      <OrderFilter />
      <OrderList />
    </PageLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div><h2>Something went wrong</h2></div>;
}
```

Key routing rules:
- Define routes in `app/routes.ts` using `route()`, `index()`, `layout()`, `prefix()`
- Route modules export `default` (required), `ErrorBoundary`, `meta`, `links`, `handle` (optional)
- Import `Route` type from auto-generated `./+types/` for type safety
- Use `layout()` for AuthGuard/GuestGuard/RoleGuard wrappers
- `clientLoader` is allowed only for `ensureQueryData()` prefetching — not as primary data fetching
- Do not use `action`, `headers`, or `loader` (except root route in SPA mode)

### Step 8: Integration Verification

Verify the completed feature against this checklist:

- [ ] Route modules in `routes/` only compose Feature components — no business logic
- [ ] Dependency direction: Page -> Feature -> UI (no reverse imports)
- [ ] No direct Feature-to-Feature imports (shared code in `features/_common/{domain}/`)
- [ ] All imports use `@/` absolute paths (relative only for same folder)
- [ ] No `index.ts` barrel files — specific file path imports only
- [ ] Data layer complete: query-options.ts, endpoint hook files, Zustand store (if needed), Zod schemas (if needed)
- [ ] API types imported from shared auto-generated types (not redefined in Features)
- [ ] Transforms co-located in endpoint hook files (not in query-options.ts or components)
- [ ] UI components complete with props-only design (no store/queries)
- [ ] Routes defined in `app/routes.ts` with proper layout nesting
- [ ] ErrorBoundary exported in route modules
- [ ] SSR-safe: no browser API access in component rendering path
- [ ] URL state (filters, sort, pagination) managed with nuqs

## File Placement Decision Tree

```
New file needed
|
+-- Domain-specific (order, auth, user, etc.)?
|  +-- YES -> features/{domain}/
|     +-- API/TanStack Query hook? -> features/{domain}/api/
|     +-- Component with business logic? -> features/{domain}/components/{name}/
|     +-- Zustand store? -> features/{domain}/store/
|     +-- Zod schema? -> features/{domain}/schemas/
|     +-- Feature type? -> features/{domain}/types/
|     +-- Pure utility? -> features/{domain}/utils/
|
+-- Shared by 2+ Features + has domain context?
|  +-- YES -> features/_common/{domain}/
|
+-- General-purpose (domain-agnostic)?
   +-- Props-only UI component? -> components/ui/
   +-- Page structure? -> components/layout/
   +-- General hook? -> hooks/
   +-- Utility function? -> lib/
   +-- Shared type? -> types/
```

## State Management Selection

```
State needed
|
+-- Server data (API response)? -> TanStack Query (useQuery/useMutation)
|     * Do NOT copy to Zustand
+-- Should be in URL (filter, sort, pagination)? -> nuqs
+-- Single component only? -> useState / useReducer
+-- UI state shared across components? -> Zustand
```

## Key Rules Summary

| Rule | Detail |
|------|--------|
| Route modules | Compose Feature/UI components only. No business logic, no data fetching. |
| Dependency direction | Page -> Feature -> UI. Reverse forbidden. Feature -> Feature forbidden. |
| Imports | `@/` absolute paths. No barrel files. Specific file paths only. |
| API file structure | `query-options.ts` (keys + queryFn) + endpoint hook files (useQuery + transforms) |
| Transforms | Co-locate in endpoint hook files. Not in query-options.ts or components. |
| SSR safety | No browser APIs in rendering path. Use `useEffect` or event handlers. |
| Routing | `app/routes.ts` with `route()`/`layout()`/`index()`. Not `createBrowserRouter`. |

## Cross-Skill References

- **Data layer** (TanStack Query, Zustand, nuqs): `react-data-provider` skill
- **UI layer** (components, forms, Storybook, tests): `react-ui-dev` skill
- **React patterns** (hooks, composition, performance): `react-dev` skill
