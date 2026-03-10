---
name: nextjs-data-provider
description: Next.js data fetching and state management following Sellernote conventions. Use when implementing data fetching with Server Components, Server Actions, TanStack Query, API integration, caching strategies, revalidation, Zustand state management, nuqs URL state, optimistic updates, or any data flow in a Next.js App Router project. Also triggers on tasks involving query options factories, custom query hooks, mutation patterns, cache invalidation, feature-scoped Zustand stores, nuqs searchParams parsers, dependent queries, global error handling with QueryCache/MutationCache, or environment variable usage.
---

# Next.js Data Provider

Implement data fetching and state management in Next.js 15 App Router projects following Sellernote conventions.

## Convention Loading

Before starting any work, read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/STATE_CONVENTION.md` — State classification, TanStack Query patterns, Zustand patterns, nuqs URL state
   - `references/NEXTJS_CONVENTION.md` — Server/Client Components, data fetching strategies, caching

2. **Read when relevant**:
   - `references/API_CLIENT_CONVENTION.md` — API client common rules, token management, error handling
   - `references/API_CLIENT_AXIOS_CONVENTION.md` — Axios implementation, interceptors, refresh token flow
   - `references/FRONTEND_CONVENTION.md` — Component design, import rules, anti-patterns
   - `references/TYPESCRIPT_CONVENTION.md` — Type system, async/await, import ordering
   - `references/COMMON_CONVENTION.md` — Naming, error handling, logging

## Workflow

Follow these steps sequentially. Skip a step only when it does not apply to the task.

### Step 1: Classify the State Type

Every piece of state must fall into exactly one category:

| State Type | Tool | When to Use |
|------------|------|-------------|
| Server state | TanStack Query | Data from APIs (product lists, user profiles, order history) |
| URL state | nuqs | Pagination, filters, sorting, tabs — anything shareable via URL |
| Local state | useState / useReducer | Single-component state (modal open, input value, toggle) |
| Global UI state | Zustand (last resort) | Pure UI state shared across multiple pages (sidebar, toast queue) |

Decision flow:
1. Data from API? → TanStack Query. Never copy into Zustand.
2. Should reflect in URL? → nuqs. Not Zustand or useState.
3. Form input? → React Hook Form. Not a global store.
4. Used in one component only? → useState. Not Zustand.
5. Shared parent-child ≤2 levels? → Props or Compound Component.
6. Shared ≥3 levels? → Context/Compound first. Zustand only if cross-page pure UI state.

### Step 2: Determine Fetching Strategy

| Scenario | Method |
|----------|--------|
| Initial page load + SEO | Server Component fetch |
| Form submission, create/update/delete | Server Actions |
| External webhooks, third-party API integration | Route Handlers |
| Client interaction-driven data refresh | TanStack Query |
| Real-time data (polling, infinite scroll) | TanStack Query |

If **initial page data**: go to Step 3. If **mutations**: go to Step 4.
If **client-side data**: go to Step 5. If **URL state**: go to Step 6.
If **client UI state**: go to Step 7.

### Step 3: Server Component Fetch

See `references/NEXTJS_CONVENTION.md` sections 4 and 5 for details.

- Explicitly set `cache` or `revalidate` option on every fetch call — omitting causes unintended caching.
- Use `Suspense` boundaries for independent data sections to enable streaming.

### Step 4: Server Actions

See `references/NEXTJS_CONVENTION.md` section 4 for details.

- Call `revalidatePath()` or `revalidateTag()` after mutations.
- Validate input with Zod before processing.

### Step 5: TanStack Query (Client-Side Data)

#### 5a: Define Query Options Factory

Place query option factories in `features/{domain}/api/query-options.ts`. Use native `queryOptions` from TanStack Query. Keep `queryFn` as a pure API call only — no `select` or view transforms here.

Use auto-generated API types from `@/types/generated/` as-is for request/response types.

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
      queryFn: () => apiClient.get(`/orders/${params.id}`),
    }),
};
```

#### 5b: Custom Query Hooks

Place hooks in `features/{domain}/api/`, one file per endpoint (e.g., `use-orders-query.ts`). Encapsulate all `useQuery`/`useMutation` calls in custom hooks — never call them directly in components. Co-locate endpoint-specific transforms, helper types, and `select` logic as private within the hook file.

Use `useSuspenseQuery` by default. Use `useQuery` only when conditional fetching (`enabled` option) or partial loading is needed.

```typescript
// features/order/api/use-orders-query.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import type { GetOrdersResponse } from '@/types/generated/order.generated';
import { orderQueries } from './query-options';

// Private transform — co-located in the hook file, NOT in query-options
type OrderListItem = {
  id: string;
  title: string;
  statusLabel: string;
};

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

Conditional fetching example:

```typescript
export function useUserOrdersQuery(userId: string | undefined) {
  return useQuery({
    ...orderQueries.list({ userId }),
    enabled: !!userId,
  });
}
```

#### 5c: Cache Strategy

Set `staleTime` and `gcTime` based on data change frequency:

| Data Type | staleTime | gcTime | Examples |
|-----------|-----------|--------|----------|
| Frequently changing | 30s–1min | 5min | Real-time inventory, notification count |
| Normal | 5min (default) | 10min | Product list, order history |
| Rarely changing | 30min–1hr | 2hr | Category list, announcements |
| Never changing | Infinity | 24hr | Country codes, exchange rate dates |

#### 5d: Optimistic Updates with Rollback

Apply for UX-critical mutations. Follow this 5-step pattern:

```typescript
export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrder,
    onMutate: async (updatedOrder) => {
      const queryKey = orderQueries.detail({ id: updatedOrder.id }).queryKey;
      // 1. Cancel in-flight refetches
      await queryClient.cancelQueries({ queryKey });
      // 2. Snapshot previous value
      const previousOrder = queryClient.getQueryData(queryKey);
      // 3. Optimistically update cache
      queryClient.setQueryData(queryKey, (old: Order) => ({ ...old, ...updatedOrder }));
      return { previousOrder };
    },
    onError: (_err, updatedOrder, context) => {
      // 4. Rollback on error
      if (context?.previousOrder) {
        queryClient.setQueryData(
          orderQueries.detail({ id: updatedOrder.id }).queryKey,
          context.previousOrder,
        );
      }
    },
    onSettled: (_data, _error, updatedOrder) => {
      // 5. Sync with server data regardless of success/failure
      queryClient.invalidateQueries({
        queryKey: orderQueries.detail({ id: updatedOrder.id }).queryKey,
      });
    },
  });
}
```

Always invalidate related queries after mutation success:

```typescript
export function useDeleteOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueries.all });
    },
  });
}
```

#### 5e: Global Error/Success Handling

Set up `QueryCache` and `MutationCache` for centralized error toasts, 401 redirect, and mutation success feedback:

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

Use `meta.successMessage` in mutations for toast feedback:

```typescript
export function useUpdateOrderMutation(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOrderDto) => apiClient.put(`/orders/${orderId}`, data),
    meta: { successMessage: 'Order updated successfully.' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueries.all });
    },
  });
}
```

#### 5f: Dependent Queries

Use the `enabled` option when one query depends on another's result:

```typescript
function UserOrders() {
  const { data: user } = useCurrentUser();
  const { data: orders, isPending } = useUserOrdersQuery(user?.id);
  // useUserOrdersQuery internally uses enabled: !!userId
  if (isPending) return <OrderListSkeleton />;
  return <DataTable data={orders ?? []} columns={ORDER_COLUMNS} />;
}
```

### Step 6: URL State with nuqs

Manage filters, sorting, and pagination as URL state using nuqs (`useQueryStates`). Never manage these with Zustand or useState.

#### 6a: Define Type-Safe Parsers

```typescript
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from 'nuqs';

const searchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  size: parseAsInteger.withDefault(20),
  status: parseAsStringLiteral(['all', 'pending', 'confirmed'] as const).withDefault('all'),
};
```

#### 6b: searchParams → queryKey → useQuery Integration

URL changes automatically trigger refetch because parsed values flow into the query key:

```typescript
function OrderList() {
  const [{ page, size, status }, setParams] = useQueryStates(searchParamsParsers);
  const { data, isPending } = useOrdersQuery({ page, size, status });

  const handlePageChange = (nextPage: number) => {
    setParams({ page: nextPage });
  };

  if (isPending) return <OrderListSkeleton />;
  return (
    <div>
      <DataTable data={data?.orders ?? []} columns={ORDER_COLUMNS} />
      <Pagination currentPage={page} totalPages={data?.totalPages ?? 1} onPageChange={handlePageChange} />
    </div>
  );
}
```

#### 6c: Search Input Pattern

Use uncontrolled input + `form onSubmit` — never local state + `useEffect` sync:

```tsx
const [{ search: appliedSearch }, setParams] = useQueryStates({
  search: parseAsString.withDefault(''),
});

const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const value = (formData.get('search') as string) || '';
  void setParams({ search: value, page: 1 });
};

<form onSubmit={handleSearchSubmit}>
  <input key={appliedSearch} name="search" defaultValue={appliedSearch} />
  <button type="submit">Search</button>
</form>
```

The `key={appliedSearch}` auto-resets the input on URL changes (e.g., browser back), avoiding unnecessary re-renders during typing.

### Step 7: Zustand (Client UI State)

#### 7a: Feature-Scoped Stores

Create independent Zustand stores per feature domain in `features/{domain}/store/`. Apply `devtools` (outermost) + `persist` with `partialize` to exclude transient data:

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

#### 7b: Selectors

Always use individual selectors to prevent unnecessary re-renders. Never destructure the entire store:

```typescript
// Individual selectors
const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
const toggleSidebar = useUIStore((state) => state.toggleSidebar);
```

When selecting multiple values, use `useShallow` for shallow comparison:

```typescript
import { useShallow } from 'zustand/react/shallow';

const { isSidebarOpen, notifications } = useUIStore(
  useShallow((s) => ({ isSidebarOpen: s.isSidebarOpen, notifications: s.notifications })),
);
```

### Step 8: Verify

Run through this checklist before considering the task complete:

1. Every Server Component fetch call has explicit `cache` or `revalidate` option
2. Server data uses only TanStack Query — never duplicated in Zustand
3. Query options use native `queryOptions` factory in `features/{domain}/api/query-options.ts`
4. Custom hooks in `features/{domain}/api/use-{name}-query.ts` — no direct useQuery/useMutation in components
5. `select`/transforms are in hook files, not in query-options
6. Mutations invalidate related queries on success
7. URL state (filters, pagination, sorting) uses nuqs, not useState or Zustand
8. Zustand uses feature-scoped stores with `devtools` + `persist` + `partialize`
9. Store subscriptions use individual selectors (or `useShallow` for multiple values)
10. API calls go through `apiClient`, never raw `fetch`/`axios` in components

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|---|---|
| `useEffect` + `fetch` for server data | Use TanStack Query custom hooks |
| Copying TanStack Query data into Zustand via `useEffect` | Use the query hook directly in each component |
| `useState` for filters/pagination/sorting | Use nuqs `useQueryStates` |
| Local state (`isDeleteModalOpen`) in Zustand | Use `useState` in the component |
| Destructuring entire Zustand store without selector | Use individual selectors or `useShallow` |
| Writing `select`/transforms in `query-options.ts` | Co-locate in the endpoint hook file |
| Calling `fetch`/`axios` directly in components | Use `apiClient` through custom hooks |
| Mixing all state into a single Zustand store | Separate into feature-scoped stores |
| `useState` + `useEffect` sync for search input with URL | Uncontrolled input + `form onSubmit` + `key={appliedSearch}` |
