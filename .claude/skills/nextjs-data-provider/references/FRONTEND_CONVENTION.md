# 프론트엔드 컨벤션

> 이 문서는 프론트엔드 전체에 적용되는 공통 규칙을 정의합니다.
> 특정 도구/카테고리에 종속적인 규칙은 하위 폴더의 문서를 참조하세요.
>
> - [아키텍처 컨벤션](architecture/ARCHITECTURE_CONVENTION.md)
> - [상태 관리 컨벤션](state/STATE_CONVENTION.md)
> - [스타일링 컨벤션](styling/STYLING_CONVENTION.md)
> - [테스트 컨벤션](testing/TESTING_CONVENTION.md)
> - [폼 컨벤션](form/FORM_CONVENTION.md)
> - [Next.js 컨벤션](nextjs/NEXTJS_CONVENTION.md)

---

## 1. 기술 스택 개요

| 영역 | 기술 | 버전 |
| --- | --- | --- |
| 프레임워크 | Next.js (App Router) | 15 |
| UI 라이브러리 | React | 19 |
| 언어 | TypeScript | 최신 안정 버전 |
| 클라이언트 상태 | Zustand | 최신 안정 버전 |
| 서버 상태 | TanStack Query | v5 |
| UI 컴포넌트 | MUI | v6 |
| 컴포넌트 문서화 | Storybook | 8 |
| 폼/유효성검사 | React Hook Form + Zod | 최신 안정 버전 |
| 테스트 | Jest + React Testing Library | 최신 안정 버전 |

---

## 2. 컴포넌트 설계 원칙

### 단일 책임 원칙

- **규칙**: [MUST] 하나의 컴포넌트는 하나의 역할만 담당한다
- **이유**: 책임이 분리된 컴포넌트는 재사용성이 높고 테스트가 용이하다. 여러 역할을 동시에 수행하는 컴포넌트는 변경 이유가 많아져 유지보수 비용이 증가한다.
- **좋은 예시**:

```typescript
// UserAvatar: 아바타 렌더링만 담당
function UserAvatar({ src, name }: UserAvatarProps) {
  return <img src={src} alt={`${name}의 프로필 이미지`} />;
}

// UserGreeting: 인사말 렌더링만 담당
function UserGreeting({ name }: UserGreetingProps) {
  return <p>{name}님, 환영합니다.</p>;
}
```

- **나쁜 예시**:

```typescript
// 데이터 페칭, 렌더링, 이벤트 처리를 모두 하나의 컴포넌트에서 수행
function UserCard() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => { fetchUser().then(setUser); }, []);
  useEffect(() => { fetchOrders().then(setOrders); }, []);

  const handleLogout = () => { /* ... */ };
  const handleOrderCancel = (id: string) => { /* ... */ };

  return (
    <div>
      <img src={user?.avatar} />
      <p>{user?.name}</p>
      <button onClick={handleLogout}>로그아웃</button>
      {orders.map((order) => (
        <div key={order.id}>
          <span>{order.name}</span>
          <button onClick={() => handleOrderCancel(order.id)}>취소</button>
        </div>
      ))}
    </div>
  );
}
```

### 합성 우선 패턴

- **규칙**: [SHOULD] children/slot 패턴으로 조합하며, render props보다 합성 패턴을 우선한다
- **이유**: 합성 패턴은 컴포넌트 간 결합도를 낮추고, 사용하는 쪽에서 유연하게 내부 구조를 결정할 수 있다. render props 대비 코드 가독성이 높다.
- **좋은 예시**:

```typescript
interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

function Card({ children, header, footer }: CardProps) {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// 사용
<Card header={<h2>제목</h2>} footer={<Button>확인</Button>}>
  <p>본문 내용</p>
</Card>
```

- **나쁜 예시**:

```typescript
// render props로 인해 가독성이 떨어지고 중첩이 깊어짐
<Card
  renderHeader={() => <h2>제목</h2>}
  renderBody={() => <p>본문 내용</p>}
  renderFooter={() => <Button>확인</Button>}
/>
```

### Props 설계

- **규칙**: [MUST] Props는 interface로 정의하고, 컴포넌트 매개변수에서 구조분해 할당한다. children은 React.ReactNode 타입을 사용한다.
- **이유**: interface를 사용하면 확장(extends)이 용이하고, 구조분해 할당은 사용하는 props를 명시적으로 드러낸다. React.ReactNode는 모든 렌더링 가능한 타입을 포괄하므로 children의 기본 타입으로 적합하다.
- **좋은 예시**:

```typescript
interface ButtonProps {
  variant: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

function Button({ variant, size = "md", disabled = false, children, onClick }: ButtonProps) {
  return (
    <button className={`btn-${variant} btn-${size}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
```

- **나쁜 예시**:

```typescript
// type alias 사용, props를 통째로 받아 내부에서 접근
type ButtonProps = {
  variant: string;
  children: JSX.Element; // React.ReactNode 대신 JSX.Element 사용
};

function Button(props: ButtonProps) {
  return <button className={props.variant}>{props.children}</button>;
}
```

---

## 3. 파일/폴더 네이밍

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 컴포넌트 파일 | PascalCase | `UserProfile.tsx` |
| 훅 파일 | camelCase (`use` 접두사) | `useAuth.ts` |
| 유틸리티 파일 | camelCase | `formatDate.ts` |
| 디렉토리 | kebab-case | `user-profile/` |
| 상수 파일 | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` |
| 타입 파일 | PascalCase + `.types.ts` | `User.types.ts` |
| 테스트 파일 | 원본 이름 + `.test.tsx` | `UserProfile.test.tsx` |
| 스토리 파일 | 원본 이름 + `.stories.tsx` | `UserProfile.stories.tsx` |

---

## 4. Import 규칙

### 절대경로 사용

- **규칙**: [MUST] 프로젝트 내부 모듈을 import할 때 `@/` 절대경로를 사용한다
- **이유**: 상대경로(`../../`)는 파일 이동 시 깨지기 쉽고 가독성이 떨어진다. 절대경로를 사용하면 모듈의 위치를 즉시 파악할 수 있다.

### Import 순서

- **규칙**: [SHOULD] import 문은 다음 순서를 따른다: 1) React/외부 라이브러리, 2) 내부 모듈 (`@/`), 3) 상대 경로 (`./`), 4) 타입 (type import)
- **이유**: 일관된 순서는 의존성의 출처를 빠르게 파악하게 해주며, 코드 리뷰 시 불필요한 논의를 줄인다.
- **좋은 예시**:

```typescript
// 1) React/외부 라이브러리
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// 2) 내부 모듈
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

// 3) 상대 경로
import { formatPrice } from "./utils";

// 4) 타입
import type { Product } from "@/types/Product.types";
```

- **나쁜 예시**:

```typescript
import type { Product } from "@/types/Product.types";
import { formatPrice } from "./utils";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
```

### 배럴 파일 사용 범위

- **규칙**: [SHOULD] 배럴 파일(`index.ts`)은 `components/ui/` 등 공용 모듈에만 사용한다
- **이유**: 배럴 파일을 남용하면 번들러가 tree-shaking을 제대로 수행하지 못해 번들 크기가 불필요하게 증가한다. 공용 모듈처럼 여러 곳에서 반복 import되는 경우에만 사용하면 편의성과 번들 효율성을 모두 확보할 수 있다.

---

## 5. 접근성 기준

### 키보드 접근성

- **규칙**: [MUST] 인터랙티브 요소(버튼, 링크, 폼 필드 등)는 키보드만으로 접근하고 조작할 수 있어야 한다
- **이유**: 마우스를 사용할 수 없는 사용자도 모든 기능에 접근할 수 있어야 하며, 이는 웹 접근성의 가장 기본적인 요구사항이다.

### 이미지 대체 텍스트

- **규칙**: [MUST] 모든 `<img>` 요소에 의미 있는 `alt` 속성을 제공한다
- **이유**: 스크린 리더 사용자는 alt 텍스트로 이미지의 내용을 파악한다. 장식용 이미지의 경우 빈 문자열(`alt=""`)을 명시적으로 설정한다.

### WCAG 준수

- **규칙**: [SHOULD] WCAG 2.1 AA 수준을 준수한다
- **이유**: AA 수준은 대부분의 사용자가 불편 없이 웹을 이용할 수 있는 기준이며, 국제적으로 널리 채택된 접근성 표준이다.

### 시맨틱 HTML 사용

- **규칙**: [MUST] 의미에 맞는 시맨틱 HTML 요소를 사용하며, `<div>`를 남용하지 않는다
- **이유**: 시맨틱 요소는 브라우저와 보조 기술에 구조 정보를 제공하여 접근성을 높인다. `<div>` 남용은 문서 구조를 모호하게 만든다.
- **좋은 예시**:

```typescript
function ProductList({ products }: ProductListProps) {
  return (
    <section aria-labelledby="product-heading">
      <h2 id="product-heading">상품 목록</h2>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <article>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- **나쁜 예시**:

```typescript
function ProductList({ products }: ProductListProps) {
  return (
    <div>
      <div className="title">상품 목록</div>
      <div>
        {products.map((product) => (
          <div key={product.id}>
            <div className="name">{product.name}</div>
            <div className="desc">{product.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 6. 성능 기준

### Core Web Vitals

- **규칙**: [SHOULD] Core Web Vitals 목표치를 준수한다 (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- **이유**: Core Web Vitals는 Google 검색 순위에 직접 영향을 미치며, 사용자 경험의 핵심 지표이다. 목표치를 초과하면 성능 개선 작업을 우선적으로 진행한다.

### 이미지 최적화

- **규칙**: [MUST] 이미지 렌더링 시 `next/image` 컴포넌트를 사용한다
- **이유**: `next/image`는 자동으로 이미지를 최적화(WebP 변환, lazy loading, 반응형 크기 조절)하여 LCP를 개선한다. 일반 `<img>` 태그는 이러한 최적화를 직접 구현해야 한다.

### 코드 분할

- **규칙**: [SHOULD] 무거운 컴포넌트는 `dynamic import`를 사용하여 코드 분할한다
- **이유**: 초기 번들 크기를 줄여 첫 페이지 로딩 속도를 개선한다. 특히 모달, 차트, 에디터 등 즉시 필요하지 않은 컴포넌트에 적용한다.
- **좋은 예시**:

```typescript
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("@/components/HeavyChart"), {
  loading: () => <Skeleton variant="rectangular" height={400} />,
  ssr: false,
});

function Dashboard() {
  return (
    <main>
      <h1>대시보드</h1>
      <HeavyChart />
    </main>
  );
}
```

### 번들 크기 모니터링

- **규칙**: [SHOULD] `@next/bundle-analyzer`를 사용하여 번들 크기를 정기적으로 모니터링한다
- **이유**: 의도치 않은 번들 크기 증가를 조기에 발견하여 성능 저하를 방지한다.

---

## 7. 안티패턴

### Prop Drilling

- **규칙**: [MUST NOT] 3단계 이상 props를 전달하지 않는다. Zustand store 또는 Context를 사용한다.
- **이유**: 깊은 prop drilling은 중간 컴포넌트가 자신과 무관한 props를 전달해야 하므로 결합도가 높아지고, 리팩토링 시 변경 범위가 넓어진다.
- **나쁜 예시**:

```typescript
// Page -> Layout -> Sidebar -> UserMenu -> UserAvatar 순으로 전달
function Page() {
  const user = useUser();
  return <Layout user={user} />;
}

function Layout({ user }: { user: User }) {
  return <Sidebar user={user} />;
}

function Sidebar({ user }: { user: User }) {
  return <UserMenu user={user} />;
}

function UserMenu({ user }: { user: User }) {
  return <UserAvatar src={user.avatar} />;
}
```

- **좋은 예시**:

```typescript
// Zustand store로 전역 상태 관리
import { useUserStore } from "@/stores/useUserStore";

function UserAvatar() {
  const avatar = useUserStore((state) => state.user.avatar);
  return <img src={avatar} alt="프로필 이미지" />;
}

function Sidebar() {
  return (
    <nav>
      <UserAvatar />
    </nav>
  );
}
```

### God Component

- **규칙**: [MUST NOT] 300줄 이상의 컴포넌트를 작성하지 않는다. 역할별로 분리한다.
- **이유**: 거대한 컴포넌트는 이해하기 어렵고, 테스트와 재사용이 사실상 불가능하다. 300줄은 한 화면에서 전체 흐름을 파악할 수 있는 실질적인 상한선이다.
- **나쁜 예시**:

```typescript
// 하나의 파일에 페칭, 폼 처리, 테이블, 모달, 페이지네이션 등이 모두 포함된 컴포넌트
function OrderManagement() {
  // ... 50줄의 상태 선언
  // ... 80줄의 이벤트 핸들러
  // ... 200줄의 JSX
  // 총 300줄 이상
}
```

### useEffect 내 데이터 페칭

- **규칙**: [MUST NOT] `useEffect` 내에서 직접 데이터를 페칭하지 않는다. TanStack Query를 사용한다.
- **이유**: `useEffect` 기반 페칭은 로딩 상태, 에러 처리, 캐싱, 재시도, 중복 요청 방지 등을 직접 구현해야 하며, race condition이 발생하기 쉽다. TanStack Query는 이 모든 것을 선언적으로 처리한다.
- **나쁜 예시**:

```typescript
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

- **좋은 예시**:

```typescript
function UserList() {
  const { data: users, isPending } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((res) => res.json()),
  });

  if (isPending) return <Spinner />;
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

### 인라인 함수로 인한 무한 리렌더링

- **규칙**: [MUST NOT] 인라인 함수를 의존성 배열에 포함하여 무한 리렌더링을 유발하지 않는다
- **이유**: 인라인 함수는 매 렌더링마다 새로운 참조를 생성하므로, 의존성 배열에 포함되면 effect가 무한히 실행된다.
- **나쁜 예시**:

```typescript
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState([]);

  // 매 렌더링마다 fetchResults의 참조가 바뀌어 useEffect가 무한 실행됨
  const fetchResults = () => fetch(`/api/search?q=${query}`);

  useEffect(() => {
    fetchResults().then((res) => res.json()).then(setResults);
  }, [fetchResults]);

  return <div>{/* ... */}</div>;
}
```

- **좋은 예시**:

```typescript
function SearchResults({ query }: { query: string }) {
  // TanStack Query로 선언적 데이터 페칭
  const { data: results } = useQuery({
    queryKey: ["search", query],
    queryFn: () => fetch(`/api/search?q=${query}`).then((res) => res.json()),
  });

  return <div>{/* ... */}</div>;
}
```

---

## 8. 참고 자료

- [React 공식 문서](https://react.dev)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/)
