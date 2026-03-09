# Frontend Architecture Convention

> This document defines the directory structure, component classification system, and dependency direction for frontend projects.
> Parent rule: FRONTEND_CONVENTION.md

---

## 1. Directory Layout

The project follows a directory structure based on React Router 7 Framework Mode.

### React Router 7 Framework Mode Project

- **Rule**: [MUST] React Router 7 projects must follow the directory structure below. Domain-specific code is co-located under `features/{domain}/`, and domain-contextual code reused across multiple Features is placed in `features/_common/{domain}/`.

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
│   ├── _common/            # Shared across Features (maintaining domain context)
│   │   └── po/             # Further classified by shared domain
│   │       ├── components/ # Feature-level components reused across multiple Features
│   │       ├── api/        # Feature-level API/query hooks reused across multiple Features
│   │       ├── hooks/      # Feature-level shared hooks (optional)
│   │       ├── schemas/    # Feature-level shared Zod schemas (optional)
│   │       ├── constants/  # Feature-level shared constants (optional)
│   │       ├── types/      # Feature-level shared types (optional)
│   │       └── utils/      # Feature-level shared pure helpers (optional)
│   ├── order/
│   │   ├── components/     # Feature components (OrderList, OrderFilter, etc.)
│   │   ├── api/            # TanStack Query hooks + fetch functions + query keys
│   │   ├── store/          # Feature-specific Zustand store (optional)
│   │   ├── schemas/        # Feature-specific Zod schemas (optional)
│   │   ├── constants/      # Feature-specific constants (optional)
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
│   ├── ui/                 # Base UI components (project-specific UI)
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

This section defines the operational rules for the `features/` directory.

### `_common/{domain}` Structure (Feature-Level Sharing)

- **Rule**: [MUST] Under `features/_common/`, further classify by shared domain. Modules with "domain context" that are reused by 2 or more Features are placed in `features/_common/{domain}/`.
- **Rule**: [MUST NOT] Do not place domain-agnostic general-purpose code in `features/_common/{domain}/`. General-purpose code goes in `components/`, `hooks/`, `lib/`, `types/`.
- **Rule**: [MUST NOT] `features/_common/{domain}/` must not import from specific Domain Feature directories (`features/purchase/`, `features/sales/`, etc.).
- **Rule**: [SHOULD] Domain-specific pure functions/helpers shared across multiple Features go in `features/_common/{domain}/utils/`. App-wide general-purpose utilities go in `lib/`.
- **Good example**:
  ```text
  features/_common/
  ├── po/
  │   ├── components/
  │   │   ├── po-items-table/
  │   │   │   └── POItemsTable.tsx
  │   │   └── po-picker-dialog/
  │   │       └── POPickerDialog.tsx
  │   ├── api/
  │   ├── hooks/
  │   ├── schemas/
  │   ├── constants/
  │   ├── types/
  │   └── utils/
  │       └── po-table-utils.ts
  └── settlement/
      └── components/
          └── installment-table/
              └── InstallmentTable.tsx
  ```
> **Note**: In the shipda2 trader app, the `sales`, `purchase`, and `shipment` Features commonly use the above `_common` components.

### Feature Internal Structure

- **Rule**: [MUST] Each domain Feature directory (`features/{domain}/`) follows the structure below. `components/` and `api/` are required; the rest are created as needed. API request/response types are not duplicated inside the Feature but use auto-generated types from shared.

```text
features/{domain}/
├── components/              # [Required] Feature components (Consume layer)
│   ├── order-list/
│   │   ├── OrderList.tsx
│   │   └── OrderListItem.tsx     # Sub-component (exclusive to this Feature)
│   └── order-filter/
│       └── OrderFilter.tsx
├── api/                     # [Required] queryOptions + TanStack Query hooks
│   ├── query-options.ts
│   ├── use-orders-query.ts
│   ├── use-order-query.ts
│   └── use-update-order-mutation.ts
├── hooks/                   # [Optional] Feature-specific utility hooks (UI/permission/form helpers)
│   └── use-order-permission.ts
├── store/                   # [Optional] Feature-specific Zustand store (client UI state)
│   └── order-filter-store.ts
├── schemas/                 # [Optional] Feature-specific Zod schemas
│   └── order-create-schema.ts
├── constants/               # [Optional] Feature-specific constants (used only within this Feature)
│   └── order-constants.ts
├── types/                   # [Optional] Feature-specific form/view types (excluding API request/response types)
│   └── order-form-types.ts
└── utils/                   # [Optional] Feature-specific pure utilities/helpers
    └── order-form-utils.ts
```

#### Hook Location Decision Rules

| Hook naming pattern | Location | Judgment |
|---------------|------|------|
| `endpoint hook file` | `api/` | Mechanical |
| Others (`use-xxx-permission.ts`, etc.) | `hooks/` | Mechanical |

Since the folder is determined solely by naming, there is no need to deliberate "where should this hook go?". The specific file naming rules for `endpoint hook files` follow the API file structure below.

### API File Structure

- **Rule**: [MUST] Within the `api/` directory, query keys and `queryOptions()` factories are defined together in `query-options.ts`. `query-options.ts` is responsible only for cache keys and `queryFn`, and does not use `select`.
- **Rule**: [MUST] Custom hooks per endpoint are separated into purpose-specific files. (`use-xxx-query.ts`, `use-xxx-mutation.ts`) This document refers to these as `endpoint hook files`, and endpoint-specific transform/helper/types can be co-located privately within these files.
- **Rule**: [MUST NOT] Do not redefine API request/response types inside a Feature. Import and use auto-generated types from shared.
- **Good example**:
  ```typescript
  // features/order/api/query-options.ts
  import { queryOptions } from '@tanstack/react-query';
  import { apiClient } from '@/lib/api-client';
  import type { GetOrdersRequest, GetOrdersResponse } from '@/types/generated/order.generated';

  const fetchOrders = (params: GetOrdersRequest): Promise<GetOrdersResponse> =>
    apiClient.get('/orders', { params });

  export const orderQueryOptions = {
    all: ['orders'] as const,
    list: (params: GetOrdersRequest) => queryOptions({
      queryKey: [...orderQueryOptions.all, 'list', params] as const,
      queryFn: () => fetchOrders(params),
    }),
  };

  // features/order/api/use-orders-query.ts
  import { useQuery } from '@tanstack/react-query';
  import type { GetOrdersRequest, GetOrdersResponse } from '@/types/generated/order.generated';
  import { orderQueryOptions } from './query-options';

  type OrderListItem = {
    id: string;
    displayTotal: string;
    statusLabel: string;
  };

  const toOrderListItems = (data: GetOrdersResponse): OrderListItem[] =>
    data.orders.map((order) => ({
      id: order.id,
      displayTotal: formatCurrency(order.total),
      statusLabel: ORDER_STATUS_LABELS[order.status],
    }));

  export function useOrdersQuery(params: GetOrdersRequest) {
    return useQuery({
      ...orderQueryOptions.list(params),
      select: toOrderListItems,
    });
  }
  ```

### Shared vs Feature-Specific Placement Criteria

- **Rule**: [SHOULD] Determine code placement based on the following criteria.

| Question | `features/{domain}/` (Single Feature) | `features/_common/{domain}/` (Shared across Features) | Shared directories (`components/`, `hooks/`, `lib/`, `types/`, etc.) |
|------|:---:|:---:|:---:|
| Is it used by only one Feature? | O | | |
| Is it used by 2+ Features and has domain context (PO/invoice/settlement, etc.)? | | O | |
| Can it be used generically without domain logic? | | | O |
| Should it be deleted when a specific Feature is removed? | O | | |
| Is it domain-common code maintained across multiple Features? | | O | |
| Is it reused app-wide (domain-agnostic)? | | | O |

- **Additional criteria**: Domain-specific pure functions/helpers without React/TanStack Query dependencies go in `features/{domain}/utils/` or `features/_common/{domain}/utils/`. Domain-agnostic general-purpose utilities go in `lib/`.

### Inter-Feature Dependency Rules

- **Rule**: [MUST NOT] A Domain Feature must not directly import another Domain Feature.
- **Rule**: [MUST] When code from one Domain Feature is also needed in another Domain Feature, promote that code to `features/_common/{domain}/` and import from that path.
- **Rule**: [MUST] `features/_common/{domain}/` also uses specific file path imports and does not go through `index.ts` barrel files.
- **Good example**:
  ```typescript
  // Code commonly used across multiple Features is promoted to _common/{domain} then imported
  import { POPickerDialog } from '@/features/_common/po/components/po-picker-dialog/POPickerDialog';
  import { buildPODisplayName } from '@/features/_common/po/utils/build-po-display-name';
  import type { OrderStatus } from '@/types/order.types';  // Shared types from types/
  ```

### Feature Dependency Direction

```text
Domain Feature   --> Feature Common (features/_common/{domain}/)    Allowed
Domain Feature   --> Shared (components/ui/, lib/, hooks/, types/)   Allowed
Domain Feature   -x-> Domain Feature                                  Prohibited
Feature Common   --> Shared                                           Allowed
Feature Common   -x-> Domain Feature                                  Prohibited
Shared           -x-> Feature Common / Domain Feature                 Reverse direction prohibited
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
| UI Component | `components/ui/` | Operates with props only, no business logic. Project-specific UI components are placed here. | React built-in hooks, other UI components | StatusBadge, DataTable, FileUpload |
| Feature Component | `features/{domain}/components/`, `features/_common/{domain}/components/` | Contains business logic, uses hooks/store/queries. Composes UI components to build screens. | UI components, shared hooks/utilities, same Feature's api/store/hooks, `features/_common/{domain}` modules | OrderList, UserProfile, POPickerDialog |
| Layout Component | `components/layout/` | Page structure, navigation. Does not contain business logic for a specific domain. | UI components, shared hooks/utilities | Header, Sidebar, Footer, PageLayout |
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

- **Rule**: [MUST] Page components are only responsible for composing Feature/UI components. They do not directly write business logic.
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
┌────────────────────┐
│       Page         │  <-- Route entry point (Feature/UI component composition)
│      routes/       │
├────────────────────┤
│   Domain Feature   │  <-- Domain business logic
│ features/{domain}/ │
├────────────────────┤
│   Feature Common   │  <-- Shared domain-common modules across Features
│ features/_common/{domain}/ │
├────────────────────┤
│     Shared/UI      │  <-- Props-driven shared modules
│ components/, hooks/│      lib/, types/
└────────────────────┘

Arrow direction: Page --> Domain Feature --> Feature Common --> Shared/UI
Additionally allowed: Domain Feature --> Shared/UI (direct import allowed)
Reverse direction prohibited: Shared/UI -x-> Feature Common -x-> Domain Feature -x-> Page
```

### Dependency Allowance Matrix

| Referencing side \ Referenced side | Page (routes/) | Domain Feature (`features/{domain}/`) | Feature Common (`features/_common/{domain}/`) | Shared (components/, hooks/, lib/, types/) |
|:---:|:---:|:---:|:---:|:---:|
| **Page** | - | O | O | O |
| **Domain Feature** | X | O (only files within the same Feature) | O | O |
| **Feature Common** | X | X | O | O |
| **Shared** | X | X | X | O |

### Dependency Restrictions for UI Components

- **Rule**: [MUST] UI components must not directly import `store`, `queries`, or `hooks` (business custom hooks). They can only use React built-in hooks (`useState`, `useRef`, etc.) and other UI components.

### Reverse Dependency Prohibition

- **Rule**: [MUST NOT] Reverse dependencies (UI -> Feature, Feature -> Page) are prohibited.
- **Rule**: [MUST NOT] Direct dependencies between Domain Features (Domain Feature -> Domain Feature) are also prohibited. If commonization is needed, promote to `features/_common/{domain}/`.
- **Bad example**:
  ```tsx
  // components/ui/modal/Modal.tsx -- UI importing Feature (prohibited)
  import { OrderDetail } from '@/features/order/components/order-detail';

  export function Modal() {
    return (
      <div className="modal">
        <OrderDetail />  {/* UI depending on Feature */}
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

Data flows unidirectionally in the **Fetching -> Consume** direction. Data transformation responsibilities are not separated into a dedicated `transforms/` directory but are co-located within the endpoint-specific custom hook files.

```text
┌───────────────┐     ┌───────────────┐
│   Fetching    │ --> │    Consume    │
│  (Definition) │     │  (Consumer)   │
│               │     │               │
│ features/     │     │ Feature/UI    │
│  */api/       │     │ Components    │
│  */store/     │     │ (JSX render)  │
└───────────────┘     └───────────────┘
```

- **Rule**: [MUST] Data flows only in the Fetching -> Consume direction. Reverse data flow (direct fetch in the Consume layer, copying server data to client store, etc.) is prohibited.

### Responsibilities of Each Layer

| Layer | Location | Responsibility | Does NOT include |
|--------|------|------|-----------------|
| Fetching (Definition) | `features/*/api/query-options.ts` | query key, `queryOptions()`, `queryFn` definition | `select`, screen-specific data transformation, UI rendering |
| Fetching (Hook) | Endpoint hook files in `features/*/api/` | `useQuery`, `useMutation`, endpoint-specific transform/helper, invalidate | JSX rendering, general-purpose utility placement |
| Fetching (State) | `features/*/store/` — Zustand store | Client UI state storage | Server data copying |
| Consume (Consumer) | Feature/UI/Page components | JSX rendering, event handling | Direct fetch, data transformation |

### Query Options Strategy

`query-options.ts` is the single entry point for query definitions. Query keys and `queryOptions()` factories are gathered in this file, but screen-specific data transformations are not included.

#### Principle: Do not put transformation logic in `query-options.ts`

- **Rule**: [MUST] The `queryFn` in `queryOptions` is responsible only for pure API calls.
- **Rule**: [MUST NOT] Do not write `select` options or screen-specific data transformation logic in `query-options.ts`.

#### Principle: Co-locate endpoint-specific transformations in the custom hook file

- **Rule**: [SHOULD] Transforms/helpers/types used only by a single endpoint are kept private within that endpoint hook file.
- **Rule**: [SHOULD] Only promote helpers/types to `types/`, `constants/`, `lib/`, etc. when they are reused by 2 or more files or when the file becomes excessively large.
- **Rule**: [MUST] Use shared auto-generated types as-is for API request/response types.
- **Good example**:
  ```typescript
  // features/order/api/use-orders-query.ts — Endpoint-specific transformations co-located within the file
  import { useQuery } from '@tanstack/react-query';
  import type { GetOrdersRequest, GetOrdersResponse } from '@/types/generated/order.generated';
  import { orderQueryOptions } from './query-options';

  type OrderListItem = {
    id: string;
    displayTotal: string;
    statusLabel: string;
    isShippable: boolean;
  };

  const toOrderListItem = (data: GetOrdersResponse): OrderListItem[] =>
    data.orders.map((order) => ({
      id: order.id,
      displayTotal: formatCurrency(order.total),
      statusLabel: ORDER_STATUS_LABELS[order.status],
      isShippable: order.status === 'confirmed' && !order.isShipped,
    }));

  export function useOrdersQuery(params: GetOrdersRequest) {
    return useQuery({
      ...orderQueryOptions.list(params),
      select: toOrderListItem,
    });
  }
  ```

#### File Pattern Summary

| File pattern | Location | Role | Testing |
|-----------|------|------|--------|
| `query-options.ts` | `api/` | query key + `queryOptions()` + `queryFn` definition | Pure function unit tests |
| `endpoint hook file` | `api/` | Handles `useQuery`/`useSuspenseQuery` for queries, `useMutation` with invalidate/update for mutations, and co-locates endpoint-specific transform/helpers | `renderHook`-based tests |

## 7. Code Co-location

- **Rule**: [SHOULD] Related files (components, types, sub-component-specific files) are placed in the same folder.

```text
components/ui/button/
└── Button.tsx              # Component implementation (named export)
```

```text
features/order/components/order-list/
├── OrderList.tsx           # Feature component (named export)
└── OrderListItem.tsx       # Sub-component (exclusive to this Feature)

features/_common/po/components/po-picker-dialog/
└── POPickerDialog.tsx      # Domain component shared across multiple Features

features/order/api/
├── query-options.ts
├── use-orders-query.ts
└── use-update-order-mutation.ts
```

## 8. Import Path Rules

General import rules (absolute paths, ordering, type imports, barrel file prohibition) are based on `frontend/FRONTEND_CONVENTION.md`. This document only emphasizes rules that directly affect Feature dependency tracking.

- **Rule**: [MUST] Internal project modules use `@/` absolute paths by default. Relative paths (`./`, `../`) are allowed for the same folder/subfolders.
- **Rule**: [MUST NOT] Do not use `index.ts` barrel files. They obscure Feature dependency directions and actual reference points.
- **Good example**:
  ```tsx
  import { OrderList } from '@/features/order/components/order-list/OrderList';
  import { useOrdersQuery } from '@/features/order/api/use-orders-query';
  import { formatCurrency } from '@/lib/format-currency';
  ```

## 9. Anti-Patterns

### Circular Dependencies

- **Rule**: [MUST NOT] Do not create circular dependencies between modules (A -> B -> A).
- **Rule**: [MUST NOT] Regardless of circularity, a Domain Feature must not directly import another Domain Feature.
- **Bad example**:
  ```tsx
  // Domain Feature -> Domain Feature direct dependency + circular dependency -- Prohibited
  // features/order/components/order-card/OrderCard.tsx
  import { UserAvatar } from '@/features/user/components/user-avatar/UserAvatar';

  // features/user/components/user-orders/UserOrders.tsx
  import { OrderSummary } from '@/features/order/components/order-summary/OrderSummary';
  ```
- **Good example**:
  ```tsx
  // Commonly needed code is promoted to _common/{domain} then imported
  // features/order/components/order-card/OrderCard.tsx
  import { UserAvatar } from '@/features/_common/user/components/user-avatar/UserAvatar';

  // Shared types are placed in types/ -- prevents circular dependencies
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

### Flat Listing of Components

- **Rule**: [MUST NOT] Do not flat-list files at the top level of `components/`. Always classify under `ui/` or `layout/` subdirectories. Feature components are placed under `features/`.
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
  ├── _common/po/components/
  │   └── POPickerDialog/
  ├── order/components/
  │   └── OrderList/
  └── user/components/
      └── UserProfile/
  ```

### Writing Transformation Logic Directly in Components

- **Rule**: [MUST NOT] Do not write endpoint-specific data transformation logic directly inside Feature components. Place necessary transformations in the corresponding endpoint hook file.

### Writing Transformation Logic in `query-options.ts`

- **Rule**: [MUST NOT] Do not write `select` or screen-specific transformation logic in `query-options.ts`. Place endpoint-specific transformations in the corresponding endpoint hook file.

### Using Barrel Files

- **Rule**: [MUST NOT] Do not use any form of `index.ts` barrel files. They cause circular dependencies and degrade tree-shaking/HMR performance.

### Copying Server Data to Client Store

- **Rule**: [MUST NOT] Do not copy server data managed by TanStack Query into a Zustand store.

## 10. AI Agent Decision Trees

Three decision trees are provided so that AI agents can make quick decisions when generating code.

### 1. File Location Decision Tree

"Where should I place the new file?"

```text
New file creation
|
+-- Is it specific to a particular domain (order, auth, user, etc.)?
|  +-- YES -> Under features/{domain}/
|     |
|     +-- API call / TanStack Query hook?
|     |  +-- features/{domain}/api/
|     |     (query-options.ts, endpoint hook files)
|     |
|     +-- Component with business logic?
|     |  +-- features/{domain}/components/xxx-component/
|     |
|     +-- Feature-specific Zustand store?
|     |  +-- features/{domain}/store/
|     |
|     +-- Feature-specific Zod schema?
|     |  +-- features/{domain}/schemas/
|     |
|     +-- Feature-specific type?
|     |  +-- features/{domain}/types/
|     |
|     +-- Feature-specific constant?
|     |  +-- features/{domain}/constants/
|     |
|     +-- Feature-specific pure utility/helper?
|     |  +-- features/{domain}/utils/
|
+-- Shared by 2+ Features + has domain context?
|  +-- YES -> Under features/_common/{domain}/
|     * Do not directly import between Domain Features; promote here instead
|     |
|     +-- Shared Feature component?
|     |  +-- features/_common/{domain}/components/xxx-component/
|     |
|     +-- Shared Feature API / TanStack Query hook?
|     |  +-- features/_common/{domain}/api/
|     |
|     +-- Shared Feature hook?
|     |  +-- features/_common/{domain}/hooks/
|     |
|     +-- Shared Feature type/constant/schema/utility?
|        +-- features/_common/{domain}/{types|constants|schemas|utils}/
|
+-- General-purpose (domain-agnostic)?
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
   +-- Constant shared across multiple Features?
      +-- constants/
```

### 2. State Management Tool Selection Tree

"Which tool should I use?"

```text
State is needed
|
+-- Is it data from the server? (API response, DB data)
|  +-- YES -> TanStack Query (useQuery / useMutation)
|     * Do not copy to Zustand
|
+-- Should it be reflected in the URL? (filter, sort, pagination)
|  +-- YES -> nuqs
|     * Preserves state for link sharing, bookmarking, back/forward navigation
|
+-- Is it used by only a single component?
|  +-- YES -> useState / useReducer
|     * Do not put it in a global store
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
|     Characteristics: store/queries usage prohibited
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