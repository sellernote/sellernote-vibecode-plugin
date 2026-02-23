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

Determine which state type applies. Every piece of state MUST fall into exactly one category:

| State Type | Tool | When to Use |
|------------|------|-------------|
| Server state | TanStack Query | Data from APIs (product lists, user profiles, order history) |
| Client state | Zustand | Shared UI state, user settings (sidebar open/closed, theme, notifications) |
| Local state | useState | Single-component state (modal open, input value, toggle) |
| URL state | useSearchParams | Pagination, filters, sort order |

Rules:
- [MUST] Server data is managed exclusively by TanStack Query
- [MUST] Single-component state uses useState
- [SHOULD] Multi-component shared UI state uses Zustand
- [MUST NOT] Store local state in Zustand (e.g., `isDeleteModalOpen`, `searchInputValue`)

### Step 2: Determine Server vs Client Data Fetching

Choose the fetching strategy based on the scenario:

| Scenario | Method |
|----------|--------|
| Initial page load + SEO | Server Component fetch |
| Form submission, create/update/delete | Server Actions |
| External webhooks, third-party API integration | Route Handlers |
| Client interaction-driven data refresh | TanStack Query |
| Real-time data (polling, infinite scroll) | TanStack Query |

If the task involves **initial page data**: go to Step 3 (Server Component Fetch).
If the task involves **mutations**: go to Step 4 (Server Actions).
If the task involves **client-side data**: go to Step 5 (TanStack Query).
If the task involves **client UI state**: go to Step 6 (Zustand).

### Step 3: Server Component Fetch

Use async/await directly in Server Components for initial page data.

```typescript
// app/products/page.tsx (Server Component)
export default async function ProductsPage() {
  const products = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 },
  }).then((res) => res.json());

  return <ProductList products={products} />;
}
```

Rules:
- [MUST] Set explicit `cache` or `revalidate` option on every fetch call
- [MUST NOT] Omit cache options (default behavior may cause unexpected caching)
- [SHOULD] Use `Suspense` boundaries for independent data sections to enable streaming

Cache option reference:

| Option | Behavior |
|--------|----------|
| `cache: 'force-cache'` | Cache-first (default) |
| `cache: 'no-store'` | Always fresh data |
| `next: { revalidate: N }` | Revalidate every N seconds |
| `next: { tags: ['tag'] }` | Tag-based revalidation |

Streaming pattern:

```typescript
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>
    </main>
  );
}
```

### Step 4: Server Actions

Use Server Actions for all data mutations (create, update, delete).

```typescript
// app/actions/post.ts
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.post.create({ data: { title, content } });
  revalidatePath('/posts');
}

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });
  revalidatePath('/products');
  revalidateTag('product-detail');
}
```

Rules:
- [MUST] Mark file with `'use server'` at the top
- [MUST] Call `revalidatePath()` or `revalidateTag()` after mutations to invalidate cache
- [SHOULD] Validate input with Zod before processing
- [MAY] Use Route Handlers only when Server Actions are insufficient (webhooks, third-party APIs)

### Step 5: TanStack Query (Client-Side Data)

#### 5a: Define Query Key Factory

Create `queries/queryKeys.ts` using `@lukemorales/query-key-factory`:

```typescript
// queries/queryKeys.ts
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

Rules:
- [MUST] Use `@lukemorales/query-key-factory` for all query keys
- [MUST NOT] Use raw string arrays for query keys (error-prone, no type safety)

#### 5b: Create Custom Query Hooks

Place in `queries/` directory, one file per domain:

```typescript
// queries/useProducts.ts
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

Rules:
- [MUST] Place query/mutation hooks in `queries/` directory
- [MUST] Encapsulate all `useQuery`/`useMutation` calls in custom hooks
- [MUST] Invalidate related queries after mutation success
- [MUST NOT] Call `useQuery` directly in components (use custom hooks)
- [SHOULD] Set `staleTime` and `gcTime` based on data change frequency

Cache strategy reference:

| Data Type | staleTime | gcTime | Examples |
|-----------|-----------|--------|----------|
| Frequently changing | 30s - 1min | 5min | Real-time stock, notification count |
| Normal | 5min (default) | 10min | Product list, order history |
| Rarely changing | 30min - 1hr | 2hr | Categories, announcements |
| Static | Infinity | 24hr | Country codes, exchange rate dates |

#### 5c: Optimistic Updates with Rollback

Apply for UX-critical mutations:

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

Rules:
- [SHOULD] Apply optimistic updates for user-facing mutations
- [MUST] Implement rollback in `onError` when using optimistic updates
- [MUST] Call `cancelQueries` before `setQueryData` to prevent race conditions

### Step 6: Zustand (Client UI State)

#### 6a: Create Slices

Place in `store/slices/` directory, one file per domain:

```typescript
// store/slices/uiSlice.ts
import type { StateCreator } from 'zustand';

export interface UISlice {
  isSidebarOpen: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
}

export const createUISlice: StateCreator<UISlice & UserSlice, [], [], UISlice> = (set) => ({
  isSidebarOpen: true,
  notifications: [],
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  addNotification: (notification) =>
    set((state) => ({ notifications: [...state.notifications, notification] })),
});
```

Rules:
- [MUST] Use `StateCreator` type for slice definitions
- [MUST] Place slices in `store/slices/` directory
- [SHOULD] Split by domain (user, UI, settings, etc.)

#### 6b: Combine Store with Middleware

```typescript
// store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createUserSlice, type UserSlice } from './slices/userSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';

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

Rules:
- [MUST] Apply `devtools` middleware (outermost)
- [MUST] Apply `persist` middleware with `partialize` for selective persistence
- [MUST NOT] Persist all state (transient UI data should be excluded)

#### 6c: Export Selectors

```typescript
// store/selectors.ts
export const useUser = () => useStore((state) => state.user);
export const useIsSidebarOpen = () => useStore((state) => state.isSidebarOpen);
export const useToggleSidebar = () => useStore((state) => state.toggleSidebar);
```

Rules:
- [MUST] Export individual selectors for each piece of state
- [MUST NOT] Destructure the entire store (`const { user, sidebar } = useStore()`)

### Step 7: Verify

1. Every fetch call has explicit `cache` or `revalidate` option
2. Server data is managed only by TanStack Query (not duplicated in Zustand)
3. Query keys use `@lukemorales/query-key-factory`
4. Mutations invalidate related queries on success
5. Zustand uses slice pattern with `devtools` + `persist` middleware

## Quick Reference: MUST / MUST NOT

### State Classification
| Rule | Detail |
|------|--------|
| MUST | Classify every state into one of 4 types: Server, Client, Local, URL |
| MUST | Use TanStack Query for all server state |
| MUST | Use useState for single-component local state |
| MUST NOT | Duplicate server state (TanStack Query data) into Zustand |
| MUST NOT | Store local state (modal open, input value) in Zustand |

### Server Component Fetch
| Rule | Detail |
|------|--------|
| MUST | Use Server Components for initial page data load |
| MUST | Set explicit `cache` or `revalidate` on every fetch call |
| SHOULD | Use Suspense boundaries for streaming independent sections |
| MUST NOT | Omit cache options on fetch calls |

### Server Actions
| Rule | Detail |
|------|--------|
| MUST | Use Server Actions for create/update/delete mutations |
| MUST | Call `revalidatePath` or `revalidateTag` after mutations |
| MUST | Mark files with `'use server'` directive |

### TanStack Query
| Rule | Detail |
|------|--------|
| MUST | Use `@lukemorales/query-key-factory` for type-safe query keys |
| MUST | Place custom hooks in `queries/` directory |
| MUST | Invalidate related queries after mutation success |
| MUST | Implement rollback in `onError` for optimistic updates |
| MUST NOT | Use raw string arrays for query keys |
| MUST NOT | Call `useQuery`/`useMutation` directly in components |
| MUST NOT | Use `useEffect` + `fetch` for data fetching |

### Zustand
| Rule | Detail |
|------|--------|
| MUST | Use slice pattern in `store/slices/` directory |
| MUST | Apply `devtools` + `persist` middleware |
| MUST | Use `partialize` for selective persistence |
| MUST | Export individual selectors (not whole-store destructuring) |
| MUST NOT | Duplicate TanStack Query data in Zustand store |
| SHOULD NOT | Put all state in a single monolithic store |

### Environment Variables
| Rule | Detail |
|------|--------|
| MUST | Use `NEXT_PUBLIC_` prefix only for non-sensitive, client-exposed variables |
| MUST NOT | Use `NEXT_PUBLIC_` for API keys, secrets, DB URLs, or tokens |

### Components
| Rule | Detail |
|------|--------|
| MUST | Default to Server Components; add `'use client'` only when needed |
| MUST | Place `'use client'` boundary at the lowest possible leaf node |
| MUST NOT | Use `useState`/`useEffect` in Server Components |
| MUST NOT | Use `'use client'` on components that do not need client features |
