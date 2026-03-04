# Frontend Architecture Convention

> This document defines the directory structure, component classification system, and dependency direction of frontend projects.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Directory Layout

The project follows a directory structure based on React Router 7 Framework Mode.

### React Router 7 Framework Mode Project

- **Rule**: [MUST] React Router 7 projects follow the directory structure below. Domain-specific code is co-located under `features/`.

```text
app/
├── routes.ts               # Route definitions (code-based)
├── root.tsx                # HTML shell + global error boundary
├── globals.css             # Tailwind CSS + CSS Variables
│
├── routes/                 # Route module files (Feature component composition only)
│   ├── home.tsx            # "/" index route
│   ├── not-found.tsx       # "*" catch-all
│   ├── auth/
│   │   ├── layout.tsx      # Auth page shared layout
│   │   ├── login.tsx       # "/login"
│   │   └── signup.tsx      # "/signup"
│   └── dashboard/
│       ├── layout.tsx      # Dashboard shared layout
│       ├── home.tsx        # "/dashboard"
│       ├── orders.tsx      # "/dashboard/orders"
│       └── order-detail.tsx # "/dashboard/orders/:id"
│
├── features/               # Domain-specific co-location (center of business code)
│   ├── order/
│   │   ├── components/     # Feature components (OrderList, OrderFilter, etc.)
│   │   ├── api/            # TanStack Query hooks + fetch functions + query keys
│   │   ├── store/          # Feature-specific Zustand store (optional)
│   │   ├── schemas/        # Feature-specific Zod schemas (optional)
│   │   └── types/          # Feature-specific types (optional)
│   ├── auth/
│   │   ├── components/
│   │   ├── api/
│   │   └── store/
│   └── user/
│       ├── components/
│       ├── api/
│       └── types/
│
├── components/             # Shared components (domain-agnostic)
│   ├── ui/                 # Basic UI components (project-specific UI, Storybook targets)
│   └── layout/             # Layout components (Header, Sidebar, Footer)
│
├── hooks/                  # Shared custom hooks (useDebounce, useMediaQuery, etc.)
├── lib/                    # Shared utilities (cn(), API client, etc.)
├── types/                  # Shared type definitions (including domain types referenced by multiple Features)
├── schemas/                # Shared Zod schemas
└── constants/              # Shared constant definitions
```

- **Rule**: [MUST] Only route module files are placed in the `routes/` directory. Business logic is placed under `features/`.
- **Good example**:
  ```text
  app/
  ├── routes/dashboard/
  │   └── orders.tsx                       # Feature component composition only
  ├── features/order/
  │   ├── components/order-list/
  │   │   └── OrderList.tsx                # Business logic + data fetching
  │   └── api/
  │       └── use-orders-query.ts          # TanStack Query hook
  ```
> **Note**: The default app directory for React Router 7 Framework Mode is `app/`. `features/`, `components/`, `hooks/`, etc. are located under `app/`.

## 2. Feature Directory Structure

This section defines the operating rules for the `features/` directory.

### Feature Internal Structure

- **Rule**: [MUST] Each Feature directory follows the structure below. `components/`, `api/`, `transforms/` are required; the rest are created when needed.

```text
features/{domain}/
├── components/              # [Required] Feature components (Consume layer)
│   ├── order-list/
│   │   ├── OrderList.tsx
│   │   ├── OrderList.test.tsx
│   │   ├── OrderList.stories.tsx
│   │   └── OrderListItem.tsx     # Sub-component (specific to this Feature)
│   └── order-filter/
│       └── OrderFilter.tsx
├── api/                     # [Required] fetch functions + TanStack Query hooks + query keys (Fetching layer)
│   ├── query-keys.ts
│   ├── use-orders-query.ts
│   ├── use-order-query.ts
│   └── use-update-order-mutation.ts
├── transforms/              # [Required] Data transformations (Transform layer)
│   ├── to-order-list-item.ts          # Pure transform function
│   └── to-order-dashboard.ts         # Multi-source composition transform function
├── hooks/                   # [Optional] Feature-specific utility hooks
│   └── use-adapted-order-dashboard.ts # Multi-source composition hook
├── store/                   # [Optional] Feature-specific Zustand store (Fetching layer)
│   └── order-filter-store.ts
├── hooks/                   # [Optional] Feature-specific utility hooks (layer-agnostic)
│   └── use-order-permission.ts
├── schemas/                 # [Optional] Feature-specific Zod schemas
│   └── order-create-schema.ts
└── types/                   # [Optional] Feature-specific types (used only within this Feature)
    └── order-form.types.ts
```

#### Hook Location Rules

| Hook Naming Pattern | Location | Determination |
|---------------|------|------|
| `use-xxx-query.ts`, `use-xxx-mutation.ts` | `api/` | Mechanical |
| `use-adapted-xxx.ts` | `hooks/` | Mechanical |
| Others (`use-xxx-permission.ts`, etc.) | `hooks/` | Mechanical |

Since the folder is determined just by looking at the naming, there is no need for the judgment "Where should I put this hook?"

### API File Structure

- **Rule**: [MUST] Within the `api/` directory, fetch functions and queryOptions factories are defined together in `query-keys.ts`, and custom hooks are separated into files by purpose (`use-xxx-query.ts`, `use-xxx-mutation.ts`).
- **Good example**:
  ```typescript
  // features/order/api/query-keys.ts
  import { queryOptions } from '@tanstack/react-query';
  import { apiClient } from '@/lib/api-client';
  import type { Order, PaginatedResponse } from '@/types/order.types';

  const fetchOrders = (filters: OrderFilters): Promise<PaginatedResponse<Order>> =>
    apiClient.get('/orders', { params: filters });

  export const orderKeys = {
    all: ['orders'] as const,
    list: (filters: OrderFilters) => queryOptions({
      queryKey: [...orderKeys.all, 'list', filters] as const,
      queryFn: () => fetchOrders(filters),
    }),
  };

  // features/order/api/use-orders-query.ts
  import { useQuery } from '@tanstack/react-query';
  import { orderKeys } from './query-keys';

  export function useOrdersQuery(filters: OrderFilters) {
    return useQuery(orderKeys.list(filters));
  }
  ```

### Shared vs Feature-Specific Criteria

- **Rule**: [SHOULD] Determine the placement of code based on the following criteria.

| Question | `features/*/` (Feature-specific) | Shared directory (`types/`, `hooks/`, etc.) |
|------|:---:|:---:|
| Is the code related only to a specific domain (orders, auth, etc.)? | O | |
| Is it used by 2 or more Features? | | O |
| Can it be used universally without domain logic? | | O |
| Should it be deleted together when the Feature is deleted? | O | |
| Is it an API response type referenced by multiple Features? | | O |

### Cross-Feature Dependency Rules

- **Rule**: [MUST] Cross-Feature imports use direct import with specific file paths. Do not go through `index.ts` barrel files.
- **Good example**:
  ```typescript
  // Cross-Feature cross-import -- direct import with specific file path
  import { useCurrentUser } from '@/features/auth/api/use-current-user';
  import type { OrderStatus } from '@/types/order.types';  // Shared types from types/
  ```

### Feature Dependency Direction

```text
Feature A  --> Shared (components/ui/, lib/, hooks/, types/)     Always allowed
Feature A  --> Specific files of Feature B                       Allowed (no index.ts barrel)
Shared     --> Feature                                           Reverse direction prohibited
```

## 3. Route Groups / Layout Routes

A pattern for logically grouping related routes to share layouts.

### Layout Routes

- **Rule**: [SHOULD] Group related routes using the `layout()` function to share layouts.
- **Good example**:
  ```typescript
  // app/routes.ts
  import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

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
  ```tsx
  // app/routes/auth/layout.tsx -- Shared layout for login/signup
  import { Outlet } from "react-router";

  export default function AuthLayout() {
    return <div className="auth-container"><Logo /><Outlet /></div>;
  }

  // app/routes/dashboard/layout.tsx -- Shared layout for dashboard
  import { Outlet } from "react-router";

  export default function DashboardLayout() {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main><Header /><Outlet /></main>
      </div>
    );
  }
  ```

## 4. Component Classification System

Frontend components are classified into 4 categories based on their role and dependencies.

| Category | Location | Characteristics | Allowed Dependencies | Examples |
|------|------|------|----------------|------|
| UI Component | `components/ui/` | Operates with props only, no business logic, Storybook target. Place project-specific UI components here. | React built-in hooks, other UI components | StatusBadge, DataTable, FileUpload |
| Feature Component | `features/*/components/` | Contains business logic, uses hooks/store/queries. Composes UI components to build screens. | UI components, shared hooks/utils, api/store/hooks from the same Feature | OrderList, UserProfile, PaymentForm |
| Layout Component | `components/layout/` | Page structure, navigation. Does not contain business logic for a specific domain. | UI components, shared hooks/utils | Header, Sidebar, Footer, PageLayout |
| Page Component | `routes/**/*.tsx` | Only responsible for composing Feature/UI components, no business logic | Feature components, UI components, Layout components | DashboardPage, OrderDetailPage |

### UI Components

- **Rule**: [MUST] UI components operate with props only and do not directly depend on external state (store, queries, context).
- **Good example**:
  ```tsx
  // components/ui/data-table/DataTable.tsx -- Operates with props only
  interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    onRowClick?: (row: T) => void;
  }

  export function DataTable<T>({ columns, data, isLoading, onRowClick }: DataTableProps<T>) {
    if (isLoading) return <TableSkeleton columns={columns.length} />;
    return <Table><TableHead columns={columns} /><TableBody data={data} columns={columns} /></Table>;
  }
  ```

### Feature Components

- **Rule**: [MUST] Feature components contain business logic and manage data using hooks, store, and queries. They compose UI components to build screens.
- **Good example**:
  ```tsx
  // features/order/components/order-list/OrderList.tsx
  import { DataTable } from '@/components/ui/data-table';
  import { useOrdersQuery } from '@/features/order/api/use-orders-query';
  import { useOrderFilterStore } from '@/features/order/store/order-filter-store';

  export function OrderList() {
    const { filter, setFilter } = useOrderFilterStore();
    const { data, isLoading } = useOrdersQuery(filter);

    return (
      <DataTable
        columns={ORDER_COLUMNS}
        data={data?.orders ?? []}
        isLoading={isLoading}
      />
    );
  }
  ```

### Layout Components

- **Rule**: [MUST] Layout components are responsible for page structure and navigation. They do not contain business logic for a specific domain.

### Page Components

- **Rule**: [MUST] Page components are only responsible for composing Feature/UI components. They do not directly contain business logic.
- **Good example**:
  ```tsx
  // app/routes/dashboard/orders.tsx -- Route module
  import { OrderList } from '@/features/order/components/order-list';
  import { OrderFilter } from '@/features/order/components/order-filter';
  import { PageLayout } from '@/components/layout/page-layout';

  export function meta() {
    return [{ title: "주문 관리" }];
  }

  export default function OrdersPage() {
    return (
      <PageLayout title="주문 관리">
        <OrderFilter />
        <OrderList />
      </PageLayout>
    );
  }
  ```

## 5. Dependency Direction

- **Rule**: [MUST] Dependencies between components flow in one direction only.

```text
┌──────────────┐
│     Page     │  <-- Route entry point (Feature/UI component composition)
│  routes/     │
├──────────────┤
│   Feature    │  <-- Business logic, uses hooks/store/queries
│  features/*/ │
├──────────────┤
│  Shared/UI   │  <-- Operates with props only, no external dependencies
│  components/ │      hooks/, lib/, types/
│  ui, layout  │
└──────────────┘

Arrow direction: Page --> Feature --> Shared/UI (upper imports lower)
Reverse prohibited: Shared/UI -x-> Feature -x-> Page
```

### Dependency Permission Matrix

| Referencing side \ Referenced side | Page (routes/) | Feature (features/) | Shared (components/, hooks/, lib/, types/) |
|:---:|:---:|:---:|:---:|
| **Page** | - | O | O |
| **Feature** | X | O (specific file paths only) | O |
| **Shared** | X | X | O |

### UI Component Dependency Restrictions

- **Rule**: [MUST] UI components must not directly import `store`, `queries`, or `hooks` (business custom hooks). Only React built-in hooks (`useState`, `useRef`, etc.) and other UI components may be used.

### Reverse Dependency Prohibition

- **Rule**: [MUST NOT] Reverse dependencies (UI -> Feature, Feature -> Page) are prohibited.
- **Bad example**:
  ```tsx
  // components/ui/modal/Modal.tsx -- UI importing Feature (prohibited)
  import { OrderDetail } from '@/features/order/components/order-detail';

  export function Modal() {
    return (
      <div className="modal">
        <OrderDetail />  {/* UI depends on Feature */}
      </div>
    );
  }
  ```
- **Good example**:
  ```tsx
  // components/ui/modal/Modal.tsx -- Receives content via children
  interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }

  export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content">
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    );
  }
  ```

## 6. Data Flow Architecture

Data flows unidirectionally in the **Fetching -> Transform -> Consume** direction.

```text
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Fetching    │ --> │   Transform   │ --> │    Consume    │
│   (Caller)    │     │  (Converter)  │     │  (Consumer)   │
│               │     │               │     │               │
│ features/     │     │ features/     │     │ Feature/UI    │
│  */api/       │     │  */transforms/│     │ components    │
│  */store/     │     │               │     │ (JSX render)  │
└───────────────┘     └───────────────┘     └───────────────┘
```

- **Rule**: [MUST] Data flows only in the Fetching -> Transform -> Consume direction. Reverse data flow (direct fetch from the Consume layer, copying server data to client store, etc.) is prohibited.

### Responsibilities of Each Layer

| Layer | Location | Responsibility | What It Does Not Include |
|--------|------|------|-----------------|
| Fetching (Caller) | `features/*/api/` — query-keys, queryFn, custom hooks | API calls, cache management | Data transformation, UI rendering |
| Fetching (State) | `features/*/store/` — Zustand store | Client UI state storage | Server data copying |
| Transform (Converter) | `features/*/transforms/` — pure functions (`to-xxx.ts`) | Data transformation, derived state calculation | API calls, JSX rendering |
| Consume (Consumer) | Feature/UI/Page components | JSX rendering, event handling | Direct fetch, data transformation |

### Transform Strategy

Data transformation is **always performed through the `transforms/` directory.** Rather than branching based on complexity, all transformations are placed in the same location to ensure consistency for AI code generation and developer judgment.

#### Principle: Do Not Put Transform Logic in the Caller (api/)

- **Rule**: [MUST] `queryFn` in `queryOptions` handles only pure API calls. Do not write `select` options or data transformation logic in `api/` files.
- **Rule**: [MUST] All data transformations are placed in the `transforms/` directory. Hooks that combine multiple sources are placed in `hooks/` with the `use-adapted-xxx.ts` naming convention.

#### Pure Transform Functions — Single Source Transformation

- **Rule**: [MUST] Data transformations for a single query are written as pure functions and placed in `transforms/`. Pass this function to the `select` option in the custom hook.
- **Good example**:
  ```typescript
  // features/order/transforms/to-order-list-item.ts — Pure transform function
  export const toOrderListItem = (data: OrdersResponse): OrderListItem[] =>
    data.orders.map((order) => ({
      id: order.id,
      displayTotal: formatCurrency(order.total),
      statusLabel: ORDER_STATUS_LABELS[order.status],
      isShippable: order.status === 'confirmed' && !order.isShipped,
    }));

  // features/order/api/use-orders-query.ts — Pass transform function via select in the hook
  import { toOrderListItem } from '@/features/order/transforms/to-order-list-item';

  export function useOrdersQuery(filters: OrderFilters) {
    return useQuery({
      ...orderKeys.list(filters),
      select: toOrderListItem,
    });
  }
  ```

#### Multi-Source Composition Hooks — Multiple Data Source Transformation

- **Rule**: [MUST] When combining 2 or more data sources, place pure transform functions in `transforms/` and composition hooks in `hooks/` with the `use-adapted-xxx.ts` naming convention.
- **Good example**:
  ```typescript
  // features/order/transforms/to-order-dashboard.ts — Pure transform function
  export function toOrderDashboard(
    orders: Order[],
    stats: OrderStats,
    userRole: string
  ) {
    return {
      canExport: userRole === 'admin' && orders.length > 0,
      totalRevenue: formatCurrency(stats.totalRevenue),
      pendingCount: orders.filter((o) => o.status === 'pending').length,
    };
  }

  // features/order/hooks/use-adapted-order-dashboard.ts — Orchestration hook
  import { toOrderDashboard } from '@/features/order/transforms/to-order-dashboard';

  export function useAdaptedOrderDashboard() {
    const filters = useOrderFilterStore((s) => s.filters);
    const { data: orders, isLoading } = useOrdersQuery(filters);
    const { data: stats } = useOrderStats();
    const { data: user } = useCurrentUser();

    const dashboard = useMemo(
      () => orders && stats && user
        ? toOrderDashboard(orders, stats, user.role)
        : null,
      [orders, stats, user],
    );

    return { orders: orders ?? [], isLoading, dashboard };
  }
  ```
  ```tsx
  // features/order/components/order-dashboard/OrderDashboard.tsx — Consumer
  import { useAdaptedOrderDashboard } from '@/features/order/hooks/use-adapted-order-dashboard';

  export function OrderDashboard() {
    const { orders, isLoading, dashboard } = useAdaptedOrderDashboard();

    if (isLoading) return <DashboardSkeleton />;
    return (
      <div>
        <SummaryCards data={dashboard} />
        <DataTable columns={ORDER_COLUMNS} data={orders} />
        {dashboard?.canExport && <ExportButton />}
      </div>
    );
  }
  ```

#### File Pattern Summary

| File Pattern | Location | Role | Testing |
|-----------|------|------|--------|
| `to-xxx.ts` | `transforms/` | Pure transform function (single/multi source) | Unit test without React |
| `use-adapted-xxx.ts` | `hooks/` | Orchestration hook (multi-source composition) | Integration test with renderHook |

## 7. Code Co-location

- **Rule**: [SHOULD] Related files (component, test, story, type) are placed in the same folder.

```text
components/ui/button/
├── Button.tsx              # Component implementation (named export)
├── Button.stories.tsx      # Storybook stories
└── Button.test.tsx         # Unit tests
```

```text
features/order/components/order-list/
├── OrderList.tsx           # Feature component (named export)
├── OrderList.test.tsx      # Tests
├── OrderList.stories.tsx   # Storybook stories
└── OrderListItem.tsx       # Sub-component (specific to this Feature)

features/order/transforms/          # Transform layer (pure transform functions)
features/order/hooks/               # Orchestration hooks
└── use-adapted-order-dashboard.ts
```

## 8. Import Path Rules

### Absolute Path Usage

- **Rule**: [MUST] Import paths use the `@/` absolute path by default. Relative paths (`./`, `../`) are allowed for files in the same folder or sub-folders.
- **Good example**:
  ```tsx
  import { Button } from '@/components/ui/button/Button';
  import { OrderList } from '@/features/order/components/order-list/OrderList';
  import { useOrdersQuery } from '@/features/order/api/use-orders-query';
  import { useAdaptedOrderDashboard } from '@/features/order/hooks/use-adapted-order-dashboard';
  import { formatCurrency } from '@/lib/format';
  ```

Configure paths in `tsconfig.json` as follows.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"]
    }
  }
}
```

> **Note**: React Router 7 automatically recognizes tsconfig paths in Vite through the `vite-tsconfig-paths` plugin.

### Barrel File Prohibition

- **Rule**: [MUST NOT] Do not use `index.ts` barrel files. Components use direct named exports from their files, and imports use specific file paths.
- **Bad example**:
  ```ts
  // features/order/index.ts -- Feature-level barrel (prohibited)
  export * from './components/order-list';
  export * from './api/use-orders-query';

  // components/ui/button/index.ts -- Component folder-level barrel also prohibited
  export { Button } from './Button';
  ```

## 9. Anti-Patterns

### Circular Dependencies

- **Rule**: [MUST NOT] Do not create circular dependencies between modules (A -> B -> A).
- **Bad example**:
  ```tsx
  // Circular dependency through barrel files between Features -- prohibited
  // features/order/components/order-card/OrderCard.tsx
  import { UserAvatar } from '@/features/user';        // via user/index.ts -> circular

  // features/user/components/user-orders/UserOrders.tsx
  import { OrderSummary } from '@/features/order';     // via order/index.ts -> circular
  ```
- **Good example**:
  ```tsx
  // Direct import with specific file path -- prevents circular dependency
  // features/order/components/order-card/OrderCard.tsx
  import { UserAvatar } from '@/features/user/components/user-avatar';

  // Shared types placed in types/ -- prevents circular dependency
  import type { User } from '@/types/user.types';
  import type { Order } from '@/types/order.types';
  ```

### Excessive Directory Nesting

- **Rule**: [SHOULD NOT] Do not create more than 3 levels of directory nesting within a Feature.
- **Good example**:
  ```text
  features/order/components/order-status-filter/OrderStatusFilter.tsx
  ```

### Writing Business Logic Directly in Page Components

- **Rule**: [MUST NOT] Do not write business logic directly in Page components (route modules). Delegate to Feature components.

### Flat Component Listing

- **Rule**: [MUST NOT] Do not list files flat at the top level of `components/`. Always classify under `ui/` or `layout/` subdirectories. Feature components are placed under `features/`.
- **Bad example**:
  ```text
  components/
  ├── Button.tsx
  ├── OrderList.tsx
  ├── Header.tsx
  └── UserProfile.tsx
  ```
- **Good example**:
  ```text
  components/              # Shared components only
  ├── ui/
  │   └── Button/
  └── layout/
      └── Header/

  features/                # Domain-specific Feature components
  ├── order/components/
  │   └── OrderList/
  └── user/components/
      └── UserProfile/
  ```

### Writing Transform Logic Directly in Components

- **Rule**: [MUST NOT] Do not write data transformation logic directly inside Feature components. All transformations are placed in the `transforms/` directory.

### Writing Transform Logic in api/ Files

- **Rule**: [MUST NOT] Do not define transform functions directly in queryOptions or custom hook files in the `api/` directory. Define transform functions in `transforms/` and import them in `api/` files to pass to `select`.

### Using Barrel Files

- **Rule**: [MUST NOT] Do not use any form of `index.ts` barrel files. They cause circular dependencies and degrade tree-shaking/HMR performance.

### Copying Server Data to Client Store

- **Rule**: [MUST NOT] Do not copy server data managed by TanStack Query to a Zustand store.

## 10. AI Agent Decision Trees

Three decision trees are provided so that AI agents can make quick decisions when generating code.

### 1. File Location Decision Tree

"Where should I place the new file?"

```text
New file creation
|
+-- Is it specific to a particular domain (orders, auth, users, etc.)?
|  +-- YES -> Under features/{domain}/
|     |
|     +-- API call / TanStack Query hook?
|     |  +-- features/{domain}/api/
|     |     (query-keys.ts, use-xxx-query.ts, use-xxx-mutation.ts)
|     |
|     +-- Component with business logic?
|     |  +-- features/{domain}/components/xxx-component/
|     |
|     +-- Multi-source composition hook (useAdaptedXxx)?
|     |  +-- features/{domain}/hooks/ (use-adapted-xxx.ts)
|     |
|     +-- Feature-specific Zustand store?
|     |  +-- features/{domain}/store/
|     |
|     +-- Feature-specific Zod schema?
|     |  +-- features/{domain}/schemas/
|     |
|     +-- Feature-specific type?
|        +-- features/{domain}/types/
|
+-- Is it general-purpose (domain-agnostic)?
   |
   +-- UI component that operates with props only?
   |  +-- components/ui/
   |
   +-- Page structure component (Header, Sidebar, etc.)?
   |  +-- components/layout/
   |
   +-- General-purpose custom hook (useDebounce, useMediaQuery, etc.)?
   |  +-- hooks/
   |
   +-- Utility function (cn(), formatCurrency, etc.)?
   |  +-- lib/
   |
   +-- Type referenced by multiple Features (Order, User, etc.)?
   |  +-- types/
   |
   +-- Shared Zod schema?
   |  +-- schemas/
   |
   +-- Constant?
      +-- constants/
```

### 2. State Management Tool Selection Tree

"Which tool should I use?"

```text
State is needed
|
+-- Is the data from a server? (API response, DB data)
|  +-- YES -> TanStack Query (useQuery / useMutation)
|     * Do not copy to Zustand
|
+-- Should it be reflected in the URL? (filters, sorting, pagination)
|  +-- YES -> nuqs
|     * Preserves state for link sharing, bookmarks, back/forward navigation
|
+-- Is it used in a single component only?
|  +-- YES -> useState / useReducer
|     * Do not put in a global store
|
+-- Is it UI state shared across multiple components?
   +-- YES -> Zustand
      * Sidebar open/close, theme, notification settings, etc.
```

### 3. Component Classification Decision Tree

"What type of component is this?"

```text
New component creation
|
+-- Operates with props only + no business logic?
|  +-- YES -> UI Component
|     Location: components/ui/
|     Characteristics: store/queries usage prohibited, Storybook target
|     Examples: StatusBadge, DataTable, FileUpload
|
+-- Uses API/store + contains business logic?
|  +-- YES -> Feature Component
|     Location: features/{domain}/components/
|     Characteristics: Uses useQuery, useStore, composes UI components
|     Examples: OrderList, UserProfile, PaymentForm
|
+-- Page structure (Sidebar, Header, Footer)?
|  +-- YES -> Layout Component
|     Location: components/layout/
|     Characteristics: No domain business logic, shared across multiple pages
|     Examples: Header, Sidebar, Footer, PageLayout
|
+-- routes/ route module?
   +-- YES -> Page Component
      Location: routes/
      Characteristics: Feature component composition only, no business logic
      Examples: OrdersPage, DashboardPage
```