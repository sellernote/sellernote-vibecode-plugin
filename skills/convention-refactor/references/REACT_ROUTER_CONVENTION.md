# React Router Convention

> This document defines rules applicable to React Router 7 Framework Mode (`ssr: false` + Pre-rendering) projects.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Tech Stack

| Item | Version/Configuration |
| --- | --- |
| React Router | 7 (Framework Mode) |
| React | 19.2+ (React Compiler) |
| TypeScript | 5.x |
| Build Tool | Vite |
| Package Manager | pnpm |
| SSR | `ssr: false` (disabled) |
| Pre-rendering | Disabled by default, selective pre-rendering for public pages only |

### What is Framework Mode

React Router 7's Framework Mode provides file-based routing, type-safe route modules, and build-time pre-rendering through the Vite plugin (`@react-router/dev`).

- `ssr: false` -- Only disables runtime server rendering. In **SPA mode (without `prerender` configured)**, only the **root route** is server-rendered at build time to generate `index.html`. Therefore, the root route must be SSR-safe, and other routes are **not rendered at build time unless they are pre-render targets**.
- `prerender` -- Pre-renders specific paths to HTML at build time. Since most pages are behind authentication, it is **disabled by default**, and only public pages like login/landing are selectively pre-rendered.
- `prerender` can be configured as a path array, an async function, or in the `{ paths, unstable_concurrency }` format.
- Since there is no runtime server, `action` and `headers` exports cannot be used.
- `ssr: false` + **pre-rendering disabled** (default): `loader` is called **only in the root route**. (SPA mode)
- `ssr: false` + **pre-rendering enabled**: `loader` is called **only at build time for pre-render target paths**.
- TanStack Query is used as the single solution for runtime data fetching. `clientLoader` is only allowed for calling `ensureQueryData()` when route-level prefetching is needed. `clientAction` is used only in exceptional cases after ADR approval.

---

## 2. Project Setup

### react-router.config.ts

- **Rule**: [MUST] Create `react-router.config.ts` at the project root and explicitly set `ssr: false`. Pre-rendering is disabled by default, and only public pages are selectively configured.
- **Good example**:

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  // Selective pre-rendering for public pages that don't require authentication
  prerender: ["/login", "/terms", "/privacy"],
} satisfies Config;
```

### Dynamic Pre-render Path Generation

- **Rule**: [MAY] If pre-render paths need to be dynamically computed at build time, declare `prerender` as an async function.
- **Good example**:

```typescript
import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  async prerender({ getStaticPaths }) {
    const slugs = await fetch("https://example.com/api/slugs").then((res) =>
      res.json()
    );
    return [
      ...getStaticPaths(), // Automatically includes static paths from routes.ts
      ...slugs.map((slug: string) => `/blog/${slug}`),
    ];
  },
} satisfies Config;
```

### Pre-render Parallel Processing

- **Rule**: [MAY] To speed up builds when there are many pre-render target paths, use the `{ paths, unstable_concurrency }` format.

> **Note**: `unstable_concurrency` is an experimental (unstable) API and may change in minor/patch versions.

- **Good example**:

```typescript
import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  prerender: {
    paths: ["/", "/about", "/blog/post-1", "/blog/post-2"],
    unstable_concurrency: 4,
  },
} satisfies Config;
```

### SPA Fallback (Hosting Configuration)

- **Rule**: [MUST] When using `ssr: false` with only some paths pre-rendered, configure hosting settings to route **non-pre-rendered paths** to the SPA Fallback HTML.
- **Additional rules**:
  - If `/` is **not pre-rendered**: Use `build/client/index.html` as the SPA Fallback.
  - If `/` is **pre-rendered**: Use `build/client/__spa-fallback.html` as the SPA Fallback.

```sh
# When / is not pre-rendered
sirv-cli build/client --single index.html

# When / is pre-rendered
sirv-cli build/client --single __spa-fallback.html
```

### Vite Configuration

- **Rule**: [MUST] Register the `@react-router/dev/vite` plugin in `vite.config.ts`.
- **Good example**:

```typescript
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
});
```

---

## 3. SSR-Safety Considerations

### Build-Time Rendering Environment

- **Rule**: [MUST] Even with `ssr: false`, you must be aware that components are executed in a Node.js environment at build time.

> **Exact behavior (facts)**  
> - In SPA mode (`ssr: false` + no `prerender` configured), only the **root route** is server-rendered at build time.  
> - When `prerender` is configured, the **entire route tree matching those paths** is rendered at build time.  
> - `loader` is called **only in the root route** in SPA mode, and **only in pre-render target routes** in prerender mode.  
>
> **Operational recommendation (policy)**  
> - Since pre-render target paths may change, **all route components should be written as SSR-safe**.

### Browser API Access Rules

- **Rule**: [MUST] Browser APIs (`window`, `document`, `localStorage`, `navigator`, etc.) must only be accessed inside `useEffect` or event handlers.
- **Rule**: [MUST NOT] Do not directly access browser APIs in the component function body (rendering path).

- **Good example**:
```typescript
function AnalyticsTracker() {
  useEffect(() => {
    // Inside useEffect -- only runs in the browser
    window.analytics?.track('page_view');
  }, []);

  return null;
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Access localStorage inside useEffect
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) setTheme(saved);
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next); // Inside event handler
  };

  return <button onClick={toggle}>{theme}</button>;
}
```

- **Bad example**:
```typescript
function BadComponent() {
  // Direct access in component body -- build-time error!
  const width = window.innerWidth;
  const token = localStorage.getItem('token');

  return <div>Width: {width}</div>;
}
```

### typeof Guard Pattern

- **Rule**: [MAY] When it is unavoidable to check browser APIs in the component body, use the `typeof window !== 'undefined'` guard.
- **Good example**:
```typescript
function ViewportInfo() {
  const isBrowser = typeof window !== 'undefined';
  const [width, setWidth] = useState(isBrowser ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <span>{width}px</span>;
}
```

### Browser-Only Libraries

- **Rule**: [SHOULD] Browser-only libraries (charts, editors, maps, etc.) should be dynamically imported using `lazy(() => import(...))`.
- **Good example**:
```typescript
import { lazy, Suspense } from 'react';

// Separate browser-only library with lazy
const MapView = lazy(() => import('@/components/ui/map-view'));

export default function LocationPage() {
  return (
    <Suspense fallback={<div className="h-[400px] animate-pulse bg-surface-2" />}>
      <MapView />
    </Suspense>
  );
}
```

---

## 4. Route Configuration (routes.ts)

### Code-Based Route Definition

- **Rule**: [MUST] Define routes in the `app/routes.ts` file using helper functions from `@react-router/dev/routes`.
- **Good example**:

```typescript
// app/routes.ts
import {
  type RouteConfig,
  route,
  index,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  // Index route -- "/"
  index("./routes/home.tsx"),

  // Basic route
  route("about", "./routes/about.tsx"),

  // Layout route -- shared layout wrapping child routes without affecting URL
  layout("./routes/auth/layout.tsx", [
    route("login", "./routes/auth/login.tsx"),
    route("signup", "./routes/auth/signup.tsx"),
  ]),

  // Nested routes
  route("dashboard", "./routes/dashboard/layout.tsx", [
    index("./routes/dashboard/home.tsx"),
    route("orders", "./routes/dashboard/orders.tsx"),
    route("orders/:id", "./routes/dashboard/order-detail.tsx"),
    route("settings", "./routes/dashboard/settings.tsx"),
  ]),

  // Dynamic segments
  route("products/:productId", "./routes/products/detail.tsx"),

  // Catch-all (404)
  route("*", "./routes/not-found.tsx"),
] satisfies RouteConfig;
```

### Route Helper Functions

| Function | Role | URL Impact |
| --- | --- | --- |
| `index(module)` | Index route (matches parent URL) | None (parent URL) |
| `route(path, module)` | Basic route | Adds URL segment |
| `route(path, module, children)` | Parent route (renders children via Outlet) | Adds URL segment |
| `layout(module, children)` | Layout route (no URL impact) | None |
| `prefix(path, children)` | Adds path prefix only (no route module) | Adds URL segment |

### Layout Route vs Route Groups

- **Rule**: [SHOULD] The pattern of grouping related routes with a shared layout should be implemented using the `layout()` function.
- **Good example**:

```typescript
// routes.ts -- Apply different layouts for auth pages and dashboard pages
export default [
  layout("./routes/auth/layout.tsx", [
    route("login", "./routes/auth/login.tsx"),     // /login
    route("signup", "./routes/auth/signup.tsx"),    // /signup
  ]),

  layout("./routes/dashboard/layout.tsx", [
    route("orders", "./routes/dashboard/orders.tsx"),     // /orders
    route("settings", "./routes/dashboard/settings.tsx"), // /settings
  ]),
] satisfies RouteConfig;
```

---

## 5. Route Module File Conventions

### Route Module Exports

- **Rule**: [MUST] Route modules must follow the named export conventions defined below.

| Export | Role | Required |
| --- | --- | --- |
| `default` | Route UI component | Required |
| `ErrorBoundary` | Route error boundary UI | Optional |
| `meta` | `<title>`, `<meta>` tag definitions | Optional |
| `links` | `<link>` tag definitions | Optional |
| `handle` | Route match data (breadcrumbs, etc.) | Optional |

> **Note**: React Router also provides route data APIs such as `clientLoader`, `clientAction`, and `HydrateFallback`. This organization standardizes runtime data fetching with TanStack Query, and `clientLoader` is only allowed for route-level prefetching (`ensureQueryData`). `clientAction` is used only in ADR-approved exceptional cases. For data fetching, refer to [7. Data Fetching Strategy](#7-data-fetching-strategy).

### handle Export (Breadcrumbs, etc.)

- **Rule**: [MAY] A `handle` export can be defined in route modules to include metadata such as breadcrumbs and titles in the route match.
- **Good example**:

```typescript
// app/routes/dashboard/orders.tsx
import type { Route } from "./+types/orders";

export const handle = {
  breadcrumb: "주문 관리",
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "주문 관리" }];
}

export default function OrdersPage() {
  return <OrderList />;
}
```

```typescript
// app/components/layout/breadcrumb/Breadcrumb.tsx
import { useMatches } from "react-router";

interface BreadcrumbHandle {
  breadcrumb: string;
}

export function Breadcrumb() {
  const matches = useMatches();
  const breadcrumbs = matches
    .filter((match) => (match.handle as BreadcrumbHandle)?.breadcrumb)
    .map((match) => ({
      path: match.pathname,
      label: (match.handle as BreadcrumbHandle).breadcrumb,
    }));

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-200 text-body-sm text-text-3">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path}>
            {index > 0 && <span className="mx-100">/</span>}
            <Link to={crumb.path}>{crumb.label}</Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### Basic Route Module Structure

- **Good example**:

```typescript
// app/routes/dashboard/orders.tsx
import type { Route } from "./+types/orders";
import { OrderList } from "@/features/order/components/order-list";
import { OrderFilter } from "@/features/order/components/order-filter";
import { PageLayout } from "@/components/layout/page-layout";

// Meta information definition
export function meta({}: Route.MetaArgs) {
  return [
    { title: "주문 관리" },
    { name: "description", content: "주문 목록을 관리합니다" },
  ];
}

// Route UI component -- responsible only for composing Feature components
export default function OrdersPage() {
  return (
    <PageLayout title="주문 관리">
      <OrderFilter />
      <OrderList />
    </PageLayout>
  );
}

// Error boundary
export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div>
      <h2>문제가 발생했습니다</h2>
      <p>{error instanceof Error ? error.message : "알 수 없는 오류"}</p>
    </div>
  );
}
```

### Type-Safe Route Modules (+types)

- **Rule**: [MUST] In route modules, the `Route` type must be imported from the auto-generated `./+types/` directory.
- **Good example**:

```typescript
import type { Route } from "./+types/order-detail";
import { useParams } from "react-router";
import { OrderDetail } from "@/features/order/components/order-detail";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `주문 #${params.id}` }];
}

// params type is automatically inferred from "orders/:id" in routes.ts
export default function OrderDetailPage() {
  const { id } = useParams();
  return <OrderDetail orderId={id!} />;
}
```

---

## 6. Root Module (root.tsx)

### Layout Function

- **Rule**: [MUST] Export a `Layout` function in `app/root.tsx` to define the HTML document shell.
- **Good example**:

```typescript
// app/root.tsx
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return (
    <div>
      <h1>앱에 문제가 발생했습니다</h1>
      <p>잠시 후 다시 시도해주세요.</p>
    </div>
  );
}
```

### HydrateFallback (SPA Initial Loading UI)

- **Rule**: [SHOULD] Export `HydrateFallback` in the root route to provide SPA initial loading UI.
- **Good example**:

```typescript
// app/root.tsx
export function HydrateFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner />
      <p>로딩 중...</p>
    </div>
  );
}
```

> **Note**: `HydrateFallback` is only meaningful in the root route. In SPA mode, all paths enter through the root route's `index.html`, so the root's `HydrateFallback` is used as the initial loading UI for all paths.

### Global Style Connection

- **Rule**: [MUST] Global CSS must be connected via the `links` export in `root.tsx`.
- **Good example**:

```typescript
// app/root.tsx
import type { LinksFunction } from "react-router";
import globalStyles from "./globals.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: globalStyles },
];
```

---

## 7. Data Fetching Strategy

### Basic Principles

In an `ssr: false` environment, since there is no runtime server:
- `action` and `headers` exports cannot be used.
- `loader` is only allowed for build-time data generation in pre-render paths.
- **[MUST] All runtime data fetching uses TanStack Query as the single solution.**
- **[MAY] When route-level prefetching is needed, `ensureQueryData()` can be called in `clientLoader`.**
- `clientAction` is not used by default. Exceptional use is controlled through ADR approval.

> **Note**: React Router provides `clientLoader`/`clientAction` APIs. Their role overlaps with TanStack Query, and TanStack Query is more powerful in terms of caching, background refresh, and duplicate request prevention. The runtime fetching layer is standardized on TanStack Query, but `clientLoader` can be used as a prefetch trigger to prevent data waterfalls during route transitions.

### Methods by Data Fetching Scenario

| Scenario | Method |
| --- | --- |
| Initial data on route entry | TanStack Query `useQuery` / `useSuspenseQuery` *(static public pages allow prerender + optional loader)* |
| List data (filter, sort, pagination) | TanStack Query `useQuery` |
| Infinite scroll | TanStack Query `useInfiniteQuery` |
| Real-time data (polling) | TanStack Query `useQuery` + `refetchInterval` |
| Data mutations (create/update/delete) | TanStack Query `useMutation` + `invalidateQueries` |
| Form submission | React Hook Form + TanStack Query `useMutation` |
| Cache invalidation | TanStack Query `invalidateQueries` |
| Route-level prefetch | `clientLoader` + `queryClient.ensureQueryData()` |

### Prefetching with clientLoader (Optional)

- **Rule**: [MAY] To prevent waterfalls of initial data on route entry, `ensureQueryData` from TanStack Query can be used in `clientLoader`.

> **Note**: This pattern is optional. In most cases, `useQuery`/`useSuspenseQuery` inside Feature components is sufficient. Apply this only when waterfalls of multiple queries on route entry become a problem.

- **Good example**:

```typescript
// app/routes/dashboard/orders.tsx
import type { Route } from "./+types/orders";
import { orderQueries } from "@/features/order/api/query-options";
import { queryClient } from "@/lib/query-client";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const filters = Object.fromEntries(url.searchParams);
  // Fetch if not in cache, return immediately if cached
  await queryClient.ensureQueryData(orderQueries.list(filters));
  return null;
}

export default function OrdersPage() {
  return (
    <PageLayout title="주문 관리">
      <OrderFilter />
      <OrderList /> {/* Renders immediately with already cached data */}
    </PageLayout>
  );
}
```

### Data Fetching in Feature Components

- **Rule**: [MUST] Data fetching must be performed inside Feature components through TanStack Query custom hooks. Do not fetch data in route modules (Page components).
- **Good example**:

```typescript
// app/routes/dashboard/orders.tsx -- Route module (responsible for composition only)
import { OrderList } from "@/features/order/components/order-list";
import { PageLayout } from "@/components/layout/page-layout";

export default function OrdersPage() {
  return (
    <PageLayout title="주문 관리">
      <OrderList />
    </PageLayout>
  );
}
```

```typescript
// app/features/order/components/order-list/OrderList.tsx -- Feature component (data fetching)
import { useOrdersQuery } from "@/features/order/api/use-orders-query";
import { useOrderFilterStore } from "@/features/order/store/order-filter-store";
import { DataTable } from "@/components/ui/data-table";

export function OrderList() {
  const { filter } = useOrderFilterStore();
  const { data, isPending } = useOrdersQuery(filter);

  return (
    <DataTable
      columns={ORDER_COLUMNS}
      data={data?.orders ?? []}
      isLoading={isPending}
    />
  );
}
```

### Data Mutations

- **Rule**: [MUST] Data mutations (create, update, delete) must use TanStack Query's `useMutation`. On success, invalidate related caches with `invalidateQueries`.
- **Good example**:

```typescript
// features/order/api/use-update-order-mutation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderQueries } from "./query-options";
import { apiClient } from "@/lib/api-client";

export function useUpdateOrderMutation(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrderDto) =>
      apiClient.put(`/orders/${orderId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderQueries.all });
    },
  });
}
```

---

## 8. Navigation

### Link, NavLink

- **Rule**: [MUST] Use `<Link>` or `<NavLink>` from `react-router` for internal page navigation. Direct use of HTML `<a>` tags is prohibited.
- **Good example**:

```typescript
import { Link, NavLink } from "react-router";

// Basic link
<Link to="/orders">주문 목록</Link>

// Navigation requiring active state styling
<NavLink
  to="/orders"
  className={({ isActive }) => cn("nav-link", isActive && "text-brand-4")}
>
  주문 관리
</NavLink>
```

### Outlet

- **Rule**: [MUST] Use `<Outlet />` at the position where child components of nested routes should be rendered.
- **Good example**:

```typescript
// app/routes/dashboard/layout.tsx
import { Outlet } from "react-router";

export default function DashboardLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">
        <Header />
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}
```

### useNavigate()

- **Rule**: [MUST] Use `useNavigate()` for programmatic page navigation.
- **Rule**: [MUST NOT] Do not call `navigate()` unconditionally inside `useEffect`. There is a risk of infinite redirects.
- **Good example**:

```typescript
import { useNavigate } from "react-router";

function OrderActions({ orderId }: { orderId: string }) {
  const navigate = useNavigate();

  const handleSubmit = () => {
    // Programmatic navigation in event handler
    navigate(`/orders/${orderId}`);
  };

  const handleBack = () => {
    navigate(-1); // Go back
  };

  const handleReplace = () => {
    navigate('/orders', { replace: true }); // Replace history (skips current page on back navigation)
  };

  return (
    <div>
      <button onClick={handleBack}>뒤로</button>
      <button onClick={handleSubmit}>상세 보기</button>
    </div>
  );
}
```

- **Bad example**:

```typescript
function BadRedirect() {
  const navigate = useNavigate();

  // Unconditional navigate in useEffect -- risk of infinite redirect!
  useEffect(() => {
    navigate('/dashboard');
  }, [navigate]);

  return null;
}
```

### useNavigation()

- **Rule**: [SHOULD] Route transition state UI (global loading bar, etc.) should utilize the `state` value from `useNavigation()`.

```typescript
import { useNavigation } from "react-router";

function GlobalLoadingBar() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 z-50 h-1 w-full">
      <div className="h-full animate-pulse bg-brand-4" />
    </div>
  );
}
```

### URL State Management

- **Rule**: [MUST] Complex URL state such as filters, sorting, and pagination must be managed with nuqs (`useQueryStates`). Follow the detailed patterns in the URL State Management section of STATE_CONVENTION.md.
- **Rule**: [MAY] For simple cases of reading a single parameter, `useSearchParams()` can be used.

### Scroll Restoration

- **Rule**: [MUST] Include `<ScrollRestoration />` inside the `Layout` function in `root.tsx`.
- To force scroll to the top on specific routes, call `window.scrollTo(0, 0)` in `useEffect`.

---

## 9. Authentication and Client Route Guards

### Token Storage

- **Rule**: [MUST] Access Tokens must be stored in memory (module-scope variables). Refresh Tokens are managed by the backend via `httpOnly` cookies.

### AuthGuard Layout

- **Rule**: [MUST] Routes that require authentication must be wrapped with an AuthGuard layout using the `layout()` function. When unauthenticated, redirect to the login page with a `/login?returnTo=` parameter.

```typescript
// app/routes.ts
import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  // Public routes -- no authentication required
  index("./routes/home.tsx"),
  route("about", "./routes/about.tsx"),

  // Authentication page layout
  layout("./routes/guards/guest-guard.tsx", [
    route("login", "./routes/auth/login.tsx"),
    route("signup", "./routes/auth/signup.tsx"),
  ]),

  // Routes requiring authentication -- protected by AuthGuard
  layout("./routes/guards/auth-guard.tsx", [
    layout("./routes/dashboard/layout.tsx", [
      index("./routes/dashboard/home.tsx"),
      route("orders", "./routes/dashboard/orders.tsx"),
      route("orders/:id", "./routes/dashboard/order-detail.tsx"),
      route("settings", "./routes/dashboard/settings.tsx"),
    ]),
  ]),

  route("*", "./routes/not-found.tsx"),
] satisfies RouteConfig;
```

```typescript
// app/routes/guards/auth-guard.tsx
import { Outlet, Navigate, useLocation } from "react-router";
import { useCurrentUser } from "@/features/auth/api/use-current-user";

export default function AuthGuard() {
  const { data: user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return <FullPageSpinner />; // Loading UI while verifying authentication
  }

  if (!user) {
    // Unauthenticated -> redirect to login page (preserve original path with returnTo)
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
}
```

```typescript
// app/routes/guards/guest-guard.tsx -- Redirect already logged-in users
import { Outlet, Navigate, useSearchParams } from "react-router";
import { useCurrentUser } from "@/features/auth/api/use-current-user";

export default function GuestGuard() {
  const { data: user, isLoading } = useCurrentUser();
  const [searchParams] = useSearchParams();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (user) {
    // Already authenticated -> redirect to returnTo or dashboard
    const returnTo = searchParams.get('returnTo') ?? '/';
    return <Navigate to={returnTo} replace />;
  }

  return <Outlet />;
}
```

### RoleGuard

- **Rule**: [SHOULD] When role-based access control is needed, write guard route modules per role. Since they are used with the `layout()` function in `routes.ts`, separate files for each role.

```typescript
// app/routes/guards/admin-guard.tsx -- Used as a layout() route module
import { Outlet } from "react-router";
import { useCurrentUser } from "@/features/auth/api/use-current-user";

export default function AdminGuard() {
  const { data: user } = useCurrentUser();

  if (!user || user.role !== 'admin') {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}

// Usage in routes.ts:
// layout("./routes/guards/admin-guard.tsx", [
//   route("settings", "./routes/admin/settings.tsx"),
// ])
```

### Authentication State Management

- **Rule**: [SHOULD] Current user information (authentication state) should be managed with TanStack Query (`useCurrentUser` hook). Do not duplicate it in a Zustand store.

```typescript
// features/auth/api/query-options.ts
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const authQueries = {
  all: ['auth'] as const,
  me: () => queryOptions({
    queryKey: [...authQueries.all, 'me'] as const,
    queryFn: () => apiClient.get<User>('/auth/me'),
    retry: false, // Don't retry on 401
    staleTime: 5 * 60 * 1000,
  }),
};

// features/auth/api/use-current-user.ts
import { useQuery } from '@tanstack/react-query';
import { authQueries } from './query-options';

export function useCurrentUser() {
  return useQuery(authQueries.me());
}
```

---

## 10. Error Handling

### ErrorBoundary Export

- **Rule**: [SHOULD] Export an `ErrorBoundary` in each route module to provide route-specific error UI.
- **Good example**:

```typescript
// app/routes/dashboard/orders.tsx
import { useRouteError, isRouteErrorResponse } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h2>{error.status} Error</h2>
        <p>{error.statusText}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  );
}
```

### Global Error Boundary

- **Rule**: [MUST] Export an `ErrorBoundary` in `root.tsx` to handle top-level errors.

---

## 11. Loading States

### TanStack Query Loading State

- **Rule**: [MUST] Default loading states are handled inside Feature components through TanStack Query's `isPending`/`isLoading` states.
- **Good example**:

```typescript
// app/features/order/components/order-list/OrderList.tsx
import { useOrdersQuery } from "@/features/order/api/use-orders-query";

export function OrderList() {
  const { data, isPending } = useOrdersQuery();

  if (isPending) {
    return <OrderListSkeleton />;
  }

  return <DataTable columns={ORDER_COLUMNS} data={data.orders} />;
}
```

### Loading Pattern with Suspense

- **Rule**: [MAY] Declarative loading UI can be implemented by combining TanStack Query's `useSuspenseQuery` with `<Suspense>`.
- **Good example**:

```typescript
// app/routes/dashboard/orders.tsx -- Route module
import { Suspense } from "react";
import { OrderList } from "@/features/order/components/order-list";
import { PageLayout } from "@/components/layout/page-layout";

export default function OrdersPage() {
  return (
    <PageLayout title="주문 관리">
      <Suspense fallback={<OrderListSkeleton />}>
        <OrderList />
      </Suspense>
    </PageLayout>
  );
}
```

```typescript
// app/features/order/components/order-list/OrderList.tsx -- Using custom hook
import { useOrdersQuery } from "@/features/order/api/use-orders-query";

export function OrderList() {
  const { data } = useOrdersQuery({}); // Assuming a Suspense-based custom hook

  return <DataTable columns={ORDER_COLUMNS} data={data.orders} />;
}
```

---

## 12. Environment Variable Management

- **Rule**: [MUST] Variables to be exposed to the client must use the `VITE_` prefix.
- **Rule**: [MUST NOT] Do not use `VITE_` for sensitive information such as API keys, secrets, or DB URLs.

| Variable | Prefix | Correct Usage |
| --- | --- | --- |
| `VITE_API_URL` | VITE_ | Public API endpoint |
| `VITE_GA_ID` | VITE_ | Public ID used in the browser |
| `DATABASE_URL` | None | Only accessed in build-time scripts |
| `JWT_SECRET` | None | Only accessed on the server (pre-render build scripts, etc.) |

- **Good example**:

```bash
VITE_API_URL=https://api.example.com   # Used for API calls from the client
DATABASE_URL=postgresql://user:pass@host/db    # Only accessed in build scripts
```

- **Bad example**:

```bash
VITE_DATABASE_URL=postgresql://user:pass@host/db   # DB connection info exposed!
VITE_JWT_SECRET=my-secret-key                      # JWT secret exposed!
```

---

## 13. Code Splitting

- **Rule**: React Router Framework Mode automatically code-splits each route module. There is no need to use `React.lazy` or `dynamic import` at the route level.
- **Rule**: [SHOULD] Heavy components within routes (charts, editors, etc.) should be additionally split using `React.lazy`.
- **Good example**:

```typescript
import { lazy, Suspense } from "react";
import { PageLayout } from "@/components/layout/page-layout";

const HeavyChart = lazy(() => import("@/components/ui/heavy-chart"));

export default function DashboardPage() {
  return (
    <PageLayout title="대시보드">
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart />
      </Suspense>
    </PageLayout>
  );
}
```

---

## 14. Image/Font Optimization

### Images

- **Rule**: [SHOULD] Use Vite's asset handling or image optimization plugins for image optimization.
- **Good example**:

```typescript
// Vite asset import
import heroImage from "@/assets/hero.webp";

function Hero() {
  return (
    <img
      src={heroImage}
      alt="메인 배너"
      width={1200}
      height={600}
      loading="lazy"
      decoding="async"
    />
  );
}
```

### Fonts

- **Rule**: [SHOULD] Fonts used in the project should be defined with `@font-face` in `app/globals.css` or loaded through a CDN such as Google Fonts.

---

## 15. Prefetching Strategy

### List-to-Detail Hover Prefetch

- **Rule**: [SHOULD] When transitioning from list to detail, prefetch data at the link hover point using `queryClient.prefetchQuery()`.

```typescript
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { orderQueries } from "@/features/order/api/query-options";

function OrderListItem({ order }: { order: Order }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery(orderQueries.detail({ id: order.id }));
  };

  return (
    <Link
      to={`/orders/${order.id}`}
      onMouseEnter={handleMouseEnter}
      className="block p-400 hover:bg-surface-3"
    >
      <span>{order.title}</span>
    </Link>
  );
}
```

### PrefetchLink Utility

- **Rule**: [MAY] If prefetching is frequently used, create a `PrefetchLink` utility component for reuse.

```typescript
// app/components/ui/prefetch-link/PrefetchLink.tsx
import { Link, type LinkProps } from "react-router";
import { useQueryClient, type QueryOptions } from "@tanstack/react-query";

interface PrefetchLinkProps extends LinkProps {
  queryOptions: QueryOptions;
}

export function PrefetchLink({ queryOptions, children, ...linkProps }: PrefetchLinkProps) {
  const queryClient = useQueryClient();

  return (
    <Link
      {...linkProps}
      onMouseEnter={() => queryClient.prefetchQuery(queryOptions)}
    >
      {children}
    </Link>
  );
}
```

---

## 16. Middleware (v7.9+)

- **Rule**: [SHOULD] The Middleware API (`future.v8_middleware`) from React Router 7.9+ can be used to handle cross-cutting concerns such as authentication and logging.

> **Note**: The Middleware API was stabilized in React Router v7.9.0 through the `future.v8_middleware` flag. It is activated by adding `future: { v8_middleware: true }` to `react-router.config.ts`. Both server middleware and client middleware are supported, but in an `ssr: false` environment, **only client middleware** can be used.

- **Good example**:

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  prerender: true,
  future: {
    v8_middleware: true,
  },
} satisfies Config;
```

```typescript
// app/routes/dashboard/orders.tsx -- Client middleware example
import type { Route } from "./+types/orders";

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
  async ({ request, context }, next) => {
    console.log(`[${new Date().toISOString()}] ${request.url}`);
    return next();
  },
];
```

> **Caution**: Middleware adoption should be decided after team consensus. If the current `layout()`-based AuthGuard/GuestGuard pattern is sufficient, separate adoption is unnecessary.

---

## 17. Anti-Patterns

- **Rule**: [MUST NOT] Do not use `action` or `headers` exports in an `ssr: false` environment.

- **Rule**: [MUST NOT] Do not use `loader` in routes that are not pre-render targets. (Only the root route is an exception in SPA mode)

- **Rule**: [MUST NOT] Do not use `createBrowserRouter` directly in Framework Mode.

- **Rule**: [SHOULD NOT] Do not use `clientLoader`/`clientAction` as direct data fetching methods. `clientLoader` is only for TanStack Query `ensureQueryData` calls, and `clientAction` is only used after ADR approval.

- **Rule**: [MUST NOT] Do not call `useQuery`/`useMutation` etc. directly in route modules (Page components).

- **Rule**: [SHOULD NOT] Do not write business logic directly in route modules.

- **Rule**: [SHOULD NOT] Do not fetch data directly with `useEffect`. Use TanStack Query's `useQuery`.

- **Rule**: [MUST NOT] Do not call browser-only APIs directly in the component rendering path.

---

## 18. Migration Reference

For a migration guide from Next.js to React Router 7, refer to NEXTJS_MIGRATION_GUIDE.md.