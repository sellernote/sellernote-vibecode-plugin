# 프론트엔드 아키텍처 컨벤션

> 이 문서는 프론트엔드 프로젝트의 디렉토리 구조, 레이어 계층, 의존성 방향을 정의합니다.
> Feature-Sliced Design(FSD)을 Next.js App Router에 적응시킨 5계층 아키텍처를 따릅니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

## FSD 개요

Feature-Sliced Design(FSD)은 프론트엔드 프로젝트를 **도메인 단위로 응집**시키고, **레이어 간 의존성을 단방향으로 제어**하는 아키텍처 방법론이다.

기존 기술적 역할(components/ui, components/feature, hooks, store 등) 기준 분류에서는 프로젝트 규모가 커지면 하나의 도메인(예: 주문)에 관련된 파일이 여러 디렉토리에 흩어져 응집도가 떨어진다. FSD를 도입하여 도메인별로 코드를 모으고, 레이어 간 의존성을 엄격히 제어한다.

표준 FSD는 7계층(app, processes, pages, widgets, features, entities, shared)을 정의하지만, Next.js App Router와의 호환을 위해 **app/pages/processes를 Next.js의 `app/`으로 통합**하여 다음 5계층으로 운영한다.

| 레이어 | 역할 |
|--------|------|
| `app/` | Next.js App Router. 라우팅, 레이아웃, 페이지 조합 |
| `widgets/` | 독립적 UI 블록. 여러 features/entities를 조합한 자체 완결 단위 |
| `features/` | 비즈니스 기능 단위. 사용자 액션 처리 |
| `entities/` | 도메인 엔터티. 핵심 데이터 모델과 기본 UI 표현 |
| `shared/` | 도메인 무관 공유 코드. 유틸리티, 공통 UI, 설정 |

## 디렉토리 레이아웃

- **규칙**: [MUST] 프로젝트는 다음 FSD 5계층 디렉토리 구조를 따른다.

```
src/
├── app/                          # Next.js App Router (FSD app + pages 역할)
│   ├── (auth)/                   # Route Group: 인증 관련
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Route Group: 대시보드
│   │   ├── orders/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx
│   ├── globals.css               # Tailwind CSS + CSS Variables (디자인 토큰)
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 홈 페이지
│   ├── error.tsx                 # 전역 에러 경계
│   ├── not-found.tsx             # 404 페이지
│   └── api/                      # Route Handlers
│
├── widgets/                      # 독립적 UI 블록 (레이아웃, 대시보드 섹션)
│   ├── header/
│   │   ├── ui/Header.tsx
│   │   └── index.ts              # Public API
│   ├── sidebar/
│   │   ├── ui/Sidebar.tsx
│   │   └── index.ts
│   ├── page-layout/
│   │   ├── ui/PageLayout.tsx
│   │   └── index.ts
│   └── order-dashboard/
│       ├── ui/OrderDashboard.tsx
│       └── index.ts
│
├── features/                     # 비즈니스 기능 단위
│   ├── order/
│   │   ├── components/           # 이 feature 전용 UI 컴포넌트
│   │   ├── hooks/                # 이 feature 전용 커스텀 훅
│   │   ├── queries/              # TanStack Query 훅 + 쿼리 키
│   │   ├── store/                # Zustand 슬라이스
│   │   ├── actions/              # Server Actions
│   │   ├── schemas/              # Zod 유효성 검사 스키마
│   │   └── index.ts              # Public API
│   └── user/
│       ├── components/
│       ├── hooks/
│       ├── queries/
│       └── index.ts
│
├── entities/                     # 도메인 엔터티 (순수 데이터 모델 + 기본 UI)
│   ├── order/
│   │   ├── model/                # 타입, 스키마
│   │   │   ├── types.ts
│   │   │   └── schemas.ts
│   │   ├── ui/                   # 기본 UI (props-only)
│   │   │   ├── OrderCard.tsx
│   │   │   └── OrderBadge.tsx
│   │   ├── lib/                  # 도메인 유틸리티
│   │   │   └── formatOrder.ts
│   │   └── index.ts              # Public API
│   └── user/
│       ├── model/
│       ├── ui/
│       ├── lib/
│       └── index.ts
│
└── shared/                       # 공유 코드 (도메인 무관)
    ├── ui/                       # 공통 UI (DS에 없는 프로젝트 고유 UI)
    ├── hooks/                    # 공통 커스텀 훅
    ├── lib/                      # 유틸리티 (cn(), API 클라이언트 등)
    ├── store/                    # 글로벌 UI 스토어
    ├── types/                    # 공통 타입
    ├── constants/                # 상수
    └── config/                   # 환경 설정
```

- **이유**: 도메인 단위로 파일을 응집시키면 관련 코드를 한곳에서 파악할 수 있고, 레이어별 의존성 방향이 명확해진다. 기존 기술적 역할 기반 분류(components/, hooks/, store/)는 도메인이 흩어져 파일 탐색과 수정이 어렵다.

## 레이어 계층 및 의존성 규칙

### 계층도

```
┌─────────────────────────────────────────────┐
│  app/           ← 최상위 (모든 레이어 import 가능)  │
├─────────────────────────────────────────────┤
│  widgets/       ← features, entities, shared      │
├─────────────────────────────────────────────┤
│  features/      ← entities, shared                │
├─────────────────────────────────────────────┤
│  entities/      ← shared                          │
├─────────────────────────────────────────────┤
│  shared/        ← 외부 라이브러리만                  │
└─────────────────────────────────────────────┘
```

### 상향 import 금지

- **규칙**: [MUST NOT] 하위 레이어는 상위 레이어를 import할 수 없다.
- **이유**: 상향 의존이 생기면 하위 레이어가 상위 레이어에 종속되어 재사용성이 사라지고, 변경 파급 범위가 예측 불가능해진다.
- **나쁜 예시**:
  ```tsx
  // entities/order/lib/formatOrder.ts — entities가 features를 import (금지!)
  import { useOrderStore } from '@/features/order';

  export function formatOrder(order: Order) {
    const filter = useOrderStore.getState().filter; // 상향 의존
    // ...
  }
  ```
- **좋은 예시**:
  ```tsx
  // entities/order/lib/formatOrder.ts — shared만 사용
  import { formatCurrency } from '@/shared/lib/format';

  export function formatOrder(order: Order) {
    return { ...order, totalFormatted: formatCurrency(order.total) };
  }
  ```

### Cross-import 금지

- **규칙**: [MUST NOT] 같은 레이어의 다른 슬라이스를 직접 import할 수 없다.
- **이유**: Cross-import는 슬라이스 간 암묵적 결합을 만들어 독립적인 수정/삭제를 방해한다.
- **나쁜 예시**:
  ```tsx
  // features/order/components/OrderList.tsx — 같은 레이어(features)의 다른 슬라이스 import (금지!)
  import { useUserProfile } from '@/features/user';
  ```
- **좋은 예시**:
  ```tsx
  // features/order/components/OrderList.tsx — 하위 레이어(entities)에서 가져온다
  import { UserAvatar } from '@/entities/user';
  ```

### Cross-import 해결 패턴

같은 레이어의 두 슬라이스가 데이터를 공유해야 할 때, 다음 두 가지 패턴으로 해결한다.

1. **공통 데이터를 하위 레이어로 추출**: 공유 데이터를 `entities/` 또는 `shared/`로 내린다.
2. **상위 레이어에서 조합**: `widgets/` 또는 `app/`에서 여러 features를 조합한다.

```tsx
// widgets/order-dashboard/ui/OrderDashboard.tsx — 상위 레이어에서 여러 features 조합
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

### Public API 접근만 허용

- **규칙**: [MUST] 각 슬라이스의 `index.ts`를 통해서만 외부 접근이 가능하다. 내부 파일 직접 import는 금지한다.
- **이유**: Public API를 통해서만 접근하면, 슬라이스 내부 구조를 자유롭게 리팩토링할 수 있고, 외부 의존성을 명시적으로 관리할 수 있다.

### shared/ 세그먼트 구성

- **규칙**: [MUST] `shared/`는 슬라이스가 아닌 기술적 세그먼트(`ui/`, `hooks/`, `lib/`, `store/`, `types/`, `constants/`, `config/`)로 구성한다.
- **이유**: `shared/`는 도메인에 종속되지 않는 범용 코드를 모으는 계층이므로 도메인별 슬라이스가 아닌 기술적 역할별로 분류한다.

## app/ 레이어

- **규칙**: [MUST] `app/` 디렉토리는 Next.js App Router 컨벤션을 따르며, 라우트 관련 파일만 배치한다.
- **규칙**: [MUST] `page.tsx`에는 비즈니스 로직을 직접 작성하지 않는다. `widgets/`와 `features/`를 조합하여 화면을 구성한다.
- **이유**: `app/` 디렉토리는 Next.js App Router의 라우팅 메커니즘과 직접 연결된다. 라우트 파일(`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` 등)만 배치하여 라우팅 구조를 한눈에 파악할 수 있게 한다. 비즈니스 로직이 `page.tsx`에 들어가면 파일이 비대해지고 테스트가 어려워진다.
- **좋은 예시**:
  ```tsx
  // app/(dashboard)/orders/page.tsx — widgets/features 조합만
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
- **나쁜 예시**:
  ```tsx
  // app/(dashboard)/orders/page.tsx — page.tsx에 비즈니스 로직이 직접 들어감 (금지!)
  'use client';

  import { useOrderStore } from '@/features/order/store/orderStore';
  import { useOrdersQuery } from '@/features/order/queries/useOrdersQuery';

  export default function OrdersPage() {
    const { filter, setFilter } = useOrderStore();
    const { data, isLoading } = useOrdersQuery(filter);
    const handleExport = async () => { /* CSV 다운로드 로직 */ };

    return <div>{/* 수십 줄의 JSX와 비즈니스 로직이 혼재 */}</div>;
  }
  ```

### Route Groups

- **규칙**: [SHOULD] 관련 라우트를 Route Group으로 묶어 레이아웃과 미들웨어를 공유한다.
- **이유**: Route Group(`(folder)`)은 URL 경로에 영향을 주지 않으면서 라우트를 논리적으로 그룹화할 수 있다. 인증 여부, 레이아웃 유형 등 공통 속성을 가진 라우트를 묶으면 레이아웃 중복을 제거하고, 인증 가드를 그룹 단위로 적용할 수 있다.
- **좋은 예시**:
  ```
  src/app/
  ├── (auth)/                       # 인증 관련 라우트 그룹
  │   ├── layout.tsx                # 인증 전용 레이아웃 (로고만 표시)
  │   ├── login/page.tsx
  │   └── signup/page.tsx
  ├── (dashboard)/                  # 인증 필요 라우트 그룹
  │   ├── layout.tsx                # 대시보드 레이아웃 (Sidebar + Header)
  │   ├── orders/page.tsx           # /orders
  │   └── settings/page.tsx         # /settings
  └── layout.tsx                    # 루트 레이아웃
  ```
  ```tsx
  // app/(auth)/layout.tsx — 로그인/회원가입 공용 레이아웃
  export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <div className="auth-container"><Logo />{children}</div>;
  }

  // app/(dashboard)/layout.tsx — 인증 필요 페이지 공용 레이아웃
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

## widgets/ 레이어

- **규칙**: [MUST] `widgets/`에는 독립적이고 자체 완결적인 UI 블록을 배치한다. 여러 `features/`와 `entities/`를 조합하여 하나의 독립 단위를 형성한다.
- **규칙**: [MUST] 각 위젯은 `index.ts`(Public API)를 통해 외부에 노출한다.
- **이유**: 레이아웃, 헤더, 사이드바, 대시보드 섹션처럼 여러 도메인을 조합하되, 어디에든 재배치 가능한 독립 블록을 widgets/에 두면 app/ 레이어가 단순해진다.

### entities와의 구분

| 기준 | widgets/ | entities/ |
|------|----------|-----------|
| 구성 | 여러 도메인을 조합한 독립 블록 | 단일 도메인의 기본 단위 |
| 예시 | Header, Sidebar, OrderDashboard | OrderCard, OrderBadge, UserAvatar |
| 의존 | features, entities, shared | shared만 |

- **좋은 예시**:
  ```tsx
  // widgets/header/ui/Header.tsx — 여러 도메인(user, notification)을 조합한 독립 블록
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

## features/ 레이어

- **규칙**: [MUST] `features/`에는 사용자에게 가치를 제공하는 비즈니스 기능 단위를 배치한다. 각 feature 슬라이스는 도메인별 `components/`, `hooks/`, `queries/`, `store/`, `actions/`, `schemas/`를 포함할 수 있으며, `index.ts`를 통해 Public API를 노출한다.
- **이유**: 비즈니스 기능 단위로 관련 코드를 모으면, 기능 추가/수정 시 하나의 슬라이스 안에서 작업이 완결된다. store, queries, components가 기능별로 응집되어 파일 탐색이 용이하다.

### features/ 내부 구조

```
features/order/
├── components/           # 이 feature 전용 UI 컴포넌트
│   ├── OrderList.tsx
│   ├── OrderFilter.tsx
│   └── OrderListItem.tsx
├── hooks/                # 이 feature 전용 커스텀 훅
│   └── useOrderExport.ts
├── queries/              # TanStack Query 훅 + 쿼리 키
│   ├── useOrdersQuery.ts
│   └── orderKeys.ts
├── store/                # Zustand 슬라이스
│   └── orderStore.ts
├── actions/              # Server Actions
│   └── createOrder.ts
├── schemas/              # Zod 유효성 검사 스키마
│   └── orderFormSchema.ts
└── index.ts              # Public API
```

### entities와의 구분: "무엇을 하는가" vs "무엇인가"

| 기준 | features/ | entities/ |
|------|-----------|-----------|
| 질문 | "주문으로 **무엇을 하는가**" | "주문이란 **무엇인가**" |
| 예시 | OrderList, OrderFilter, useOrdersQuery, createOrder | Order 타입, OrderCard, OrderBadge, formatOrderDate |
| 의존 | entities, shared | shared만 |
| 상태 | store, queries 사용 가능 | props-only (store/queries 금지) |

- **좋은 예시**:
  ```tsx
  // features/order/components/OrderList.tsx — 비즈니스 기능
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
  // features/order/index.ts — Public API (필요한 것만 노출)
  export { OrderList } from './components/OrderList';
  export { OrderFilter } from './components/OrderFilter';
  export { useOrdersQuery } from './queries/useOrdersQuery';
  export type { OrderFilter as OrderFilterType } from './store/orderStore';
  ```

## entities/ 레이어

- **규칙**: [MUST] `entities/`에는 비즈니스 도메인의 핵심 데이터 모델, 기본 UI 표현, 도메인 유틸리티를 배치한다.
- **규칙**: [MUST] `entities/`의 UI 컴포넌트는 props만으로 동작하며, store나 queries에 의존하지 않는다.
- **이유**: entities는 "도메인이 무엇인가"를 정의하는 레이어로, 비즈니스 로직(기능, 액션)과 분리하여 여러 features에서 재사용할 수 있어야 한다. store/queries에 의존하면 재사용이 불가능해진다.

### entities/ 내부 세그먼트

| 세그먼트 | 역할 | 예시 |
|----------|------|------|
| `model/` | 타입 정의, Zod 스키마 | `types.ts`, `schemas.ts` |
| `ui/` | 기본 UI 컴포넌트 (props-only) | `OrderCard.tsx`, `OrderBadge.tsx` |
| `lib/` | 도메인 유틸리티 함수 | `formatOrder.ts`, `calculateTotal.ts` |

```
entities/order/
├── model/
│   ├── types.ts              # Order 타입 정의
│   └── schemas.ts            # Zod 스키마 (엔터티 검증용)
├── ui/
│   ├── OrderCard.tsx          # props-only UI
│   ├── OrderBadge.tsx
│   └── OrderListSkeleton.tsx
├── lib/
│   └── formatOrder.ts         # 도메인 유틸리티
└── index.ts                   # Public API
```

- **좋은 예시**:
  ```tsx
  // entities/order/ui/OrderCard.tsx — props만으로 동작
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
- **나쁜 예시**:
  ```tsx
  // entities/order/ui/OrderCard.tsx — entities에서 store/queries를 사용 (금지!)
  import { useOrderStore } from '@/features/order/store/orderStore';
  import { useOrdersQuery } from '@/features/order/queries/useOrdersQuery';

  export function OrderCard() {
    const { selectedOrder } = useOrderStore();  // 상향 의존 + store 의존
    const { data } = useOrdersQuery();           // 상향 의존 + queries 의존
    // ...
  }
  ```

## shared/ 레이어

- **규칙**: [MUST] `shared/`에는 도메인과 무관한 공유 코드를 배치한다. 슬라이스가 아닌 기술적 세그먼트로 구성한다.
- **이유**: 여러 도메인에서 공통으로 사용하는 유틸리티, UI 컴포넌트, 훅 등을 한곳에 모아 중복을 제거한다.

### shared/ 세그먼트

| 세그먼트 | 역할 | 예시 |
|----------|------|------|
| `ui/` | DS에 없는 프로젝트 고유 UI 컴포넌트 | `DataTable`, `FileUpload`, `StatusBadge` |
| `hooks/` | 공통 커스텀 훅 | `useDebounce`, `useMediaQuery`, `useLocalStorage` |
| `lib/` | 유틸리티 함수 | `cn()`, `formatCurrency`, API 클라이언트 |
| `store/` | 글로벌 UI 스토어 (테마, 사이드바 상태 등) | `uiStore.ts` |
| `types/` | 공통 타입 정의 | `ApiResponse<T>`, `Pagination` |
| `constants/` | 상수 | `ROUTES`, `QUERY_KEYS_BASE` |
| `config/` | 환경 설정 | `env.ts`, `apiConfig.ts` |

### @sellernote/design-system과의 관계

- **규칙**: [MUST] `@sellernote/design-system`은 외부 라이브러리이므로 어느 레이어에서든 직접 import할 수 있다. `shared/ui/`에는 DS에 없는 프로젝트 고유 UI만 배치한다.
- **이유**: DS 컴포넌트를 `shared/ui/`에서 래핑(wrapping)하면 불필요한 추상화 계층이 생긴다. DS는 외부 라이브러리 취급하여 필요한 곳에서 직접 사용한다.
- **좋은 예시**:
  ```tsx
  // features/order/components/OrderFilter.tsx — DS를 직접 import
  import { Button, Select } from '@sellernote/design-system';
  import { useOrderStore } from '../store/orderStore';

  export function OrderFilter() {
    const { filter, setFilter } = useOrderStore();
    return (
      <div className="flex gap-2">
        <Select value={filter.status} onValueChange={(v) => setFilter({ status: v })}>
          {/* ... */}
        </Select>
        <Button onClick={() => setFilter({})}>초기화</Button>
      </div>
    );
  }
  ```
  ```tsx
  // shared/ui/data-table/DataTable.tsx — DS에 없는 프로젝트 고유 UI
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
- **나쁜 예시**:
  ```tsx
  // shared/ui/button/Button.tsx — DS 컴포넌트를 불필요하게 래핑 (금지!)
  import { Button as DSButton } from '@sellernote/design-system';

  export function Button(props: ButtonProps) {
    return <DSButton {...props} />;  // 아무것도 추가하지 않는 래핑
  }
  ```

## Public API 규칙

- **규칙**: [MUST] 각 슬라이스(`features/`, `entities/`, `widgets/`)는 `index.ts`를 통해 외부에 노출할 항목만 명시적으로 export한다. 외부에서는 `index.ts`를 통해서만 접근한다.
- **이유**: Public API를 통해서만 접근하면, 슬라이스 내부 파일 구조를 자유롭게 변경할 수 있다. 내부 구현 세부사항이 외부로 누출되지 않아 결합도가 낮아진다.
- **좋은 예시**:
  ```tsx
  // 외부에서 Public API를 통해 접근
  import { OrderList, OrderFilter } from '@/features/order';
  import { OrderCard, formatOrderDate } from '@/entities/order';
  import { Header } from '@/widgets/header';

  import type { Order } from '@/entities/order';
  ```
- **나쁜 예시**:
  ```tsx
  // 내부 파일을 직접 import (금지!)
  import { OrderList } from '@/features/order/components/OrderList';
  import { useOrderStore } from '@/features/order/store/orderStore';
  import { formatOrderDate } from '@/entities/order/lib/formatOrder';
  import type { Order } from '@/entities/order/model/types';
  ```

### index.ts 작성 가이드

- **규칙**: [SHOULD] `index.ts`에는 외부에서 실제로 필요한 항목만 노출한다. 내부 구현을 과도하게 노출하지 않는다.
- **이유**: 슬라이스의 모든 것을 export하면 Public API의 의미가 퇴색되고, 내부 변경 시 외부 영향 범위가 넓어진다.
- **좋은 예시**:
  ```ts
  // features/order/index.ts — 외부에서 필요한 것만 노출
  export { OrderList } from './components/OrderList';
  export { OrderFilter } from './components/OrderFilter';
  export type { OrderFilter as OrderFilterType } from './store/orderStore';
  ```
- **나쁜 예시**:
  ```ts
  // features/order/index.ts — 내부 구현까지 모두 노출 (금지!)
  export { OrderList } from './components/OrderList';
  export { OrderFilter } from './components/OrderFilter';
  export { OrderListItem } from './components/OrderListItem';  // 내부 전용 컴포넌트
  export { useOrderStore } from './store/orderStore';           // 내부 상태 관리
  export { useOrdersQuery } from './queries/useOrdersQuery';    // 내부 데이터 페칭
  export { ORDER_QUERY_KEYS } from './queries/orderKeys';       // 내부 구현 세부사항
  ```

## Import 경로 규칙

### 절대 경로 사용

- **규칙**: [MUST] import 경로는 `@/` 접두사를 사용한 절대 경로로 작성한다. 같은 슬라이스 내부 파일 간에는 상대 경로를 사용한다.
- **이유**: 절대 경로는 파일 이동 시 import 수정을 최소화하고 가독성을 높인다. 같은 슬라이스 내부에서의 상대 경로는 슬라이스 단위 이동 시 외부 의존성이 변하지 않으므로 허용한다.

`tsconfig.json`에 다음과 같이 paths를 설정한다.

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

- **좋은 예시**:
  ```tsx
  // features/order/components/OrderList.tsx

  // 외부 슬라이스는 절대 경로 + Public API
  import { OrderCard } from '@/entities/order';
  import { DataTable } from '@/shared/ui/data-table';

  // 같은 슬라이스 내부는 상대 경로
  import { useOrdersQuery } from '../queries/useOrdersQuery';
  import { useOrderStore } from '../store/orderStore';
  ```
- **나쁜 예시**:
  ```tsx
  // 상대 경로로 외부 슬라이스 접근 (금지!)
  import { OrderCard } from '../../../entities/order/ui/OrderCard';
  import { DataTable } from '../../../shared/ui/data-table/DataTable';
  ```

### Import 순서

- **규칙**: [MUST] import문은 다음 8개 카테고리 순서로 작성하며, 카테고리 사이에 빈 줄을 둔다.

```tsx
// 1) React/외부 라이브러리
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2) 디자인 시스템
import { Button, Card } from '@sellernote/design-system';

// 3) widgets
import { PageLayout } from '@/widgets/page-layout';

// 4) features
import { OrderFilter } from '@/features/order';

// 5) entities
import { OrderCard } from '@/entities/order';

// 6) shared
import { formatCurrency } from '@/shared/lib/format';

// 7) 상대 경로 (같은 슬라이스 내부)
import { useOrderStore } from '../store/orderStore';

// 8) 타입 (type import)
import type { Order } from '@/entities/order';
import type { OrderFilter as OrderFilterType } from '../store/orderStore';
```

- **이유**: 일관된 import 순서는 코드 리뷰 시 의존성 방향을 즉시 파악할 수 있게 한다. 상위 레이어부터 하위 레이어 순서로 나열하면 의존성 역전을 쉽게 감지할 수 있다.

## 코드 코로케이션

- **규칙**: [SHOULD] 관련 파일(컴포넌트, 테스트, 스토리)은 각 슬라이스 내부의 같은 폴더에 배치한다.
- **이유**: 관련 파일이 한 폴더에 모여 있으면 컴포넌트의 전체 맥락을 빠르게 파악할 수 있고, 컴포넌트 삭제 시 폴더 단위로 정리할 수 있다.

```
features/order/components/
├── OrderList.tsx              # Feature 컴포넌트
├── OrderList.test.tsx         # 단위 테스트
├── OrderList.stories.tsx      # Storybook 스토리
└── OrderListItem.tsx          # 하위 컴포넌트 (이 Feature 전용)
```

```
entities/order/ui/
├── OrderCard.tsx              # Entity UI 컴포넌트
├── OrderCard.test.tsx         # 단위 테스트
├── OrderCard.stories.tsx      # Storybook 스토리
└── OrderBadge.tsx             # 같은 도메인의 다른 UI
```

```
shared/ui/data-table/
├── DataTable.tsx              # 공통 UI 컴포넌트
├── DataTable.test.tsx         # 단위 테스트
├── DataTable.stories.tsx      # Storybook 스토리
└── index.ts                   # 배럴 파일
```

## 안티패턴

### Cross-import

- **규칙**: [MUST NOT] 같은 레이어의 다른 슬라이스를 직접 import하지 않는다.
- **나쁜 예시**:
  ```tsx
  // features/order/components/OrderList.tsx
  import { useUserProfile } from '@/features/user';  // features -> features (금지!)
  ```
- **좋은 예시**:
  ```tsx
  // widgets/order-dashboard/ui/OrderDashboard.tsx — 상위 레이어에서 조합
  import { OrderList } from '@/features/order';
  import { UserFilter } from '@/features/user';
  ```

### 상향 의존

- **규칙**: [MUST NOT] 하위 레이어에서 상위 레이어를 import하지 않는다.
- **나쁜 예시**:
  ```tsx
  // entities/order/lib/formatOrder.ts
  import { useOrderStore } from '@/features/order';  // entities -> features (금지!)
  ```
- **좋은 예시**:
  ```tsx
  // entities/order/lib/formatOrder.ts — shared만 사용
  import { formatCurrency } from '@/shared/lib/format';
  ```

### Public API 우회

- **규칙**: [MUST NOT] 슬라이스 내부 파일을 `index.ts`를 거치지 않고 직접 import하지 않는다.
- **나쁜 예시**:
  ```tsx
  import { OrderList } from '@/features/order/components/OrderList';
  ```
- **좋은 예시**:
  ```tsx
  import { OrderList } from '@/features/order';
  ```

### 슬라이스 누출

- **규칙**: [MUST NOT] `index.ts`에서 내부 구현(내부 전용 컴포넌트, 내부 store, 쿼리 키 등)을 과도하게 노출하지 않는다.
- **이유**: 외부에서 사용하지 않는 항목을 export하면 내부 리팩토링 시 외부 영향 범위가 넓어진다.

### 비대한 shared/

- **규칙**: [MUST NOT] 도메인 로직을 `shared/`에 배치하지 않는다.
- **이유**: `shared/`는 도메인 무관 유틸리티만 담는다. 도메인 로직이 들어가면 여러 레이어가 `shared/`에 의존하여 거대한 공유 레이어가 된다.
- **나쁜 예시**:
  ```tsx
  // shared/lib/orderUtils.ts — 도메인 로직이 shared/에 위치 (금지!)
  export function calculateOrderDiscount(order: Order): number {
    if (order.membershipLevel === 'gold') return order.total * 0.1;
    return 0;
  }
  ```
- **좋은 예시**:
  ```tsx
  // entities/order/lib/calculateDiscount.ts — 도메인 로직은 entities/에 배치
  export function calculateOrderDiscount(order: Order): number {
    if (order.membershipLevel === 'gold') return order.total * 0.1;
    return 0;
  }
  ```

### entities에 비즈니스 로직

- **규칙**: [MUST NOT] `entities/`에 `useQuery`, `store` 의존 코드를 배치하지 않는다.
- **이유**: entities의 UI는 props만으로 동작해야 여러 features에서 재사용할 수 있다.
- **나쁜 예시**:
  ```tsx
  // entities/order/ui/OrderCard.tsx — entities에서 store 사용 (금지!)
  import { useOrderStore } from '@/features/order';

  export function OrderCard() {
    const { selectedOrder } = useOrderStore();
    // ...
  }
  ```
- **좋은 예시**:
  ```tsx
  // entities/order/ui/OrderCard.tsx — props만으로 동작
  interface OrderCardProps {
    order: Order;
    isSelected?: boolean;
    onClick?: (order: Order) => void;
  }

  export function OrderCard({ order, isSelected, onClick }: OrderCardProps) {
    // ...
  }
  ```

### 비대한 feature 슬라이스

- **규칙**: [SHOULD NOT] 하나의 feature 슬라이스가 10개 이상의 컴포넌트를 보유하면 분할을 검토한다.
- **이유**: 슬라이스가 지나치게 커지면 FSD의 이점(응집도, 독립성)이 퇴색된다.
- **나쁜 예시**:
  ```
  features/order/components/
  ├── OrderList.tsx
  ├── OrderFilter.tsx
  ├── OrderDetail.tsx
  ├── OrderForm.tsx
  ├── OrderExport.tsx
  ├── OrderImport.tsx
  ├── OrderBulkAction.tsx
  ├── OrderTimeline.tsx
  ├── OrderRefund.tsx
  ├── OrderShipping.tsx
  └── OrderTracking.tsx       # 11개 — 분할 검토 필요
  ```
- **좋은 예시**:
  ```
  features/order-management/     # 주문 조회/관리 기능
  features/order-form/           # 주문 생성/수정 기능
  features/order-fulfillment/    # 주문 처리(배송, 환불) 기능
  ```

### 순환 의존

- **규칙**: [MUST NOT] 모듈 간 순환 의존(A -> B -> A)을 만들지 않는다.
- **이유**: 순환 의존은 번들러의 모듈 해석 순서를 예측 불가능하게 만들고, 런타임에 `undefined` import가 발생할 수 있다. 순환을 발견하면 공통 로직을 하위 레이어(`entities/` 또는 `shared/`)로 추출하여 해소한다.
- **나쁜 예시**:
  ```tsx
  // features/order/hooks/useOrder.ts → entities/order/lib/validate.ts → features/order/hooks/useOrder.ts (순환!)
  ```
- **좋은 예시**:
  ```tsx
  // shared/lib/validation.ts — 공통 유효성 검사를 shared/로 추출하여 순환 해소
  // features/order  → import from '@/shared/lib/validation' (A -> C)
  // entities/order  → import from '@/shared/lib/validation' (B -> C)
  ```

### 안티패턴 요약

| 안티패턴 | 설명 | 마커 |
|---------|------|------|
| Cross-import | `features/order`에서 `features/user` 직접 import | [MUST NOT] |
| 상향 의존 | `entities/`에서 `features/` import | [MUST NOT] |
| Public API 우회 | `@/features/order/components/OrderList` 직접 import | [MUST NOT] |
| 슬라이스 누출 | 내부 구현을 `index.ts`에서 과도하게 노출 | [MUST NOT] |
| 비대한 shared/ | 도메인 로직을 `shared/`에 배치 | [MUST NOT] |
| entities에 비즈니스 로직 | entities에 useQuery, store 의존 코드 배치 | [MUST NOT] |
| 비대한 feature 슬라이스 | 하나의 feature가 10개 이상 컴포넌트 보유 | [SHOULD NOT] |
| 순환 의존 | 모듈 간 A -> B -> A 순환 | [MUST NOT] |

## 참고 자료

- [Feature-Sliced Design 공식 문서](https://feature-sliced.design/)
- [Next.js App Router 공식 문서](https://nextjs.org/docs/app)
- [Bulletproof React - 프로젝트 구조 가이드](https://github.com/alan2207/bulletproof-react)
- [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)
