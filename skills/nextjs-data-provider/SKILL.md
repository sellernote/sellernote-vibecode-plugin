---
name: nextjs-data-provider
description: Next.js data fetching and state management following Sellernote conventions. Use when implementing data fetching with Server Components, Server Actions, TanStack Query, API integration, caching strategies, revalidation triggers, Zustand state management, query key factories, optimistic updates, or any data flow in a Next.js App Router project. Also triggers on tasks involving custom query hooks, mutation patterns, cache invalidation, Zustand slice creation, state type classification, or environment variable usage.
---

# Next.js Data Provider

Implement data fetching and state management in Next.js 15 App Router projects following Sellernote conventions.

## Convention Loading

Before starting any work, read the relevant reference files from `references/` within this skill directory:

1. **Always read first** (core rules):
   - `references/STATE_CONVENTION.md` - State classification, TanStack Query patterns, Zustand patterns
   - `references/NEXTJS_CONVENTION.md` - Server/Client Components, data fetching strategies, caching

2. **Read when relevant**:
   - `references/FRONTEND_CONVENTION.md` - Component design, import rules, anti-patterns
   - `references/TYPESCRIPT_CONVENTION.md` - Type system, async/await, import ordering
   - `references/COMMON_CONVENTION.md` - Naming, error handling, logging

## Workflow

Follow these steps sequentially. Skip a step only when it does not apply to the task.

### Step 1: Classify the State Type

Every piece of state MUST fall into exactly one category:

| State Type | Tool | When to Use |
|------------|------|-------------|
| Server state | TanStack Query | Data from APIs (product lists, user profiles, order history) |
| Client state | Zustand | Shared UI state, user settings (sidebar open/closed, theme, notifications) |
| Local state | useState | Single-component state (modal open, input value, toggle) |
| URL state | useSearchParams | Pagination, filters, sort order |

Key rules:
- [MUST] Server data is managed exclusively by TanStack Query
- [MUST NOT] Duplicate server state into Zustand
- [MUST NOT] Store local state (e.g., `isDeleteModalOpen`) in Zustand

### Step 2: Determine Fetching Strategy

| Scenario | Method |
|----------|--------|
| Initial page load + SEO | Server Component fetch |
| Form submission, create/update/delete | Server Actions |
| External webhooks, third-party API integration | Route Handlers |
| Client interaction-driven data refresh | TanStack Query |
| Real-time data (polling, infinite scroll) | TanStack Query |

If **initial page data**: go to Step 3. If **mutations**: go to Step 4.
If **client-side data**: go to Step 5. If **client UI state**: go to Step 6.

### Step 3: Server Component Fetch

Follow the patterns in `references/NEXTJS_CONVENTION.md` sections 4 and 5.

Key reminders:
- [MUST] Set explicit `cache` or `revalidate` option on every fetch call
- [SHOULD] Use `Suspense` boundaries for independent data sections

### Step 4: Server Actions

Follow the patterns in `references/NEXTJS_CONVENTION.md` section 4.

Key reminders:
- [MUST] Call `revalidatePath()` or `revalidateTag()` after mutations
- [SHOULD] Validate input with Zod before processing

### Step 5: TanStack Query (Client-Side Data)

#### 5a: Define Query Key Factory

[MUST] Use `@lukemorales/query-key-factory` for all query keys. Place in `queries/queryKeys.ts`:

```typescript
import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';

export const productKeys = createQueryKeys('products', {
  all: null,
  list: (filters: ProductFilters) => ({ queryKey: [filters] }),
  detail: (id: string) => ({ queryKey: [id] }),
});

export const userKeys = createQueryKeys('users', {
  all: null,
  me: null,
  detail: (id: string) => ({ queryKey: [id] }),
  orders: (userId: string) => ({ queryKey: [userId] }),
});

export const queryKeys = mergeQueryKeys(productKeys, userKeys);
```

#### 5b: Custom Query Hooks

[MUST] Place hooks in `queries/` directory, one file per domain. Encapsulate all `useQuery`/`useMutation` calls in custom hooks -- never call them directly in components. Spread the key factory result to integrate:

```typescript
// queries/useProducts.ts
export function useProducts(filters: ProductFilters) {
  return useQuery({
    ...productKeys.list(filters),  // spreads queryKey from factory
    queryFn: () => fetchProducts(filters),
    staleTime: 5 * 60 * 1000,
  });
}
```

For cache timing guidance (`staleTime`/`gcTime` by data type), see `references/STATE_CONVENTION.md`.

#### 5c: Optimistic Updates with Rollback

Apply for UX-critical mutations. This pattern integrates the query-key-factory with cancel/snapshot/rollback:

```typescript
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProduct,
    onMutate: async (updatedProduct) => {
      const detailKey = productKeys.detail(updatedProduct.id).queryKey;
      // 1. Cancel in-flight refetches
      await queryClient.cancelQueries({ queryKey: detailKey });
      // 2. Snapshot previous value
      const previousProduct = queryClient.getQueryData(detailKey);
      // 3. Optimistically update cache
      queryClient.setQueryData(detailKey, (old: Product) => ({
        ...old,
        ...updatedProduct,
      }));
      return { previousProduct };
    },
    onError: (_err, updatedProduct, context) => {
      // Rollback on error
      if (context?.previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(updatedProduct.id).queryKey,
          context.previousProduct,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
    },
  });
}
```

Key rules:
- [MUST] Invalidate related queries after mutation success
- [MUST] Implement rollback in `onError` when using optimistic updates
- [MUST] Call `cancelQueries` before `setQueryData` to prevent race conditions

### Step 6: Zustand (Client UI State)

#### 6a: Slice Pattern with StateCreator

[MUST] Use `StateCreator` type for slices in `store/slices/`. The generic signature is the Sellernote-specific pattern:

```typescript
// store/slices/uiSlice.ts
import type { StateCreator } from 'zustand';

export interface UISlice {
  isSidebarOpen: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
}

// Generic: StateCreator<FullStoreType, [], [], ThisSlice>
export const createUISlice: StateCreator<UISlice & UserSlice, [], [], UISlice> = (set) => ({
  isSidebarOpen: true,
  notifications: [],
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  addNotification: (notification) =>
    set((state) => ({ notifications: [...state.notifications, notification] })),
});
```

#### 6b: Store with Partialize

[MUST] Apply `devtools` (outermost) + `persist` with `partialize` to exclude transient data:

```typescript
// store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type StoreState = UserSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createUISlice(...a),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          user: state.user,
          isSidebarOpen: state.isSidebarOpen,
          // Exclude transient data like notifications
        }),
      },
    ),
    { name: 'AppStore' },
  ),
);
```

#### 6c: Selectors

[MUST] Export individual selectors. Never destructure the entire store:

```typescript
// store/selectors.ts
export const useUser = () => useStore((state) => state.user);
export const useIsSidebarOpen = () => useStore((state) => state.isSidebarOpen);
```

For full Zustand patterns and anti-patterns, see `references/STATE_CONVENTION.md`.

### Step 7: Verify

1. Every fetch call has explicit `cache` or `revalidate` option
2. Server data uses only TanStack Query (not duplicated in Zustand)
3. Query keys use `@lukemorales/query-key-factory`
4. Mutations invalidate related queries on success
5. Zustand uses slice pattern with `devtools` + `persist` + `partialize`
