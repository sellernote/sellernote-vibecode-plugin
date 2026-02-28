# State Management Convention

> This document defines the state management strategy for the frontend.
> It clearly separates client state (Zustand) and server state (TanStack Query).
> Parent rule: FRONTEND_CONVENTION.md

## State Classification Criteria

- **Rule**: [MUST] All state must be classified into one of the 4 types below, and the appropriate tool for each type must be used.

| State Type | Description | Tool | Examples |
|----------|------|------|------|
| Server State | Data fetched from APIs | TanStack Query | Product list, user profile, order history |
| Client State | UI state, user settings | Zustand | Sidebar open/close, theme, notifications |
| Local State | State within a single component | useState | Modal open, input values, toggles |
| URL State | Route parameters, search | useSearchParams | Pagination, filters, sorting |

- **Rule**: [MUST] Data from the server must be managed with TanStack Query.
- **Rule**: [MUST] State used only within a single component must use useState.
- **Rule**: [SHOULD] UI state shared across multiple components should use Zustand.

## Zustand Patterns

### Slice Pattern

- **Rule**: [MUST] Domain-specific stores create slice files in `features/{domain}/store/`, global UI stores in `shared/store/`, using the `StateCreator` type.
  ```typescript
  // features/user/store/userSlice.ts
  import { StateCreator } from 'zustand';

  export interface UserSlice {
    user: User | null;
    setUser: (user: User) => void;
    updatePreferences: (prefs: Partial<UserPreferences>) => void;
    logout: () => void;
  }

  export const createUserSlice: StateCreator<UserSlice & UISlice, [], [], UserSlice> = (set) => ({
    user: null,
    setUser: (user) => set({ user }),
    updatePreferences: (prefs) =>
      set((state) => ({
        user: state.user
          ? { ...state.user, preferences: { ...state.user.preferences, ...prefs } }
          : null,
      })),
    logout: () => set({ user: null }),
  });

  // shared/store/uiSlice.ts
  export interface UISlice {
    isSidebarOpen: boolean;
    notifications: Notification[];
    toggleSidebar: () => void;
    addNotification: (notification: Notification) => void;
  }

  export const createUISlice: StateCreator<UserSlice & UISlice, [], [], UISlice> = (set) => ({
    isSidebarOpen: true,
    notifications: [],
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    addNotification: (notification) =>
      set((state) => ({ notifications: [...state.notifications, notification] })),
  });
  ```

### Store Composition

- **Rule**: [MUST] Create the store by combining `devtools` and `persist` middleware in the `create` function.
  ```typescript
  // shared/store/index.ts — global UI store (global UI state)
  import { create } from 'zustand';
  import { devtools, persist } from 'zustand/middleware';

  type StoreState = UserSlice & UISlice;

  export const useStore = create<StoreState>()(
    devtools(
      persist(
        (...a) => ({ ...createUserSlice(...a), ...createUISlice(...a) }),
        {
          name: 'app-store',
          partialize: (state) => ({ user: state.user, isSidebarOpen: state.isSidebarOpen }),
        },
      ),
      { name: 'AppStore' },
    ),
  );

  // Domain-specific stores are defined independently in features/{domain}/store/.
  // Example: features/order/store/index.ts
  ```

### Selector Optimization

- **Rule**: [MUST] Export individual selectors to prevent unnecessary re-renders. Do not subscribe to the entire store.

```typescript
// features/user/store/selectors.ts
export const useUser = () => useStore((state) => state.user);

// shared/store/selectors.ts
export const useIsSidebarOpen = () => useStore((state) => state.isSidebarOpen);
export const useToggleSidebar = () => useStore((state) => state.toggleSidebar);
```

### Persist Middleware

- **Rule**: [SHOULD] Use `partialize` to save only necessary data to localStorage.

```typescript
persist(storeCreator, {
  name: 'app-store',
  partialize: (state) => ({
    user: state.user,
    isSidebarOpen: state.isSidebarOpen,
    // Exclude notifications - transient data
  }),
})
```

## TanStack Query Patterns

### Query Key Factory

- **Rule**: [MUST] Use `@lukemorales/query-key-factory` to manage query keys consistently.

```typescript
// features/product/queries/queryKeys.ts
import { createQueryKeys } from '@lukemorales/query-key-factory';

export const productKeys = createQueryKeys('products', {
  all: null,
  list: (filters: ProductFilters) => ({ queryKey: [filters] }),
  detail: (id: string) => ({ queryKey: [id] }),
});
```

### Custom Hooks

- **Rule**: [MUST] Create domain-specific files in the `features/{domain}/queries/` directory and encapsulate query/mutation logic in custom hooks.
  ```typescript
  // features/product/queries/useProducts.ts
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { productKeys } from './queryKeys';

  export function useProducts(filters: ProductFilters) {
    return useQuery({
      ...productKeys.list(filters),
      queryFn: () => fetchProducts(filters),
      staleTime: 5 * 60 * 1000,
    });
  }

  export function useProduct(id: string) {
    return useQuery({
      ...productKeys.detail(id),
      queryFn: () => fetchProduct(id),
      enabled: !!id,
    });
  }

  export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: createProduct,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
      },
    });
  }
  ```

### Cache Strategy

- **Rule**: [SHOULD] Set `staleTime` and `gcTime` based on how frequently the data changes.

| Data Type | staleTime | gcTime | Examples |
|------------|-----------|--------|------|
| Frequently changing | 30s ~ 1min | 5min | Real-time inventory, notification count |
| Moderate | 5min (default) | 10min | Product list, order history |
| Rarely changing | 30min ~ 1hr | 2hr | Category list, announcements |
| Never changing | Infinity | 24hr | Country codes, exchange rate reference date |

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

- **Rule**: [SHOULD] Apply optimistic updates to mutations where user experience is important.
  ```typescript
  export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: updateProduct,
      onMutate: async (updatedProduct) => {
        const detailKey = productKeys.detail(updatedProduct.id).queryKey;
        await queryClient.cancelQueries({ queryKey: detailKey }); // 1. Cancel refetch
        const previousProduct = queryClient.getQueryData(detailKey); // 2. Save snapshot
        queryClient.setQueryData(detailKey, (old: Product) => ({ ...old, ...updatedProduct })); // 3. Optimistic update
        return { previousProduct };
      },
      onError: (_err, updatedProduct, context) => {
        if (context?.previousProduct) { // Rollback on error
          queryClient.setQueryData(
            productKeys.detail(updatedProduct.id).queryKey, context.previousProduct,
          );
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
      },
    });
  }
  ```

### Mutation + Invalidation

- **Rule**: [MUST] Always invalidate related queries after a successful mutation.

```typescript
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
    },
  });
}
```

## No Server State Duplication

- **Rule**: [MUST NOT] Do not copy server data managed by TanStack Query into a Zustand store. Use TanStack Query hooks directly to ensure a single source of truth.

```typescript
// Use TanStack Query hooks directly - ensures a single source of truth
function UserProfile() {
  const { data: user, isLoading } = useUser();
  if (isLoading) return <Skeleton />;
  return <div>{user?.name}</div>;
}
// Even when multiple components call the same hook, the cache is shared so there are no duplicate requests
function UserAvatar() {
  const { data: user } = useUser();
  return <Avatar src={user?.avatarUrl} />;
}
```

## Anti-Patterns

- **Rule**: [MUST NOT] Do not store data in Zustand when local state is sufficient. Use useState for single component state.
- **Rule**: [MUST NOT] Do not manage server data by calling fetch inside useEffect instead of using TanStack Query.
- **Rule**: [SHOULD NOT] Do not put state with different concerns all in one store. Separate slices by domain in `features/{domain}/store/`.
- **Rule**: [MUST NOT] Do not subscribe to the entire store without using a selector.

```typescript
// Use individual selectors
const theme = useStore((state) => state.theme);
```