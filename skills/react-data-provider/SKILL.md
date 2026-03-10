---
name: react-data-provider
description: Guide for data fetching and state management in React SPA projects. Covers TanStack Query for server state, Zustand for global UI state, nuqs for URL state, Axios API client setup, query option factories, custom query/mutation hooks, optimistic updates, cache invalidation, and global error handling — all following Sellernote conventions. Use this skill when working on "data fetching", "API integration", "state management", "TanStack Query", "Zustand", "create a query hook", "create a store", "API call", "cache strategy", "optimistic update", "URL state", "nuqs", "search params", "pagination", "filter state", or any data/state-related work in a React SPA project. For Next.js projects, use the nextjs-data-provider skill instead.
---

# React Data Provider

Implement data fetching and state management in React SPA (React Router v7 Framework Mode, `ssr: false`) projects following Sellernote conventions.

> **React-only SPA characteristics**: No Server Components, Server Actions, or revalidatePath/Tag. All runtime data fetching is client-side via TanStack Query. Mutations use `useMutation` + REST API. The framework runs on Vite with React Router v7 in SPA mode.

## Convention Loading

Read the following reference files before starting work:

1. **Always read first** (core rules):
   - `references/STATE_CONVENTION.md` — State classification, TanStack Query patterns, Zustand patterns, nuqs URL state
   - `references/FRONTEND_CONVENTION.md` — Component design, import rules, tech stack

2. **Read when needed**:
   - `references/API_CLIENT_CONVENTION.md` — API client common rules, token management, ApiError class
   - `references/API_CLIENT_AXIOS_CONVENTION.md` — Axios instance setup, interceptors, token refresh flow
   - `references/REACT_CONVENTION.md` — React 19 patterns, Hooks rules, Suspense, React Compiler
   - `references/REACT_ROUTER_CONVENTION.md` — React Router 7 Framework Mode, route modules, clientLoader prefetch
   - `references/TYPESCRIPT_CONVENTION.md` — Type system, async/await, import ordering
   - `references/COMMON_CONVENTION.md` — Naming, error handling, logging

## Tech Stack

| Area | Technology | Notes |
|------|-----------|-------|
| Framework | React Router v7 (Framework Mode, `ssr: false`) | Vite-based SPA |
| UI Library | React 19.2+ | React Compiler enabled |
| Server State | TanStack Query v5 | `useSuspenseQuery` as default |
| Client State | Zustand | Last resort — feature-scoped stores |
| URL State | nuqs 2.8+ | Filters, sorting, pagination |
| Form | React Hook Form + Zod | Not managed in global store |
| HTTP Client | Axios | Via `app/lib/api-client.ts` |

## Workflow

### Step 1: Classify State Type

Classify every piece of state into one of these 4 types and use the corresponding tool:

| State Type | Tool | When to Use |
|-----------|------|-------------|
| Server State | TanStack Query | Data from API (product list, user profile, order history) |
| URL State | nuqs (`useQueryStates`) | Pagination, filters, sorting, tabs |
| Local State | `useState` / `useReducer` | Single-component state (modal open, input value, toggle) |
| Global UI State | Zustand (last resort) | Pure UI state shared across multiple pages (sidebar, toast queue, theme) |

Critical rules:
- Server data is managed ONLY via TanStack Query — never copy it into Zustand
- State used only within a single component stays in `useState` — never put it in a global store
- URL-reflected state (filters, pagination, sorting) uses nuqs — not Zustand or useState
- Form state uses React Hook Form — not Zustand
- Before adding Zustand state, verify: "Does this really need to be global across multiple pages?"

### Step 2: Determine Fetching Strategy

| Scenario | Method |
|----------|--------|
| List/detail data | TanStack Query `useSuspenseQuery` (default) or `useQuery` (when `enabled` needed) |
| Search/filter/pagination | TanStack Query + nuqs URL state |
| Create/update/delete | TanStack Query `useMutation` + REST API |
| Real-time polling | TanStack Query `refetchInterval` |
| Infinite scroll | TanStack Query `useInfiniteQuery` |
| Route-level prefetch | `clientLoader` + `queryClient.ensureQueryData()` (optional) |
| Form submission | React Hook Form + TanStack Query `useMutation` |

### Step 3: API Client Setup

Place the Axios-based API client in `app/lib/api-client.ts`. Follow `references/API_CLIENT_CONVENTION.md` and `references/API_CLIENT_AXIOS_CONVENTION.md` for the full implementation.

Key rules:
- BASE_URL from `import.meta.env.VITE_API_URL`
- Access Token stored in a module-scoped memory variable (never in localStorage)
- Refresh Token managed as `httpOnly` cookie (set by backend)
- Request interceptor injects `Authorization: Bearer` header
- Response interceptor transforms errors to `ApiError` class and handles 401 token refresh with queue

```typescript
// app/lib/api-client.ts
import axios from 'axios';
import { ApiError } from './api-error';

const BASE_URL = import.meta.env.VITE_API_URL;

let accessToken: string | null = null;
export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken(): string | null { return accessToken; }

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor — see API_CLIENT_AXIOS_CONVENTION.md for full 401 refresh + queue logic
```

### Step 4: TanStack Query (Server State)

#### 4a: Query Option Factory

Place query factories in `features/{domain}/api/query-options.ts`. Use `queryOptions()` from TanStack Query. Keep `queryFn` as a pure API call — no `select` or view-specific transforms here.

```typescript
// features/order/api/query-options.ts
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GetOrdersRequest, GetOrdersResponse } from '@/types/generated/order.generated';

const fetchOrders = (params: GetOrdersRequest): Promise<GetOrdersResponse> =>
  apiClient.get('/orders', { params });

export const orderQueries = {
  all: ['orders'] as const,
  list: (params: GetOrdersRequest) =>
    queryOptions({
      queryKey: [...orderQueries.all, 'list', params] as const,
      queryFn: () => fetchOrders(params),
    }),
  detail: (params: { id: string }) =>
    queryOptions({
      queryKey: [...orderQueries.all, 'detail', params.id] as const,
      queryFn: () => apiClient.get<Order>(`/orders/${params.id}`),
    }),
};
```

#### 4b: Custom Query Hooks

Place per-endpoint hooks in `features/{domain}/api/use-{name}-query.ts`. Use `useSuspenseQuery` as the default; use `useQuery` only when conditional fetching (`enabled`) is needed.

View-specific transforms belong in the hook file (not in `query-options.ts`):

```typescript
// features/order/api/use-orders-query.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import { orderQueries } from './query-options';

type OrderListItem = { id: string; title: string; statusLabel: string };

const toOrderListItem = (data: GetOrdersResponse): OrderListItem[] =>
  data.orders.map((order) => ({
    id: order.id,
    title: order.title,
    statusLabel: ORDER_STATUS_LABEL[order.status],
  }));

export function useOrdersQuery(params: GetOrdersRequest) {
  return useSuspenseQuery({
    ...orderQueries.list(params),
    select: toOrderListItem,
  });
}
```

For conditional fetching:

```typescript
// features/order/api/use-user-orders-query.ts
export function useUserOrdersQuery(userId: string | undefined) {
  return useQuery({
    ...orderQueries.list({ userId: userId! }),
    enabled: !!userId,
  });
}
```

#### 4c: Mutation Hooks + Cache Invalidation

Always invalidate related queries after a successful mutation. Use `meta.successMessage` to trigger global success toasts.

```typescript
// features/order/api/use-update-order-mutation.ts
export function useUpdateOrderMutation(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOrderDto) => apiClient.put(`/orders/${orderId}`, data),
    meta: { successMessage: 'Order updated.' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueries.all });
    },
  });
}
```

#### 4d: Optimistic Updates

Apply for UX-critical mutations. Follow the cancel → snapshot → optimistic set → rollback on error → invalidate on settled pattern:

```typescript
export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOrderInput) => apiClient.put<Order>(`/orders/${data.id}`, data),
    onMutate: async (updatedOrder) => {
      const queryKey = orderQueries.detail({ id: updatedOrder.id }).queryKey;
      await queryClient.cancelQueries({ queryKey });
      const previousOrder = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: Order) => ({ ...old, ...updatedOrder }));
      return { previousOrder };
    },
    onError: (_err, updatedOrder, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(
          orderQueries.detail({ id: updatedOrder.id }).queryKey,
          context.previousOrder,
        );
      }
    },
    onSettled: (_data, _error, updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: orderQueries.detail({ id: updatedOrder.id }).queryKey });
    },
  });
}
```

#### 4e: Global Error/Success Handling

Configure `QueryCache` and `MutationCache` on the `QueryClient`:

```typescript
// app/lib/query-client.ts
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.isUnauthorized()) {
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'An unknown error occurred.';
      toast.error(message);
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      const successMessage = (mutation.options.meta as { successMessage?: string })?.successMessage;
      if (successMessage) toast.success(successMessage);
    },
  }),
});
```

#### 4f: Cache Strategy Guidelines

| Data Type | staleTime | gcTime | Examples |
|-----------|-----------|--------|----------|
| Frequently changing | 30s–1min | 5min | Real-time inventory, notification count |
| Normal | 5min (default) | 10min | Product list, order history |
| Rarely changing | 30min–1hr | 2hr | Category list, announcements |
| Never changing | Infinity | 24hr | Country codes, reference dates |

### Step 5: URL State with nuqs

Use nuqs for filters, sorting, and pagination. Do NOT use Zustand or useState for these.

#### Parser Definition

```typescript
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from 'nuqs';

const searchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  size: parseAsInteger.withDefault(20),
  status: parseAsStringLiteral(['all', 'pending', 'confirmed'] as const).withDefault('all'),
};
```

#### Integration with TanStack Query

```typescript
function OrderList() {
  const [{ page, size, status }, setParams] = useQueryStates(searchParamsParsers);
  const { data, isPending } = useOrdersQuery({ page, size, status });

  return (
    <div>
      <DataTable data={data?.orders ?? []} columns={ORDER_COLUMNS} />
      <Pagination
        currentPage={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={(nextPage) => setParams({ page: nextPage })}
      />
    </div>
  );
}
```

#### Search Input Pattern

Use uncontrolled input + `form onSubmit` — not local state + useEffect sync:

```tsx
const [{ search: appliedSearch }, setParams] = useQueryStates({
  search: parseAsString.withDefault(''),
});

const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  void setParams({ search: (formData.get('search') as string) || '', page: 1 });
};

<form onSubmit={handleSearchSubmit}>
  <input key={appliedSearch} name="search" defaultValue={appliedSearch} />
  <button type="submit">Search</button>
</form>
```

### Step 6: Zustand (Global UI State — Last Resort)

Only use Zustand for pure UI state shared across multiple pages. Create **independent feature-scoped stores** in `features/{domain}/store/`.

#### Feature-Scoped Store

```typescript
// features/ui/store/ui-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIStore {
  isSidebarOpen: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        isSidebarOpen: true,
        notifications: [],
        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        addNotification: (notification) =>
          set((state) => ({ notifications: [...state.notifications, notification] })),
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen }),
      },
    ),
    { name: 'UIStore' },
  ),
);
```

#### Selector Rules

Always use individual selectors to prevent unnecessary re-renders:

```typescript
// Good — individual selector
const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

// Good — useShallow for multiple values
import { useShallow } from 'zustand/react/shallow';
const { isSidebarOpen, notifications } = useUIStore(
  useShallow((s) => ({ isSidebarOpen: s.isSidebarOpen, notifications: s.notifications })),
);

// Bad — subscribes to entire store
const { isSidebarOpen } = useUIStore();
```

### Step 7: Route-Level Prefetching (Optional)

Prevent data waterfalls on route entry using `clientLoader` + `ensureQueryData`:

```typescript
// app/routes/dashboard/orders.tsx
import type { Route } from './+types/orders';
import { orderQueries } from '@/features/order/api/query-options';
import { queryClient } from '@/lib/query-client';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const filters = Object.fromEntries(url.searchParams);
  await queryClient.ensureQueryData(orderQueries.list(filters));
  return null;
}

export default function OrdersPage() {
  return (
    <PageLayout title="Order Management">
      <OrderFilter />
      <OrderList />
    </PageLayout>
  );
}
```

### Step 8: Verification

1. All API calls go through TanStack Query custom hooks (never direct fetch/axios in components)
2. Server data is NOT duplicated in Zustand
3. Query factories use `queryOptions()` in `features/{domain}/api/query-options.ts`
4. Mutations invalidate related queries on success
5. `queryFn` in query-options is a pure API call — no `select` or view transforms
6. View transforms are co-located in the per-endpoint hook file
7. Zustand stores are feature-scoped in `features/{domain}/store/` with `devtools` + `persist` + `partialize`
8. URL state (filters, pagination, sorting) uses nuqs, not Zustand/useState
9. API client is in `app/lib/api-client.ts` using Axios with proper interceptors
10. Global error handling is configured via `QueryCache`/`MutationCache`

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| `useEffect` + `fetch` for server data | TanStack Query `useQuery`/`useSuspenseQuery` |
| Copying TanStack Query data into Zustand via `useEffect` | Use the TanStack Query hook directly in each component |
| Storing local state (modal open, input value) in Zustand | `useState` within the component |
| Using `useState` for filters/pagination | nuqs `useQueryStates` |
| Calling `fetch`/`axios` directly from components | Call through `apiClient` via custom hooks |
| Putting `select`/transforms in `query-options.ts` | Co-locate transforms in the per-endpoint hook file |
| Single mega-store with all Zustand state | Feature-scoped independent stores |
| Subscribing to entire Zustand store without selector | Individual selectors or `useShallow` |
| Storing Access Token in localStorage | Module-scoped memory variable |

## Cross-Skill References

- **React component patterns**: Use `react-dev` skill
- **UI components, styling, forms, testing**: Use `react-ui-dev` skill
- **Full feature orchestration**: Use `react-dev-orchestration` skill
- **Code review**: Use `convention-code-review` skill
