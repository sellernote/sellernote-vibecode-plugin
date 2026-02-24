# 프론트엔드 아키텍처 컨벤션

> 이 문서는 프론트엔드 프로젝트의 디렉토리 구조, 컴포넌트 분류 체계, 의존성 방향을 정의합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

## 디렉토리 레이아웃

- **규칙**: [MUST] 프로젝트는 다음 디렉토리 구조를 따른다.

```
src/
├── app/                    # Next.js App Router (라우트 정의 + globals.css)
│   ├── (auth)/             # 인증 관련 라우트 그룹
│   ├── (dashboard)/        # 대시보드 라우트 그룹
│   ├── globals.css         # Tailwind CSS + CSS Variables (디자인 토큰)
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 홈 페이지
│   ├── error.tsx           # 전역 에러 경계
│   ├── not-found.tsx       # 404 페이지
│   └── api/                # Route Handlers
├── components/             # 재사용 컴포넌트
│   ├── ui/                 # 기본 UI 컴포넌트 (shadcn/ui, Storybook 대상)
│   ├── layout/             # 레이아웃 컴포넌트 (Header, Sidebar, Footer)
│   └── feature/            # 비즈니스 로직 포함 컴포넌트
├── hooks/                  # 커스텀 훅
├── store/                  # Zustand 스토어
│   └── slices/             # Slice 파일
├── queries/                # TanStack Query 훅 + 쿼리 키
├── actions/                # Server Actions
├── lib/                    # 유틸리티 (cn(), API 클라이언트 등)
├── types/                  # 공통 타입 정의
├── schemas/                # Zod 유효성 검사 스키마
└── constants/              # 상수 정의
```

- **규칙**: [MUST] `app/` 디렉토리에는 라우트 관련 파일만 배치한다. 비즈니스 로직은 `components/`, `hooks/`, `store/` 등에 배치한다.
- **이유**: `app/` 디렉토리는 Next.js App Router의 라우팅 메커니즘과 직접 연결된다. 라우트 파일(`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` 등)만 배치하여 라우팅 구조를 한눈에 파악할 수 있게 한다.
- **좋은 예시**:
  ```
  src/
  ├── app/(dashboard)/orders/
  │   ├── page.tsx              # Feature 컴포넌트 조합만
  │   └── loading.tsx
  ├── components/feature/OrderList/
  │   ├── OrderList.tsx         # 비즈니스 로직 포함
  │   └── index.ts
  └── queries/
      └── useOrdersQuery.ts
  ```
- **나쁜 예시**:
  ```
  src/app/(dashboard)/orders/
  ├── page.tsx
  ├── OrderList.tsx           # 컴포넌트가 app/에 위치
  ├── useOrdersQuery.ts       # 쿼리 훅이 app/에 위치
  └── orderStore.ts           # 스토어가 app/에 위치
  ```

## Route Groups

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
  // src/app/(auth)/layout.tsx — 로그인/회원가입 공용 레이아웃
  export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <div className="auth-container"><Logo />{children}</div>;
  }

  // src/app/(dashboard)/layout.tsx — 인증 필요 페이지 공용 레이아웃
  export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main><Header />{children}</main>
      </div>
    );
  }
  ```

## 컴포넌트 분류 체계

프론트엔드 컴포넌트는 역할과 의존성에 따라 4가지로 분류한다.

| 분류 | 위치 | 특징 | 예시 |
|------|------|------|------|
| UI 컴포넌트 | `components/ui/` | shadcn/ui 기반, props만으로 동작, 비즈니스 로직 없음, Storybook 대상 | Button, Card, Dialog, DataTable |
| Feature 컴포넌트 | `components/feature/` | 비즈니스 로직 포함, hooks/store/queries 사용 | OrderList, UserProfile, PaymentForm |
| Layout 컴포넌트 | `components/layout/` | 페이지 구조, 네비게이션 | Header, Sidebar, Footer, PageLayout |
| Page 컴포넌트 | `app/**/page.tsx` | Server Component 기본, 데이터 페칭 + Feature/UI 조합 | DashboardPage, OrderDetailPage |

### UI 컴포넌트

- **규칙**: [MUST] UI 컴포넌트는 props만으로 동작하며, 외부 상태(store, queries, context)에 직접 의존하지 않는다.
- **이유**: UI 컴포넌트가 외부 상태에 의존하면 Storybook에서 독립적으로 렌더링할 수 없고, 다른 Feature에서 재사용이 불가능해진다.
- **좋은 예시**:
  ```tsx
  // components/ui/DataTable/DataTable.tsx — props만으로 동작
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
- **나쁜 예시**:
  ```tsx
  // UI 컴포넌트가 store를 직접 사용 — 금지!
  import { useOrderStore } from '@/store/slices/orderSlice';

  export function DataTable() {
    const { orders, isLoading } = useOrderStore();
    // ...
  }
  ```

### Feature 컴포넌트

- **규칙**: [MUST] Feature 컴포넌트는 비즈니스 로직을 포함하며, hooks, store, queries를 사용하여 데이터를 관리한다. UI 컴포넌트를 조합하여 화면을 구성한다.
- **이유**: 비즈니스 로직이 Feature 컴포넌트에 집중되면, UI 컴포넌트는 표현에만, Page 컴포넌트는 조합에만 집중할 수 있어 각 계층의 책임이 명확해진다.
- **좋은 예시**:
  ```tsx
  // components/feature/OrderList/OrderList.tsx
  'use client';

  import { DataTable } from '@/components/ui/data-table';
  import { useOrdersQuery } from '@/queries/useOrdersQuery';
  import { useOrderStore } from '@/store/slices/orderSlice';

  export function OrderList() {
    const { filter, setFilter } = useOrderStore();
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

### Layout 컴포넌트

- **규칙**: [MUST] Layout 컴포넌트는 페이지의 구조와 네비게이션을 담당한다. 특정 도메인의 비즈니스 로직을 포함하지 않는다.
- **이유**: Layout 컴포넌트는 여러 페이지에서 공유되므로, 특정 도메인 로직이 들어가면 불필요한 결합이 생긴다.

### Page 컴포넌트

- **규칙**: [MUST] Page 컴포넌트(`app/**/page.tsx`)는 Server Component를 기본으로 하며, 데이터 페칭과 Feature/UI 컴포넌트 조합을 담당한다. 비즈니스 로직을 직접 작성하지 않는다.
- **이유**: Page 컴포넌트에 비즈니스 로직이 들어가면 파일이 비대해지고 테스트가 어려워진다. Page는 "어떤 컴포넌트를 어떤 데이터와 조합할 것인가"만 결정한다.
- **좋은 예시**:
  ```tsx
  // app/(dashboard)/orders/page.tsx
  import { OrderList } from '@/components/feature/OrderList';
  import { OrderFilter } from '@/components/feature/OrderFilter';
  import { PageLayout } from '@/components/layout/PageLayout';

  export default function OrdersPage() {
    return (
      <PageLayout title="주문 관리">
        <OrderFilter />
        <OrderList />
      </PageLayout>
    );
  }
  ```
- **나쁜 예시**:
  ```tsx
  // page.tsx에 비즈니스 로직이 직접 들어감 — 금지!
  'use client';

  export default function OrdersPage() {
    const { filter, setFilter } = useOrderStore();
    const { data, isLoading } = useOrdersQuery(filter);
    const handleExport = async () => { /* CSV 다운로드 로직 */ };

    return <div>{/* 수십 줄의 JSX와 비즈니스 로직이 혼재 */}</div>;
  }
  ```

## 의존성 방향

- **규칙**: [MUST] 컴포넌트 간 의존성은 단방향으로만 흐른다.

```
┌──────────────┐
│     Page     │  ← app/ 내 page.tsx (데이터 페칭 + 조합)
├──────────────┤
│   Feature    │  ← 비즈니스 로직, hooks/store/queries 사용
├──────────────┤
│      UI      │  ← props만으로 동작, 외부 의존성 없음
└──────────────┘
```

- **이유**: 단방향 의존을 유지하면 하위 계층의 변경이 상위 계층에만 영향을 주고, UI 컴포넌트를 독립적으로 개발/테스트할 수 있다. 역방향 의존이 생기면 변경 파급 범위가 예측 불가능해진다.

### UI 컴포넌트의 의존성 제한

- **규칙**: [MUST] UI 컴포넌트는 `store`, `queries`, `hooks`(비즈니스 커스텀 훅)를 직접 import하지 않는다. React 내장 훅(`useState`, `useRef` 등)과 다른 UI 컴포넌트만 사용할 수 있다.
- **이유**: UI 컴포넌트가 store나 queries에 의존하면, 해당 상태가 없는 환경(Storybook, 단위 테스트)에서 렌더링이 불가능해진다.

### 역방향 의존 금지

- **규칙**: [MUST NOT] 역방향 의존(UI -> Feature, Feature -> Page)은 금지한다.
- **이유**: 역방향 의존이 생기면 하위 계층이 상위 계층에 종속되어 재사용성이 사라진다.
- **나쁜 예시**:
  ```tsx
  // components/ui/Modal/Modal.tsx — UI가 Feature를 import (금지!)
  import { OrderDetail } from '@/components/feature/OrderDetail';

  export function Modal() {
    return (
      <div className="modal">
        <OrderDetail />  {/* UI가 Feature에 의존 */}
      </div>
    );
  }
  ```
- **좋은 예시**:
  ```tsx
  // components/ui/Modal/Modal.tsx — children으로 내용을 받는다
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

## 코드 코로케이션

- **규칙**: [SHOULD] 관련 파일(컴포넌트, 테스트, 스토리, 타입)은 같은 폴더에 배치한다.
- **이유**: 관련 파일이 한 폴더에 모여 있으면 컴포넌트의 전체 맥락을 빠르게 파악할 수 있고, 컴포넌트 삭제 시 폴더 단위로 정리할 수 있다.

```
components/ui/Button/
├── Button.tsx              # 컴포넌트 구현
├── Button.stories.tsx      # Storybook 스토리
├── Button.test.tsx         # 단위 테스트
└── index.ts                # 배럴 파일 (re-export)
```

```
components/feature/OrderList/
├── OrderList.tsx           # Feature 컴포넌트
├── OrderList.test.tsx      # 테스트
├── OrderListItem.tsx       # 하위 컴포넌트 (이 Feature 전용)
└── index.ts                # 배럴 파일
```

## Import 경로 규칙

### 절대 경로 사용

- **규칙**: [MUST] import 경로는 `@/` 접두사를 사용한 절대 경로로 작성한다.
- **이유**: 상대 경로(`../../`)는 파일 이동 시 모든 import를 수정해야 하고, 경로의 깊이가 깊어질수록 가독성이 떨어진다.
- **좋은 예시**:
  ```tsx
  import { Button } from '@/components/ui/button';
  import { useOrdersQuery } from '@/queries/useOrdersQuery';
  import { formatCurrency } from '@/lib/format';
  ```
- **나쁜 예시**:
  ```tsx
  import { Button } from '../../../components/ui/Button';
  import { useOrdersQuery } from '../../queries/useOrdersQuery';
  ```

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

### 배럴 파일 사용 범위

- **규칙**: [SHOULD] 배럴 파일(`index.ts`)은 `components/ui/`, `components/layout/` 등 공용 모듈 디렉토리에만 사용한다.
- **이유**: 배럴 파일을 과도하게 사용하면 트리 셰이킹이 방해되고, 에디터에서 파일 검색 시 수많은 `index.ts`가 나열되어 탐색 효율이 떨어진다.
- **좋은 예시**:
  ```ts
  // components/ui/Button/index.ts — 컴포넌트 폴더 단위 배럴
  export { Button } from './Button';
  export type { ButtonProps } from './Button';
  ```
- **나쁜 예시**:
  ```ts
  // components/ui/index.ts — 전체 UI를 하나의 배럴로 묶음
  export { Button } from './Button';
  export { Card } from './Card';
  export { Modal } from './Modal';
  // ... 수십 개의 re-export -> 트리 셰이킹 방해
  ```

## 안티패턴

### 순환 의존

- **규칙**: [MUST NOT] 모듈 간 순환 의존(A -> B -> A)을 만들지 않는다.
- **이유**: 순환 의존은 번들러의 모듈 해석 순서를 예측 불가능하게 만들고, 런타임에 `undefined` import가 발생할 수 있다. 순환을 발견하면 공통 로직을 별도 모듈(`lib/`)로 추출하여 해소한다.
- **나쁜 예시**:
  ```tsx
  // hooks/useAuth.ts → store/slices/userSlice.ts → hooks/useAuth.ts (순환!)
  import { useUserStore } from '@/store/slices/userSlice';  // A -> B
  import { useAuth } from '@/hooks/useAuth';                // B -> A
  ```
- **좋은 예시**:
  ```tsx
  // lib/auth.ts — 공통 모듈로 추출하여 양쪽이 의존
  export function getAuthToken(): string | null { return localStorage.getItem('token'); }
  // hooks/useAuth.ts  → import from '@/lib/auth' (A -> C)
  // store/userSlice.ts → import from '@/lib/auth' (B -> C, 순환 해소)
  ```

### 과도한 디렉토리 중첩

- **규칙**: [SHOULD NOT] 3단계 이상의 디렉토리 중첩을 만들지 않는다.
- **이유**: 디렉토리가 깊어지면 파일 경로가 길어져 탐색과 import가 불편해진다. 대부분의 컴포넌트는 2단계(카테고리/컴포넌트명)로 충분히 분류할 수 있다.
- **나쁜 예시**:
  ```
  components/feature/order/management/list/filter/OrderStatusFilter.tsx
  ```
- **좋은 예시**:
  ```
  components/feature/OrderStatusFilter/OrderStatusFilter.tsx
  ```

### Page 컴포넌트에 비즈니스 로직 직접 작성

- **규칙**: [MUST NOT] `page.tsx`에 비즈니스 로직을 직접 작성하지 않는다. Feature 컴포넌트로 위임한다.
- **이유**: `page.tsx`는 Next.js의 라우팅 시스템과 직결되는 진입점이다. 비즈니스 로직이 들어가면 라우트 구조 변경 시 로직까지 수정해야 하고, 동일 로직을 다른 페이지에서 재사용할 수 없다.

### 컴포넌트 평탄 나열

- **규칙**: [MUST NOT] `components/` 최상위에 파일을 평탄하게 나열하지 않는다. 반드시 `ui/`, `feature/`, `layout/` 하위 디렉토리로 분류한다.
- **이유**: 컴포넌트가 하나의 디렉토리에 수십 개 이상 나열되면 역할(UI/Feature)을 디렉토리 구조만으로 파악할 수 없다.
- **나쁜 예시**:
  ```
  components/
  ├── Button.tsx
  ├── OrderList.tsx
  ├── Header.tsx
  └── UserProfile.tsx
  ```
- **좋은 예시**:
  ```
  components/
  ├── ui/
  │   └── Button/
  ├── feature/
  │   ├── OrderList/
  │   └── UserProfile/
  └── layout/
      └── Header/
  ```

## 참고 자료

- [Next.js App Router 공식 문서](https://nextjs.org/docs/app)
- [Bulletproof React - 프로젝트 구조 가이드](https://github.com/alan2207/bulletproof-react)
- [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)
