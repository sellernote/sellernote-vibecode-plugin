# State Management Convention

> This document defines the state management strategy for the frontend.
> Parent rule: FRONTEND_CONVENTION.md

---

## 1. Minimize Global State Principle

- **Rule**: [MUST] Global state (Zustand) is a **last resort**. Before adding new state, always verify "Does this state really need to be global?"

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
| URL State | Route parameters, search | nuqs | Pagination, filters, sorting |
| Local State | State within a single component | useState / useReducer | Modal open, input values, toggles |
| Global UI State | Pure UI state shared across multiple pages | Zustand (last resort) | Sidebar open/close, toast queue |

- **Rule**: [MUST] Data from the server must always be managed with TanStack Query.

- **Rule**: [MUST] State used only within a single component must use useState. Do not put it in a global store.

- **Rule**: [SHOULD] Zustand should only be used for pure UI state shared across multiple pages. Do not use Zustand for server data, URL state, form state, or local state.

## 3. Zustand Patterns

### Feature-Scoped Store

- **Rule**: [MUST] Create independent Zustand stores for each feature domain. Place them in the `features/{domain}/store/` directory.
- **Good example**:
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
- **Good example**:
  ```typescript
  // 각 feature store에서 개별 selector 사용
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const notifications = useUIStore((state) => state.notifications);
  ```

### Selecting Multiple Values with useShallow

- **Rule**: [SHOULD] When selecting multiple state values at once, use `useShallow` for shallow comparison to prevent unnecessary re-renders.
- **Good example**:
  ```typescript
  import { useShallow } from 'zustand/react/shallow';

  // 여러 값을 한 번에 선택하되, 얕은 비교로 리렌더링 최적화
  const { isSidebarOpen, notifications } = useUIStore(
    useShallow((s) => ({ isSidebarOpen: s.isSidebarOpen, notifications: s.notifications })),
  );
  ```

### Persist Middleware

- **Rule**: [SHOULD] Use `partialize` to save only necessary data to localStorage.
- **Good example**:
  ```typescript
  // features/ui/store/ui-store.ts — persist 설정 예시
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen, // 유지 필요
        // notifications 제외 - 일시적 데이터
      }),
    },
  )
  ```

## 4. TanStack Query Patterns

### TanStack Query Basic Structure

File placement and layer responsibilities follow `ARCHITECTURE_CONVENTION.md`, and this document only covers TanStack Query usage rules.

- **Rule**: [MUST] Query factories must be placed in `features/{domain}/api/query-options.ts`.
- **Rule**: [MUST] File names and placement of custom query/mutation hooks per endpoint must follow the API file structure in `ARCHITECTURE_CONVENTION.md`.
- **Rule**: [MUST] `queryFn` in `query-options.ts` should only handle pure API calls.
- **Rule**: [MUST NOT] Do not write `select` or view-specific transformation logic in `query-options.ts`.
- **Rule**: [SHOULD] Endpoint-specific transform/helper/type should be co-located as private within the endpoint hook file as defined in `ARCHITECTURE_CONVENTION.md`.
- **Rule**: [MUST] API request/response types must use the shared auto-generated types as-is.
- **Good example**:
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
  };
  ```

  ```typescript
  // features/order/api/use-orders-query.ts
  import { useSuspenseQuery } from '@tanstack/react-query';
  import type { GetOrdersRequest, GetOrdersResponse } from '@/types/generated/order.generated';
  import { orderQueries } from './query-options';

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

### useSuspenseQuery Usage

- **Rule**: [SHOULD] Use `useSuspenseQuery` for basic data fetching.
- **Rule**: [SHOULD] Use `useQuery` when conditional fetching (`enabled` option needed) or partial loading is required.
- **Rule**: [SHOULD] Follow the Suspense boundary placement principles in the Suspense section of `REACT_CONVENTION.md`.
- **Good example**:
  ```typescript
  export function useUserOrdersQuery(userId: string | undefined) {
    return useQuery({
      ...orderQueries.list({ userId }),
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
| Never changing | Infinity | 24hr | Country codes, exchange rate reference dates |

- **Good example**:
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

- **Rule**: [SHOULD] Apply optimistic updates for mutations where user experience is critical.
- **Good example**:
  ```typescript
  export function useUpdateOrderMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: updateOrder,
      onMutate: async (updatedOrder) => {
        const queryKey = orderQueries.detail({ id: updatedOrder.id }).queryKey;

        // 1. 진행 중인 refetch 취소 — 낙관적 업데이트를 덮어쓰지 않도록 방지
        await queryClient.cancelQueries({ queryKey });

        // 2. 현재 데이터 스냅샷 저장 — 에러 시 롤백에 사용
        const previousOrder = queryClient.getQueryData(queryKey);

        // 3. 낙관적 업데이트 — 서버 응답 전에 UI 즉시 반영
        queryClient.setQueryData(queryKey, (old: Order) => ({ ...old, ...updatedOrder }));

        return { previousOrder };
      },
      onError: (_err, updatedOrder, context) => {
        // 4. 에러 시 롤백 — 스냅샷으로 원래 상태 복원
        if (context?.previousOrder) {
          queryClient.setQueryData(
            orderQueries.detail({ id: updatedOrder.id }).queryKey,
            context.previousOrder,
          );
        }
      },
      onSettled: (_data, _error, updatedOrder) => {
        // 5. 성공/실패 무관하게 서버 데이터로 동기화
        queryClient.invalidateQueries({ queryKey: orderQueries.detail({ id: updatedOrder.id }).queryKey });
      },
    });
  }
  ```

### Mutation + Invalidation

- **Rule**: [MUST] Always invalidate related queries after a successful mutation.
- **Good example**:
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

## 5. TanStack Query Global Error/Success Handling

### Global Error Handler

- **Rule**: [MUST] Display global error toasts using `MutationCache.onError`.
- **Rule**: [SHOULD] Detect 401 errors in `QueryCache.onError` to handle login redirects.

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
      // 401 에러 → 로그인 리다이렉트 (토큰 갱신 실패 시)
      if (error instanceof ApiError && error.isUnauthorized()) {
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // 글로벌 에러 토스트 — ApiError의 message 표시
      const message = error instanceof ApiError
        ? error.message
        : '알 수 없는 오류가 발생했습니다.';
      toast.error(message);
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      // mutation.meta.successMessage가 있으면 성공 토스트 표시
      const successMessage = (mutation.options.meta as { successMessage?: string })?.successMessage;
      if (successMessage) {
        toast.success(successMessage);
      }
    },
  }),
});
```

### Mutation Feedback Pattern

- **Rule**: [SHOULD] Provide feedback to users via toast on mutation success/error. When using the global handler, set `meta.successMessage`.

```typescript
// features/order/api/use-update-order-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { orderQueries } from './query-options';

export function useUpdateOrderMutation(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrderDto) => apiClient.put(`/orders/${orderId}`, data),
    meta: { successMessage: '주문이 수정되었습니다.' }, // 글로벌 onSuccess에서 토스트 표시
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueries.all });
    },
    // onError는 글로벌 MutationCache.onError에서 처리
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

- **Rule**: [MUST] Manage filters, sorting, and pagination as URL state using nuqs (`useQueryStates`). Do not manage them with Zustand or useState.

### Search Input Pattern

- **Rule**: [MUST] When managing search terms on list pages as URL query strings, use the uncontrolled input + `form onSubmit` pattern instead of local state + `useEffect` synchronization.
- **Rule**: [MUST NOT] Do not duplicate `appliedSearch` with `useState` and re-synchronize with `useEffect`.
- **Rule**: [SHOULD] Use `key={appliedSearch}`, `defaultValue={appliedSearch}`, and `name="search"` together on the input.
- **Good example**:

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

- **Effect**: When the URL changes (e.g., via browser back navigation), the `key` automatically resets the input, and unnecessary re-renders during typing are reduced.

### searchParams Parser Definition

- **Rule**: [MUST] Define searchParams in a type-safe manner using nuqs built-in parsers such as `parseAsInteger` and `parseAsStringLiteral`.

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
  // 1. nuqs로 URL 파라미터를 타입 안전하게 파싱
  const [{ page, size, status }, setParams] = useQueryStates(searchParamsParsers);

  // 2. 파싱된 값을 queryKey에 포함 → URL 변경 시 자동 refetch
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

- **Rule**: [SHOULD] Use the `enabled` option when the next query can only execute after the previous query's result is available.

```typescript
// 사용자 정보를 먼저 가져온 후, 해당 사용자의 주문 목록을 가져오는 패턴
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
// 카테고리 선택 → 해당 카테고리의 상품 목록 조회
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

## 8. Server State Duplication Prohibited

- **Rule**: [MUST NOT] Do not copy server data managed by TanStack Query into a Zustand store.
- **Bad example**:
  ```typescript
  function UserProfile() {
    const { data: user } = useUser();
    const setUser = useAuthStore((state) => state.setUser);
    useEffect(() => {
      if (user) setUser(user); // TanStack Query 캐시와 Zustand 사이에 동기화 문제!
    }, [user, setUser]);
    const storedUser = useAuthStore((state) => state.user);
    return <div>{storedUser?.name}</div>;
  }
  ```
- **Good example**:
  ```typescript
  // TanStack Query 훅을 직접 사용 - 단일 데이터 소스 보장
  function UserProfile() {
    const { data: user, isLoading } = useUser();
    if (isLoading) return <Skeleton />;
    return <div>{user?.name}</div>;
  }
  // 여러 컴포넌트에서 동일한 훅을 호출해도 캐시를 공유하므로 중복 요청 없음
  function UserAvatar() {
    const { data: user } = useUser();
    return <Avatar src={user?.avatarUrl} />;
  }
  ```

## 9. Anti-Patterns

### 1. Global State Abuse

- **Rule**: [MUST NOT] Do not store data in Zustand when local state is sufficient.
- **Bad example**:
  ```typescript
  // Zustand store에 로컬 상태를 넣는다
  interface StoreState {
    isDeleteModalOpen: boolean;
    searchInputValue: string;
    isDropdownOpen: boolean;
  }
  ```
- **Good example**:
  ```typescript
  function ProductCard() {
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    return <Modal open={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} />;
  }
  ```

### 2. useEffect + fetch Pattern

- **Rule**: [MUST NOT] Do not manage server data by calling fetch inside useEffect instead of using TanStack Query.
- **Bad example**:
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
- **Good example**:
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

### 4. Subscribing to the Entire Store Without a Selector

- **Rule**: [MUST NOT] Do not subscribe to the entire store without a selector.
- **Bad example**:
  ```typescript
  const { isSidebarOpen, notifications, toggleSidebar } = useUIStore();
  ```
- **Good example**:
  ```typescript
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  ```

### 5. Defining Transformation Logic Directly in queryOptions

- **Rule**: [MUST NOT] Do not define transformation functions directly in `query-options.ts`. Endpoint-specific transformations must follow the endpoint hook file rules in `ARCHITECTURE_CONVENTION.md`.

### 6. Duplicating Server State into Zustand

- **Rule**: [MUST NOT] Do not copy server data managed by TanStack Query into a Zustand store using useEffect.