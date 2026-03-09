# State Management Convention

> This document defines the state management strategy for the frontend.
> Parent rule: FRONTEND_CONVENTION.md

---

## 1. Minimize Global State Principle

- **Rule**: [MUST] Global state (Zustand) is a **last resort**. Before adding a new state, always verify "Does this state really need to be global?"

```text
새로운 상태가 필요하다
|
+-- 서버에서 온 데이터인가? (API 응답)
|   +-- YES -> TanStack Query — Zustand에 복사 금지
|
+-- URL에 반영해야 하는가? (필터, 정렬, 페이지네이션, 탭)
|   +-- YES -> nuqs — 링크 공유, 북마크, 뒤로가기 보존
|
+-- 폼 입력값인가?
|   +-- YES -> React Hook Form — 전역 store 불필요
|
+-- 단일 컴포넌트에서만 사용하는가?
|   +-- YES -> useState / useReducer — 전역화 금지
|
+-- 부모-자식 2단계 이하에서 공유하는가?
|   +-- YES -> props 전달 또는 Compound Component 패턴
|
+-- 부모-자식 3단계 이상인가?
|   +-- YES -> Context/Compound 우선
|            여러 페이지 전역 UI 상태라면 Zustand
|
+-- 위 모두 해당하지 않고, 여러 페이지에서 공유하는 순수 UI 상태인가?
    +-- YES -> Zustand (이 경우에만 사용)
    예시: 사이드바 열림/닫힘, 토스트 큐, 테마 설정
```

## 2. State Classification Criteria

- **Rule**: [MUST] All state must be classified into one of the following 4 types, and the appropriate tool must be used for each type.

| State Type | Description | Tool | Examples |
|----------|------|------|------|
| Server State | Data fetched from API | TanStack Query | Product list, user profile, order history |
| URL State | Route parameters, search | nuqs | Pagination, filter, sort |
| Local State | State within a single component | useState / useReducer | Modal open, input value, toggle |
| Global UI State | Pure UI state shared across multiple pages | Zustand (last resort) | Sidebar open/close, toast queue |

- **Rule**: [MUST] Data from the server must always be managed with TanStack Query.

- **Rule**: [MUST] State used only within a single component must use useState. Do not put it in a global store.

- **Rule**: [SHOULD] Zustand should only be used for pure UI state shared across multiple pages. Do not use Zustand for server data, URL state, form state, or local state.

## 3. Zustand Patterns

### Feature-Scoped Store

- **Rule**: [MUST] Create an independent Zustand store for each feature domain. Place them in the `features/{domain}/store/` directory.
- **Good Example**:
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

### Selector Optimization

- **Rule**: [MUST] Export individual selectors to prevent unnecessary re-renders.
- **Good Example**:
  ```typescript
  // Use individual selectors from each feature store
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const notifications = useUIStore((state) => state.notifications);
  ```

### Selecting Multiple Values with useShallow

- **Rule**: [SHOULD] When selecting multiple state values at once, use `useShallow` to prevent unnecessary re-renders through shallow comparison.
- **Good Example**:
  ```typescript
  import { useShallow } from 'zustand/react/shallow';

  // Select multiple values at once with shallow comparison for re-render optimization
  const { isSidebarOpen, notifications } = useUIStore(
    useShallow((s) => ({ isSidebarOpen: s.isSidebarOpen, notifications: s.notifications })),
  );
  ```

### Persist Middleware

- **Rule**: [SHOULD] Use `partialize` to save only necessary data to localStorage.
- **Good Example**:
  ```typescript
  // features/ui/store/ui-store.ts — persist configuration example
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen, // needs to be persisted
        // notifications excluded - transient data
      }),
    },
  )
  ```

## 4. TanStack Query Patterns

### TanStack Query Basic Structure

File placement and layer responsibilities follow `ARCHITECTURE_CONVENTION.md` as the standard; this document only covers TanStack Query usage rules.

- **Rule**: [MUST] Query factories must be placed in `features/{domain}/api/query-options.ts`.
- **Rule**: [MUST] File naming and placement of per-endpoint query/mutation custom hooks must follow the API file structure defined in `ARCHITECTURE_CONVENTION.md`.
- **Rule**: [MUST] `queryFn` in `query-options.ts` must only handle pure API calls.
- **Rule**: [MUST NOT] Do not write `select` or view-specific transformation logic in `query-options.ts`.
- **Rule**: [SHOULD] Endpoint-specific transforms/helpers/types should be co-located as private within the endpoint hook file as defined in `ARCHITECTURE_CONVENTION.md`.
- **Rule**: [MUST] API request/response types must use the shared auto-generated types as-is.
- **Good Example**:
  ```typescript
  // features/order/api/query-options.ts
  import { queryOptions } from '@tanstack/react-query';
  import { apiClient } from '@/lib/api-client';
  import type { GetOrdersRequest, GetOrdersResponse } from '@/types/generated/order.generated';

  const fetchOrders = (params: GetOrdersRequest): Promise<GetOrdersResponse> =>
    apiClient.get('/orders', { params });

  export const orderQueryOptions = {
    all: ['orders'] as const,
    list: (params: GetOrdersRequest) =>
      queryOptions({
        queryKey: [...orderQueryOptions.all, 'list', params] as const,
        queryFn: () => fetchOrders(params),
      }),
  };
  ```

  ```typescript
  // features/order/api/use-orders-query.ts
  import { useSuspenseQuery } from '@tanstack/react-query';
  import type { GetOrdersRequest, GetOrdersResponse } from '@/types/generated/order.generated';
  import { orderQueryOptions } from './query-options';

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
      ...orderQueryOptions.list(params),
      select: toOrderListItem,
    });
  }
  ```

### useSuspenseQuery Usage

- **Rule**: [SHOULD] Use `useSuspenseQuery` for basic data fetching.
- **Rule**: [SHOULD] Use `useQuery` when conditional fetching (`enabled` option needed) or partial loading is required.
- **Rule**: [SHOULD] Follow the Suspense boundary placement principles from the Suspense section of `REACT_CONVENTION.md`.
- **Good Example**:
  ```typescript
  export function useUserOrdersQuery(userId: string | undefined) {
    return useQuery({
      ...orderQueryOptions.list({ userId }),
      enabled: !!userId,
    });
  }
  ```

### Cache Strategy

- **Rule**: [SHOULD] Set `staleTime` and `gcTime` according to how frequently the data changes.

| Data Type | staleTime | gcTime | Examples |
|------------|-----------|--------|------|
| Frequently changing | 30s ~ 1min | 5min | Real-time inventory, notification count |
| Normal | 5min (default) | 10min | Product list, order history |
| Rarely changing | 30min ~ 1hr | 2hr | Category list, announcements |
| Never changing | Infinity | 24hr | Country codes, exchange rate base date |

- **Good Example**:
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
  ```

### Optimistic Updates

- **Rule**: [SHOULD] Apply optimistic updates for mutations where user experience is important.
- **Good Example**:
  ```typescript
  export function useUpdateOrderMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: updateOrder,
      onMutate: async (updatedOrder) => {
        const queryKey = orderQueryOptions.detail({ id: updatedOrder.id }).queryKey;

        // 1. Cancel in-flight refetches — prevent overwriting the optimistic update
        await queryClient.cancelQueries({ queryKey });

        // 2. Save current data snapshot — used for rollback on error
        const previousOrder = queryClient.getQueryData(queryKey);

        // 3. Optimistic update — immediately reflect in UI before server response
        queryClient.setQueryData(queryKey, (old: Order) => ({ ...old, ...updatedOrder }));

        return { previousOrder };
      },
      onError: (_err, updatedOrder, context) => {
        // 4. Rollback on error — restore original state from snapshot
        if (context?.previousOrder) {
          queryClient.setQueryData(
            orderQueryOptions.detail({ id: updatedOrder.id }).queryKey,
            context.previousOrder,
          );
        }
      },
      onSettled: (_data, _error, updatedOrder) => {
        // 5. Sync with server data regardless of success/failure
        queryClient.invalidateQueries({ queryKey: orderQueryOptions.detail({ id: updatedOrder.id }).queryKey });
      },
    });
  }
  ```

### Mutation + Invalidation

- **Rule**: [MUST] Always invalidate related queries after a successful mutation.
- **Good Example**:
  ```typescript
  export function useDeleteOrderMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => deleteOrder(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orderQueryOptions.all });
      },
    });
  }
  ```

## 5. TanStack Query Global Error/Success Handling

### Global Error Handler

- **Rule**: [MUST] Display global error toasts using `MutationCache.onError`.
- **Rule**: [SHOULD] Detect 401 errors in `QueryCache.onError` and handle login redirect.

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
      // 401 error → login redirect (when token refresh fails)
      if (error instanceof ApiError && error.isUnauthorized()) {
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Global error toast — display ApiError's message
      const message = error instanceof ApiError
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';
      toast.error(message);
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      // Display success toast if mutation.meta.successMessage exists
      const successMessage = (mutation.options.meta as { successMessage?: string })?.successMessage;
      if (successMessage) {
        toast.success(successMessage);
      }
    },
  }),
});
```

### Mutation Feedback Pattern

- **Rule**: [SHOULD] Provide toast feedback to users on mutation success/error. When leveraging the global handler, set `meta.successMessage`.

```typescript
// features/order/api/use-update-order-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { orderQueryOptions } from './query-options';

export function useUpdateOrderMutation(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrderDto) => apiClient.put(`/orders/${orderId}`, data),
    meta: { successMessage: '주문이 수정되었습니다.' }, // Toast displayed by global onSuccess
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueryOptions.all });
    },
    // onError is handled by global MutationCache.onError
  });
}
```

## 6. URL State Management (nuqs)

### nuqs Setup

- **Rule**: [SHOULD] Use nuqs for URL state management.
- **Rule**: [MUST] When using nuqs, wrap the root with `NuqsAdapter` in a React Router v7 environment.

```typescript
// app/root.tsx
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';

export default function App() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  );
}
```

### Basic Principles

- **Rule**: [MUST] Manage filter, sort, and pagination as URL state using nuqs (`useQueryStates`). Do not manage them with Zustand or useState.

### Search Input Pattern

- **Rule**: [MUST] When managing search terms as URL query strings on list pages, use the uncontrolled input + `form onSubmit` pattern instead of local state + `useEffect` synchronization.
- **Rule**: [MUST NOT] Do not duplicate `appliedSearch` with `useState` and re-synchronize with `useEffect`.
- **Rule**: [SHOULD] Use `key={appliedSearch}`, `defaultValue={appliedSearch}`, and `name="search"` together on the input.
- **Good Example**:

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

<form className="flex items-center gap-2" onSubmit={handleSearchSubmit}>
  <input
    key={appliedSearch}
    name="search"
    type="text"
    defaultValue={appliedSearch}
    placeholder="검색..."
  />
  <button type="submit">검색</button>
</form>;
```

- **Effect**: When the URL changes via browser back navigation, the input automatically resets via `key`, and unnecessary re-renders during typing are also reduced.

### searchParams Parser Definition

- **Rule**: [MUST] Define searchParams in a type-safe manner using nuqs built-in parsers such as `parseAsInteger`, `parseAsStringLiteral`, etc.

```typescript
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from 'nuqs';

const searchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  size: parseAsInteger.withDefault(20),
  status: parseAsStringLiteral(['all', 'pending', 'confirmed'] as const).withDefault('all'),
};
```

### searchParams → queryKey → useQuery Integration

```typescript
// features/order/components/order-list/OrderList.tsx
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { useOrdersQuery } from '@/features/order/api/use-orders-query';

const searchParamsParsers = {
  page: parseAsInteger.withDefault(1),
  size: parseAsInteger.withDefault(20),
  status: parseAsStringLiteral(['all', 'pending', 'confirmed'] as const).withDefault('all'),
};

function OrderList() {
  // 1. Parse URL parameters in a type-safe manner with nuqs
  const [{ page, size, status }, setParams] = useQueryStates(searchParamsParsers);

  // 2. Include parsed values in queryKey → automatic refetch on URL change
  const { data, isPending } = useOrdersQuery({ page, size, status });

  const handlePageChange = (nextPage: number) => {
    setParams({ page: nextPage });
  };

  if (isPending) return <OrderListSkeleton />;

  return (
    <div>
      <DataTable data={data?.orders ?? []} columns={ORDER_COLUMNS} />
      <Pagination
        currentPage={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
```

## 7. Dependent Query Pattern

- **Rule**: [SHOULD] Use the `enabled` option when the next query can only execute after the previous query result is available.

```typescript
// Pattern: fetch user info first, then fetch that user's order list
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useUserOrdersQuery(userId?: string) {
  return useQuery({
    queryKey: userQueries.orders(userId ?? '').queryKey,
    queryFn: () => apiClient.get<Order[]>(`/users/${userId!}/orders`),
    enabled: !!userId,
  });
}

function UserOrders() {
  const { data: user } = useCurrentUser();
  const { data: orders, isPending } = useUserOrdersQuery(user?.id);

  if (isPending) return <OrderListSkeleton />;

  return <DataTable data={orders ?? []} columns={ORDER_COLUMNS} />;
}
```

```typescript
// Category selection → fetch product list for that category
function CategoryProducts() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: categories } = useCategoriesQuery();
  const { data: products, isPending } = useCategoryProductsQuery(selectedCategoryId);

  return (
    <div>
      <CategorySelector
        categories={categories ?? []}
        selected={selectedCategoryId}
        onSelect={setSelectedCategoryId}
      />
      {selectedCategoryId && (
        isPending ? <ProductSkeleton /> : <ProductGrid products={products ?? []} />
      )}
    </div>
  );
}
```

## 8. No Server State Duplication

- **Rule**: [MUST NOT] Do not copy server data managed by TanStack Query into a Zustand store.
- **Bad Example**:
  ```typescript
  function UserProfile() {
    const { data: user } = useUser();
    const setUser = useAuthStore((state) => state.setUser);
    useEffect(() => {
      if (user) setUser(user); // Sync issue between TanStack Query cache and Zustand!
    }, [user, setUser]);
    const storedUser = useAuthStore((state) => state.user);
    return <div>{storedUser?.name}</div>;
  }
  ```
- **Good Example**:
  ```typescript
  // Use the TanStack Query hook directly — ensures a single source of truth
  function UserProfile() {
    const { data: user, isLoading } = useUser();
    if (isLoading) return <Skeleton />;
    return <div>{user?.name}</div>;
  }
  // Even when calling the same hook from multiple components, the cache is shared so there are no duplicate requests
  function UserAvatar() {
    const { data: user } = useUser();
    return <Avatar src={user?.avatarUrl} />;
  }
  ```

## 9. Anti-Patterns

### 1. Global State Overuse

- **Rule**: [MUST NOT] Do not store data in Zustand when local state is sufficient.
- **Bad Example**:
  ```typescript
  // Putting local state into a Zustand store
  interface StoreState {
    isDeleteModalOpen: boolean;
    searchInputValue: string;
    isDropdownOpen: boolean;
  }
  ```
- **Good Example**:
  ```typescript
  function ProductCard() {
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    return <Modal open={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} />;
  }
  ```

### 2. useEffect + fetch Pattern

- **Rule**: [MUST NOT] Do not manage server data by calling fetch inside useEffect instead of using TanStack Query.
- **Bad Example**:
  ```typescript
  function ProductList() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch('/api/products')
        .then((res) => res.json())
        .then(setProducts)
        .finally(() => setLoading(false));
    }, []);
  }
  ```
- **Good Example**:
  ```typescript
  function ProductList() {
    const { data: products, isLoading, error } = useProducts(filters);
    if (isLoading) return <Skeleton />;
    if (error) return <ErrorMessage error={error} />;
    return <ProductGrid products={products} />;
  }
  ```

### 3. Dumping All State into a Single Store

- **Rule**: [SHOULD NOT] Do not put state with different concerns into a single store. Separate into feature-scoped stores by domain.

### 4. Subscribing to the Entire Store Without Selectors

- **Rule**: [MUST NOT] Do not subscribe to the entire store without selectors.
- **Bad Example**:
  ```typescript
  const { isSidebarOpen, notifications, toggleSidebar } = useUIStore();
  ```
- **Good Example**:
  ```typescript
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  ```

### 5. Defining Transformation Logic Directly in queryOptions

- **Rule**: [MUST NOT] Do not define transformation functions directly in `query-options.ts`. Follow the endpoint hook file rules from `ARCHITECTURE_CONVENTION.md` for endpoint-specific transformations.

### 6. Duplicating Server State into Zustand

- **Rule**: [MUST NOT] Do not copy server data managed by TanStack Query into a Zustand store via useEffect.