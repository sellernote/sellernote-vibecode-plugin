# Frontend Architecture Convention

> This document defines the directory structure, layer hierarchy, and dependency direction of frontend projects.
> It follows a 5-layer architecture that adapts Feature-Sliced Design (FSD) to the Next.js App Router.
> Parent rules: FRONTEND_CONVENTION.md

## FSD Overview

Feature-Sliced Design (FSD) is an architecture methodology that **coheres frontend projects by domain units** and **controls dependencies between layers unidirectionally**. For compatibility with the Next.js App Router, **app/pages/processes are unified into `app/`**, operating with the following 5 layers.

| Layer | Role |
|--------|------|
| `app/` | Next.js App Router. Routing, layouts, page composition |
| `widgets/` | Independent UI blocks. Self-contained units combining multiple features/entities |
| `features/` | Business feature units. User action handling |
| `entities/` | Domain entities. Core data models and basic UI representation |
| `shared/` | Domain-agnostic shared code. Utilities, common UI, configuration |

## Directory Layout

- **Rule**: [MUST] Projects must follow the FSD 5-layer directory structure below.

```
src/
├── app/                          # Next.js App Router (FSD app + pages role)
│   ├── (auth)/                   # Route Group: authentication related
│   ├── (dashboard)/              # Route Group: dashboard
│   ├── globals.css               # Tailwind CSS + CSS Variables (design tokens)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   └── api/                      # Route Handlers
│
├── widgets/                      # Independent UI blocks (layouts, dashboard sections)
│   ├── header/
│   │   ├── ui/Header.tsx
│   │   └── index.ts              # Public API
│   └── ...
│
├── features/                     # Business feature units
│   ├── order/
│   │   ├── components/           # UI components specific to this feature
│   │   ├── hooks/                # Custom hooks specific to this feature
│   │   ├── queries/              # TanStack Query hooks + query keys
│   │   ├── store/                # Zustand slices
│   │   ├── actions/              # Server Actions
│   │   ├── schemas/              # Zod validation schemas
│   │   └── index.ts              # Public API
│   └── ...
│
├── entities/                     # Domain entities (pure data models + basic UI)
│   ├── order/
│   │   ├── model/                # Types, schemas
│   │   ├── ui/                   # Basic UI (props-only)
│   │   ├── lib/                  # Domain utilities
│   │   └── index.ts              # Public API
│   └── ...
│
└── shared/                       # Shared code (domain-agnostic)
    ├── ui/                       # Common UI (project-specific UI not in DS)
    ├── hooks/                    # Common custom hooks
    ├── lib/                      # Utilities (cn(), API client, etc.)
    ├── store/                    # Global UI store
    ├── types/                    # Common types
    ├── constants/                # Constants
    └── config/                   # Environment configuration
```

## Layer Hierarchy and Dependency Rules

### Hierarchy Diagram

```
┌─────────────────────────────────────────────┐
│  app/           ← Top level (can import all layers) │
├─────────────────────────────────────────────┤
│  widgets/       ← features, entities, shared      │
├─────────────────────────────────────────────┤
│  features/      ← entities, shared                │
├─────────────────────────────────────────────┤
│  entities/      ← shared                          │
├─────────────────────────────────────────────┤
│  shared/        ← External libraries only          │
└─────────────────────────────────────────────┘
```

### Upward Import Prohibition

- **Rule**: [MUST NOT] Lower layers must not import from upper layers.

```tsx
// entities/order/lib/formatOrder.ts — uses shared only
import { formatCurrency } from '@/shared/lib/format';

export function formatOrder(order: Order) {
  return { ...order, totalFormatted: formatCurrency(order.total) };
}
```

### Cross-import Prohibition

- **Rule**: [MUST NOT] Slices within the same layer must not directly import from other slices in that layer.

```tsx
// features/order/components/OrderList.tsx — imports from a lower layer (entities)
import { UserAvatar } from '@/entities/user';
```

### Cross-import Resolution Patterns

When two slices in the same layer need to share data, resolve it using one of these two patterns.

1. **Extract common data to a lower layer**: Move shared data down to `entities/` or `shared/`.
2. **Compose in an upper layer**: Combine multiple features in `widgets/` or `app/`.

```tsx
// widgets/order-dashboard/ui/OrderDashboard.tsx — composing multiple features in an upper layer
import { OrderList } from '@/features/order';
import { UserFilter } from '@/features/user';

export function OrderDashboard() {
  return (
    <section>
      <UserFilter />
      <OrderList />
    </section>
  );
}
```

### Public API Access Only

- **Rule**: [MUST] External access to each slice is only allowed through its `index.ts`. Direct import of internal files is prohibited.

### shared/ Segment Structure

- **Rule**: [MUST] `shared/` is organized by technical segments (`ui/`, `hooks/`, `lib/`, `store/`, `types/`, `constants/`, `config/`), not by slices.

## app/ Layer

- **Rule**: [MUST] The `app/` directory follows Next.js App Router conventions and only contains route-related files.
- **Rule**: [MUST] `page.tsx` must not contain business logic directly. Compose screens by combining `widgets/` and `features/`.

```tsx
// app/(dashboard)/orders/page.tsx — composition of widgets/features only
import { Suspense } from 'react';
import { PageLayout } from '@/widgets/page-layout';
import { OrderList, OrderFilter } from '@/features/order';
import { OrderListSkeleton } from '@/entities/order';

export default function OrdersPage() {
  return (
    <PageLayout title="주문 관리">
      <OrderFilter />
      <Suspense fallback={<OrderListSkeleton />}>
        <OrderList />
      </Suspense>
    </PageLayout>
  );
}
```

### Route Groups

- **Rule**: [SHOULD] Group related routes using Route Groups (`(folder)`) to share layouts and middleware.

```tsx
// app/(dashboard)/layout.tsx — shared layout for pages requiring authentication
import { Header } from '@/widgets/header';
import { Sidebar } from '@/widgets/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main><Header />{children}</main>
    </div>
  );
}
```

## widgets/ Layer

- **Rule**: [MUST] `widgets/` contains independent, self-contained UI blocks. They form a single independent unit by combining multiple `features/` and `entities/`.
- **Rule**: [MUST] Each widget is exposed externally through its `index.ts` (Public API).

### Distinction from entities

| Criteria | widgets/ | entities/ |
|------|----------|-----------|
| Composition | Independent blocks combining multiple domains | Basic units of a single domain |
| Examples | Header, Sidebar, OrderDashboard | OrderCard, OrderBadge, UserAvatar |
| Dependencies | features, entities, shared | shared only |

```tsx
// widgets/header/ui/Header.tsx
'use client';

import { UserMenu } from '@/features/user';
import { NotificationBell } from '@/features/notification';
import { Logo } from '@/shared/ui/logo';

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Logo />
      <div className="flex items-center gap-4">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
```
```ts
// widgets/header/index.ts — Public API
export { Header } from './ui/Header';
```

## features/ Layer

- **Rule**: [MUST] `features/` contains business feature units that deliver value to users. Each feature slice may include domain-specific `components/`, `hooks/`, `queries/`, `store/`, `actions/`, `schemas/`, and exposes a Public API through `index.ts`.

### features/ Internal Structure

```
features/order/
├── components/           # UI components specific to this feature
│   ├── OrderList.tsx
│   ├── OrderFilter.tsx
│   └── OrderListItem.tsx
├── hooks/                # Custom hooks specific to this feature
│   └── useOrderExport.ts
├── queries/              # TanStack Query hooks + query keys
│   ├── useOrdersQuery.ts
│   └── orderKeys.ts
├── store/                # Zustand slices
│   └── orderStore.ts
├── actions/              # Server Actions
│   └── createOrder.ts
├── schemas/              # Zod validation schemas
│   └── orderFormSchema.ts
└── index.ts              # Public API
```

### Distinction from entities: "What does it do" vs "What is it"

| Criteria | features/ | entities/ |
|------|-----------|-----------|
| Question | "**What do you do** with an order" | "**What is** an order" |
| Examples | OrderList, OrderFilter, useOrdersQuery, createOrder | Order type, OrderCard, OrderBadge, formatOrderDate |
| Dependencies | entities, shared | shared only |
| State | Can use store, queries | props-only (store/queries prohibited) |

```tsx
// features/order/components/OrderList.tsx — business feature
'use client';

import { OrderCard } from '@/entities/order';
import { DataTable } from '@/shared/ui/data-table';
import { useOrdersQuery } from '../queries/useOrdersQuery';
import { useOrderStore } from '../store/orderStore';

export function OrderList() {
  const { filter } = useOrderStore();
  const { data, isLoading } = useOrdersQuery(filter);

  if (isLoading) return <DataTable columns={ORDER_COLUMNS} data={[]} isLoading />;

  return (
    <ul>
      {data?.orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </ul>
  );
}
```
```ts
// features/order/index.ts — Public API (expose only what is needed)
export { OrderList } from './components/OrderList';
export { OrderFilter } from './components/OrderFilter';
export { useOrdersQuery } from './queries/useOrdersQuery';
export type { OrderFilter as OrderFilterType } from './store/orderStore';
```

## entities/ Layer

- **Rule**: [MUST] `entities/` contains core data models, basic UI representations, and domain utilities for the business domain.
- **Rule**: [MUST] UI components in `entities/` operate with props only and must not depend on store or queries.

### entities/ Internal Segments

| Segment | Role | Examples |
|----------|------|------|
| `model/` | Type definitions, Zod schemas | `types.ts`, `schemas.ts` |
| `ui/` | Basic UI components (props-only) | `OrderCard.tsx`, `OrderBadge.tsx` |
| `lib/` | Domain utility functions | `formatOrder.ts`, `calculateTotal.ts` |

```
entities/order/
├── model/
│   ├── types.ts              # Order type definitions
│   └── schemas.ts            # Zod schemas (for entity validation)
├── ui/
│   ├── OrderCard.tsx          # props-only UI
│   ├── OrderBadge.tsx
│   └── OrderListSkeleton.tsx
├── lib/
│   └── formatOrder.ts         # Domain utilities
└── index.ts                   # Public API
```

```tsx
// entities/order/ui/OrderCard.tsx — operates with props only
import { Badge } from '@sellernote/design-system';
import { formatOrderDate } from '../lib/formatOrder';
import type { Order } from '../model/types';

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  return (
    <div className="rounded-lg border p-4" onClick={() => onClick?.(order)}>
      <h3>{order.orderNumber}</h3>
      <Badge variant={order.status === 'completed' ? 'success' : 'default'}>
        {order.status}
      </Badge>
      <p>{formatOrderDate(order.createdAt)}</p>
    </div>
  );
}
```
```ts
// entities/order/index.ts — Public API
export { OrderCard } from './ui/OrderCard';
export { OrderBadge } from './ui/OrderBadge';
export { OrderListSkeleton } from './ui/OrderListSkeleton';
export { formatOrderDate, formatOrderTotal } from './lib/formatOrder';
export type { Order, OrderStatus } from './model/types';
export { orderSchema } from './model/schemas';
```

## shared/ Layer

- **Rule**: [MUST] `shared/` contains domain-agnostic shared code. It is organized by technical segments, not by slices.

### shared/ Segments

| Segment | Role | Examples |
|----------|------|------|
| `ui/` | Project-specific UI components not in DS | `DataTable`, `FileUpload`, `StatusBadge` |
| `hooks/` | Common custom hooks | `useDebounce`, `useMediaQuery`, `useLocalStorage` |
| `lib/` | Utility functions | `cn()`, `formatCurrency`, API client |
| `store/` | Global UI store (theme, sidebar state, etc.) | `uiStore.ts` |
| `types/` | Common type definitions | `ApiResponse<T>`, `Pagination` |
| `constants/` | Constants | `ROUTES`, `QUERY_KEYS_BASE` |
| `config/` | Environment configuration | `env.ts`, `apiConfig.ts` |

### Relationship with @sellernote/design-system

- **Rule**: [MUST] `@sellernote/design-system` is an external library and can be directly imported from any layer. `shared/ui/` should only contain project-specific UI not available in DS. Do not wrap DS components in `shared/ui/`.

```tsx
// shared/ui/data-table/DataTable.tsx — project-specific UI not in DS
import { Table, TableHead, TableBody } from '@sellernote/design-system';

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
}

export function DataTable<T>({ columns, data, isLoading }: DataTableProps<T>) {
  if (isLoading) return <TableSkeleton columns={columns.length} />;
  return <Table><TableHead columns={columns} /><TableBody data={data} columns={columns} /></Table>;
}
```

## Public API Rules

- **Rule**: [MUST] Each slice (`features/`, `entities/`, `widgets/`) must explicitly export only the items to be exposed externally through `index.ts`. External access is only allowed through `index.ts`.

```tsx
// Accessing through Public API from outside
import { OrderList, OrderFilter } from '@/features/order';
import { OrderCard, formatOrderDate } from '@/entities/order';
import { Header } from '@/widgets/header';
import type { Order } from '@/entities/order';
```

### index.ts Writing Guide

- **Rule**: [SHOULD] `index.ts` should only expose items that are actually needed externally. Do not over-expose internal implementations.

```ts
// features/order/index.ts — expose only what is needed externally
export { OrderList } from './components/OrderList';
export { OrderFilter } from './components/OrderFilter';
export type { OrderFilter as OrderFilterType } from './store/orderStore';
```

## Import Path Rules

### Use Absolute Paths

- **Rule**: [MUST] Import paths must be written as absolute paths using the `@/` prefix. Use relative paths between files within the same slice.

`tsconfig.json` configuration:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```tsx
// features/order/components/OrderList.tsx

// External slices use absolute paths + Public API
import { OrderCard } from '@/entities/order';
import { DataTable } from '@/shared/ui/data-table';

// Within the same slice use relative paths
import { useOrdersQuery } from '../queries/useOrdersQuery';
import { useOrderStore } from '../store/orderStore';
```

### Import Order

- **Rule**: [MUST] Import statements must be written in the following 8-category order, with blank lines between categories.

```tsx
// 1) React/external libraries
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2) Design system
import { Button, Card } from '@sellernote/design-system';

// 3) widgets
import { PageLayout } from '@/widgets/page-layout';

// 4) features
import { OrderFilter } from '@/features/order';

// 5) entities
import { OrderCard } from '@/entities/order';

// 6) shared
import { formatCurrency } from '@/shared/lib/format';

// 7) Relative paths (within the same slice)
import { useOrderStore } from '../store/orderStore';

// 8) Types (type imports)
import type { Order } from '@/entities/order';
import type { OrderFilter as OrderFilterType } from '../store/orderStore';
```

## Code Colocation

- **Rule**: [SHOULD] Related files (components, tests, stories) should be placed in the same folder within each slice.

```
features/order/components/
├── OrderList.tsx              # Feature component
├── OrderList.test.tsx         # Unit test
├── OrderList.stories.tsx      # Storybook story
└── OrderListItem.tsx          # Sub-component (specific to this feature)
```

## Anti-patterns

### Cross-import

- **Rule**: [MUST NOT] Do not directly import from other slices within the same layer. Compose in an upper layer (widgets/app).

### Upward Dependency

- **Rule**: [MUST NOT] Do not import from upper layers in lower layers.

### Public API Bypass

- **Rule**: [MUST NOT] Do not directly import internal files of a slice without going through `index.ts`.

### Slice Leakage

- **Rule**: [MUST NOT] Do not over-expose internal implementations (internal-only components, internal stores, query keys, etc.) in `index.ts`.

### Bloated shared/

- **Rule**: [MUST NOT] Do not place domain logic in `shared/`. Domain logic belongs in `entities/`.

### Business Logic in entities

- **Rule**: [MUST NOT] Do not place `useQuery` or `store`-dependent code in `entities/`. UI in entities must operate with props only.

### Bloated Feature Slices

- **Rule**: [SHOULD NOT] If a single feature slice has 10 or more components, consider splitting it.

```
features/order-management/     # Order inquiry/management features
features/order-form/           # Order creation/editing features
features/order-fulfillment/    # Order processing (shipping, refund) features
```

### Circular Dependencies

- **Rule**: [MUST NOT] Do not create circular dependencies between modules (A -> B -> A). Resolve by extracting common logic to a lower layer (`entities/` or `shared/`).

### Anti-pattern Summary

| Anti-pattern | Description | Marker |
|---------|------|------|
| Cross-import | Direct import of `features/user` from `features/order` | [MUST NOT] |
| Upward dependency | Import of `features/` from `entities/` | [MUST NOT] |
| Public API bypass | Direct import of `@/features/order/components/OrderList` | [MUST NOT] |
| Slice leakage | Over-exposing internal implementations in `index.ts` | [MUST NOT] |
| Bloated shared/ | Placing domain logic in `shared/` | [MUST NOT] |
| Business logic in entities | Placing useQuery or store-dependent code in entities | [MUST NOT] |
| Bloated feature slices | A single feature having 10+ components | [SHOULD NOT] |
| Circular dependencies | A -> B -> A cycles between modules | [MUST NOT] |