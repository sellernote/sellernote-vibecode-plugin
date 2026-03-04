# React Convention

> This document defines rules that apply to React 19 projects.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Technology Stack

| Item | Version/Configuration |
| --- | --- |
| React | 19.2+ |
| TypeScript | 5.x |
| React Compiler | v1.0 — must be enabled |
| Error Boundary | react-error-boundary |
| Virtualization | @tanstack/react-virtual (when needed) |

> **React 19 Syntax Changes**: The code examples in this document are written based on React 19.
> - Context: In React 19, the `<MyContext value={...}>` syntax can be used. `<MyContext.Provider>` is the legacy syntax from before React 19.
> - ref: In React 19, `ref` can be passed as a regular prop. `forwardRef` still works but is scheduled to be deprecated in a future release.
> - In earlier versions (React 18 and below), this syntax does not work.

---

## 2. Component Patterns

### Compound Components

- **Rule**: [SHOULD] Logically related component groups should be expressed using the Compound Component pattern.
- **Good Example**:

```typescript
import { createContext, useContext } from "react";

interface SelectContextValue {
  value: string;
  onChange: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select.Option은 Select 내부에서만 사용할 수 있다.");
  return ctx;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value, onChange, children }: SelectProps) {
  return (
    <SelectContext value={{ value, onChange }}>
      <div role="listbox">{children}</div>
    </SelectContext>
  );
}

interface OptionProps {
  value: string;
  children: React.ReactNode;
}

function Option({ value, children }: OptionProps) {
  const { value: selectedValue, onChange } = useSelectContext();
  return (
    <div
      role="option"
      aria-selected={selectedValue === value}
      onClick={() => onChange(value)}
    >
      {children}
    </div>
  );
}

Select.Option = Option;
export { Select };

// 사용
<Select value={selected} onChange={setSelected}>
  <Select.Option value="kr">한국</Select.Option>
  <Select.Option value="us">미국</Select.Option>
</Select>
```

### Controlled vs Uncontrolled Components

- **Rule**: [MUST] Input components within forms must be written as controlled components. However, one-off internal UI elements that do not need external value management may remain uncontrolled.
- **Good Example**:

```typescript
interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
}

function EmailInput({ value, onChange }: EmailInputProps) {
  return (
    <input
      type="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function SignupForm() {
  const [email, setEmail] = useState("");
  return <EmailInput value={email} onChange={setEmail} />;
}
```

### Conditional Rendering

- **Rule**: [MUST] When using conditional rendering, do not use numeric values (number) directly on the left side of the `&&` operator. Use ternary operators or early return patterns for complex conditions.
- **Good Example**:

```typescript
// 1. boolean 변환 후 && 연산자 사용
function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div>
      {orders.length > 0 && <p>총 {orders.length}건의 주문이 있다.</p>}
    </div>
  );
}

// 2. 상태에 따른 early return
function UserProfile({ user }: { user: User | null }) {
  if (!user) return <p>로그인이 필요하다.</p>;
  if (user.isSuspended) return <p>정지된 계정이다.</p>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// 3. 삼항 연산자 - 두 가지 중 하나를 렌더링할 때
function StatusBadge({ isActive }: { isActive: boolean }) {
  return <span>{isActive ? "활성" : "비활성"}</span>;
}
```

### List Rendering and key

- **Rule**: [MUST NOT] Do not use array index (`index`) as `key` when rendering lists. Use a unique data identifier (ID) as the `key`.
- **Good Example**:

```typescript
function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
```

- **Bad Example**:

```typescript
function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {/* 인덱스를 key로 사용 - 항목 재정렬/삭제 시 버그 발생 */}
      {products.map((product, index) => (
        <li key={index}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
```

### children and Advanced Composition Patterns

- **Rule**: [SHOULD] Layout or wrapper components should use the composition pattern via `children` prop. Render Props should only be used when JSX rendering control is needed that cannot be replaced by hooks.
- **Good Example**:

```typescript
// Polymorphic component - as prop으로 렌더링할 HTML 요소를 외부에서 결정
type TextProps<T extends React.ElementType = "p"> = {
  as?: T;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<T>;

function Text<T extends React.ElementType = "p">({
  as,
  children,
  ...rest
}: TextProps<T>) {
  const Component = as ?? "p";
  return <Component {...rest}>{children}</Component>;
}

<Text as="h2" className="heading">제목</Text>
<Text>본문 텍스트</Text>
```

---

## 3. Hooks Rules

### Basic Rules

- **Rule**: [MUST] Hooks must only be called at the top level of component functions or Custom Hooks. Do not call them inside conditionals, loops, or nested functions.
- **Good Example**:

```typescript
function UserProfile({ userId }: { userId: string }) {
  // 항상 호출 - 조건은 Hook 내부 또는 반환값으로 처리
  const { data: user, isLoading } = useUserQuery(userId);
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) return <Spinner />;
  if (!user) return null;

  return <div>{user.name}</div>;
}
```

### useState Patterns

- **Rule**: [MUST] Use functional updates when the update depends on the previous state. Update object state immutably using spread.
- **Good Example**:

```typescript
function Counter() {
  const [count, setCount] = useState(0);
  const increment = () => setCount((prev) => prev + 1);
  const decrement = () => setCount((prev) => prev - 1);

  return (
    <div>
      <button onClick={decrement}>-</button>
      <span>{count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}

// 객체 상태 - 스프레드로 불변 업데이트
interface FormState { name: string; email: string; phone: string; }

function ProfileForm() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "" });

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return <div />;
}
```

### useEffect Rules

- **Rule**: [MUST] Include all reactive values referenced inside the Effect in the `useEffect` dependency array without omission. The ESLint `exhaustive-deps` rule must be enabled.
- **Rule**: [MUST] `useEffect` should only be used for synchronization with external systems (DOM manipulation, subscriptions, timers). Do not use it for event handling or derived state computation.
- **Rule**: [MUST] Effects that require cleanup (subscriptions, timers, connections) must return a cleanup function.
- **Good Example**:

```typescript
// 외부 시스템 동기화 - 올바른 useEffect 사용
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createChatConnection(roomId);
    connection.connect();
    return () => connection.disconnect(); // cleanup
  }, [roomId]);

  return <div>채팅방: {roomId}</div>;
}

// 파생 상태 - Effect 대신 렌더링 중 계산
function ProductList({ products }: { products: Product[] }) {
  const activeProducts = products.filter((p) => p.isActive);
  return (
    <ul>
      {activeProducts.map((p) => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

### useRef Usage Patterns

- **Rule**: [MUST] When writing new components, receive `ref` directly as a prop instead of using `forwardRef`. Gradually migrate existing `forwardRef` code. (See Section 4 "Passing ref Directly as a Prop" for detailed patterns)
- **Rule**: [SHOULD] Values that do not affect rendering results (timer IDs, previous value tracking, flags) should be stored with `useRef` instead of `useState`.
- **Good Example**:

```typescript
// React 19 - ref prop 직접 수신
interface TextInputProps {
  placeholder?: string;
  ref?: React.Ref<HTMLInputElement>;
}

function TextInput({ placeholder, ref }: TextInputProps) {
  return <input placeholder={placeholder} ref={ref} />;
}

// 렌더링 무관 값 저장 - 타이머 ID
function DebouncedSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(e.target.value), 300);
  };

  return <input onChange={handleChange} />;
}
```

### useMemo / useCallback

- **Rule**: [SHOULD NOT] Do not use `useMemo`, `useCallback`, or `React.memo` by default in new code. Rely on the Compiler's automatic optimization by default.
- **Rule**: [MAY] Use them only in limited cases where measured performance issues exist or third-party compatibility issues arise.
> **Note**: Manual memo and `"use no memo"` are separate concepts. `"use no memo"` is not a tool for using manual memo — it is an **escape hatch that disables compiler optimization for that specific function**. See the `"use no memo"` section below for details.
- **Good Example**:

```typescript
// React Compiler 활성화 시 - 수동 메모이제이션 불필요
function ProductList({ products, filter }: { products: Product[]; filter: string }) {
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  function handleSelect(id: string) {
    console.log("선택:", id);
  }

  return (
    <ul>
      {filteredProducts.map((p) => (
        <ProductItem key={p.id} product={p} onSelect={handleSelect} />
      ))}
    </ul>
  );
}
```

### Custom Hooks Design

- **Rule**: [MUST] Custom Hook names must start with `use`. Hooks should handle a single concern only, and return values should be objects when destructuring is natural, or arrays (tuples) for simple value/function pairs.
- **Good Example**:

```typescript
// 튜플 반환 - useState와 동일한 패턴
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = (newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = newValue instanceof Function ? newValue(prev) : newValue;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  return [value, setStoredValue] as const;
}

// 객체 반환 - 반환값이 많고 명칭이 중요한 경우
function useProductSearch() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useProductSearchQuery({ query });

  return {
    query,
    results: data ?? [],
    isLoading,
    handleQueryChange: setQuery,
  };
}
```

---

## 4. React 19 Features

### use() Hook

- **Rule**: [SHOULD] Use the `use()` hook to read Promise or Context values, and components consuming Promises must be placed inside a `<Suspense>` boundary.

> **Note**: The pattern of consuming Promises with `use()` works by receiving a Promise created in a parent component via props. For most data fetching, use TanStack Query (`useQuery`, `useSuspenseQuery`), and use `use()` for reading already-created Promises or conditionally reading Context.

- **Good Example**:

```typescript
// PostPage.tsx - 부모에서 Promise를 생성하여 전달
import { Suspense } from 'react';

// fetchComments는 캐싱된 Promise를 반환하는 유틸 (예: React cache 또는 외부 캐시)
export default function PostPage({ postId }: { postId: string }) {
  const commentsPromise = fetchComments(postId);

  return (
    <article>
      <PostContent postId={postId} />
      <Suspense fallback={<p>댓글을 불러오는 중...</p>}>
        <CommentsPanel commentsPromise={commentsPromise} />
      </Suspense>
    </article>
  );
}

// CommentsPanel.tsx - use()로 Promise 소비
import { use } from 'react';

export function CommentsPanel({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise);

  return (
    <ul>
      {comments.map((comment) => (
        <li key={comment.id}>{comment.text}</li>
      ))}
    </ul>
  );
}

// Context를 조건부로 읽는 패턴
import { use } from 'react';

function ThemeText({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext);
    return <p>현재 테마: {theme}</p>;
  }
  return <p>테마 숨김</p>;
}
```

### React Compiler (v1.0 Stable)

- **Rule**: [MUST] Enable React Compiler from the start in new projects.
- **Rule**: [SHOULD NOT] Do not use manual memo by default in new code. Use it only as an exception when necessary. (See the `useMemo / useCallback` section above for detailed criteria)

> **v1.0 Major Changes**:
> - `eslint-plugin-react-compiler` has been integrated into `eslint-plugin-react-hooks`. In Flat Config, applying the `react-hooks/recommended` or `recommended-latest` preset enables Compiler-related lint rules.
> - In projects with Compiler enabled, do not use manual memo by default. Use it only as an exception when necessary.

#### Compiler + ESLint Operational Rules

- **Rule**: [MUST] Use the latest version of `eslint-plugin-react-hooks` and apply the `react-hooks/recommended` or `recommended-latest` preset based on Flat Config.
- **Rule**: [MUST] Enforce `rules-of-hooks`, `immutability`, `purity`, `refs`, `set-state-in-render` rules as `error` in CI.
- **Rule**: [MUST] Treat React Compiler solely as a performance optimization tool. Write code so that logic correctness is maintained even if the compiler is turned off.

- **Good Example**:

```typescript
// React Compiler 활성화 시 - 수동 메모이제이션 불필요
function ProductList({ products, filter }: ProductListProps) {
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  function handleSelect(id: string) {
    console.log("선택:", id);
  }

  return (
    <ul>
      {filteredProducts.map((p) => (
        <ProductItem key={p.id} product={p} onSelect={handleSelect} />
      ))}
    </ul>
  );
}
```

### "use no memo" Directive

- **Rule**: [MAY] When React Compiler is incompatible with a specific component/Hook and causes behavioral issues, declare `"use no memo"` at the top of that function to **exclude only that function from compiler optimization**.
- **Rule**: [SHOULD] `"use no memo"` is **not a means to use manual memo**, but should only be used as an **emergency workaround** when the compiler's transformations cause problems. Leave a comment explaining the cause and removal conditions when using it.
- **Good Example**:

```typescript
// 서드파티 라이브러리와의 호환성 문제가 확인된 경우에만 사용
"use no memo";

import { ThirdPartyChart } from "third-party-chart-lib";

function RevenueChart({ data }: { data: ChartData[] }) {
  // 이 컴포넌트는 Compiler 자동 메모이제이션에서 제외된다
  const chartConfig = {
    type: "line",
    animation: true,
    data,
  };

  return <ThirdPartyChart config={chartConfig} />;
}
```

### Actions (useActionState, useFormStatus)

- **Rule**: [SHOULD] Manage form submission logic state with `useActionState`, and handle the submit button's pending state in a separate child component using `useFormStatus`.

> **Note**: Use TanStack Query's `useMutation` for server data mutations. `useActionState` is used for client form state management (validation, error/success feedback, etc.).

- **Additional Rules**:
  - `dispatchAction` (or `formAction`) should only be called via the `<form action={...}>` path or inside `startTransition()`.
  - `useActionState` action receives the **previous state** as its first argument.

- **Good Example**:

```typescript
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FormState {
  error: string | null;
  success: boolean;
}

// 제출 버튼은 별도 컴포넌트로 분리
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? '저장 중...' : '저장'}
    </button>
  );
}

export function UserNameForm() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (name: string) => updateUserNameApi(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });

  async function formAction(
    prevState: FormState,
    formData: FormData
  ): Promise<FormState> {
    const name = formData.get('name') as string;
    if (!name || name.length < 2) {
      return { error: '이름은 2자 이상이어야 한다.', success: false };
    }
    try {
      await mutation.mutateAsync(name);
      return { error: null, success: true };
    } catch {
      return { error: '이름 변경에 실패했다.', success: false };
    }
  }

  const [state, action, isPending] = useActionState(formAction, {
    error: null,
    success: false,
  });

  return (
    <form action={action}>
      <input type="text" name="name" placeholder="새 이름 입력" />
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p>이름이 업데이트되었다.</p>}
      <SubmitButton />
    </form>
  );
}
```

### useOptimistic

- **Rule**: [MAY] Use `useOptimistic` when immediate UI feedback is needed without waiting for a server response, and always update optimistic state inside a Transition or Action.
- **Good Example**:

```typescript
import { useState, useOptimistic, useTransition } from 'react';

export function LikeButton({ postId, initialIsLiked }: { postId: string; initialIsLiked: boolean }) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [optimisticIsLiked, addOptimistic] = useOptimistic(
    isLiked,
    (_current: boolean, newValue: boolean) => newValue
  );
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      addOptimistic(!isLiked);
      const result = await toggleLikePost(postId);
      setIsLiked(result.isLiked);
    });
  }

  return (
    <button onClick={handleClick} aria-pressed={optimisticIsLiked} disabled={isPending}>
      {optimisticIsLiked ? '좋아요 취소' : '좋아요'}
    </button>
  );
}
```

### useEffectEvent (stable, React 19.2+)

- **Rule**: [SHOULD] Wrap callbacks used inside Effects but that should not be included in the dependency array (logging, analytics events, etc.) with `useEffectEvent`.
- **Additional Rules**:
  - Functions created with `useEffectEvent` should only be called inside Effects.
  - Do not pass Effect Event functions as props or use them as external utility functions.
  - Do not include the Effect Event itself in the dependency array.
- **Good Example**:

```typescript
import { useEffect, useEffectEvent } from 'react';

function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  // theme은 Effect의 의존성이 아니지만, 최신 값이 필요한 콜백
  const onConnected = useEffectEvent((connectedRoomId: string) => {
    showNotification(`${connectedRoomId}에 연결됨`, theme); // 항상 최신 theme
  });

  useEffect(() => {
    const connection = createChatConnection(roomId);
    connection.on('connected', () => onConnected(roomId));
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // theme이 의존성에서 제외됨

  return <div>채팅방: {roomId}</div>;
}
```

### Activity (stable, React 19.2+)

- **Rule**: [MAY] For UI that is hidden from the screen but needs to preserve its state (tab switching, back navigation cache, etc.), the `<Activity>` component can be used. It works via `display: none` + state preservation.
- **Good Example**:

```typescript
import { Activity, useState } from 'react';

type Tab = 'overview' | 'orders' | 'settings';

function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('overview')}>개요</button>
        <button onClick={() => setActiveTab('orders')}>주문</button>
        <button onClick={() => setActiveTab('settings')}>설정</button>
      </nav>

      {/* 각 탭의 상태가 보존됨 - 스크롤 위치, 입력값 등 유지 */}
      <Activity mode={activeTab === 'overview' ? 'visible' : 'hidden'}>
        <OverviewPanel />
      </Activity>
      <Activity mode={activeTab === 'orders' ? 'visible' : 'hidden'}>
        <OrdersPanel />
      </Activity>
      <Activity mode={activeTab === 'settings' ? 'visible' : 'hidden'}>
        <SettingsPanel />
      </Activity>
    </div>
  );
}
```

### Passing ref Directly as a Prop

- **Rule**: [MUST] In React 19, when passing ref to a function component, pass it directly as a regular prop without using `forwardRef`.
- **Good Example**:

```typescript
import { type Ref } from 'react';

interface TextInputProps {
  label: string;
  placeholder?: string;
  ref?: Ref<HTMLInputElement>;
}

function TextInput({ label, placeholder, ref }: TextInputProps) {
  return (
    <label>
      {label}
      <input ref={ref} placeholder={placeholder} />
    </label>
  );
}
```

### Metadata Support

- **Rule**: [SHOULD] React 19 automatically hoists `<title>` and `<meta>` tags rendered inside components to `<head>`. If the router framework provides a route-level metadata API, prefer using that API, and use React's built-in support for component-level dynamic metadata.
- **Good Example**:

```typescript
export default function BlogPostPage({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title} | Sellernote 블로그</title>
      <meta name="description" content={post.description} />
      <h1>{post.title}</h1>
      <p>작성자: {post.author}</p>
    </article>
  );
}
```

### Root Error Callbacks (`createRoot` Options)

- **Rule**: [SHOULD] Projects that require global error collection (Sentry, etc.) should use the `onUncaughtError`, `onCaughtError`, and `onRecoverableError` callbacks of `createRoot`/`hydrateRoot`.
- **Good Example**:

```typescript
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, errorInfo) => {
    reportError(error, { kind: 'uncaught', componentStack: errorInfo.componentStack });
  },
  onCaughtError: (error, errorInfo) => {
    reportError(error, { kind: 'caught', componentStack: errorInfo.componentStack });
  },
  onRecoverableError: (error, errorInfo) => {
    reportError(error, { kind: 'recoverable', componentStack: errorInfo.componentStack });
  },
});

root.render(<App />);
```

---

## 5. Event Handling

### Handler Naming

- **Rule**: [MUST] Event callbacks exposed via props should use `onXxx` format, and internal handler functions within the component should use `handleXxx` format.
- **Good Example**:

```typescript
// Props - onXxx 형식
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  onWishlistToggle: (productId: string) => void;
}

function ProductCard({ product, onAddToCart, onWishlistToggle }: ProductCardProps) {
  // 내부 핸들러 - handleXxx 형식
  const handleAddToCartClick = () => onAddToCart(product.id);
  const handleWishlistClick = () => onWishlistToggle(product.id);

  return (
    <div>
      <p>{product.name}</p>
      <button onClick={handleAddToCartClick}>장바구니 담기</button>
      <button onClick={handleWishlistClick}>위시리스트</button>
    </div>
  );
}
```

### Event Types

- **Rule**: [MUST] When extracting event handlers into separate functions, specify the correct React event types. Do not use `any` or DOM native `Event` types.
- **Good Example**:

```typescript
function SearchForm() {
  const [query, setQuery] = useState("");

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchProducts({ query });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={query} onChange={handleQueryChange} />
      <button type="submit">검색</button>
    </form>
  );
}
```

### Synthetic Event Considerations

- **Rule**: [SHOULD] Use `stopPropagation()` only when event bubbling actually causes problems. Use `preventDefault()` only when there is a clear reason to prevent the browser's default behavior.
- **Good Example**:

```typescript
// stopPropagation - 카드 내 버튼 클릭이 카드 전체 클릭으로 버블링되는 것 방지
function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // 명확한 이유 있음
    deleteProduct(product.id);
  };

  return (
    <div onClick={onClick}>
      <p>{product.name}</p>
      <button onClick={handleDeleteClick}>삭제</button>
    </div>
  );
}
```

---

## 6. Performance Optimization

### Understanding and Preventing Re-renders

- **Rule**: [MUST] Define constant objects/arrays outside the render function to prevent new references from being created on every render.
- **Good Example**:

```typescript
const DEFAULT_SORT_OPTIONS = { field: 'name', direction: 'asc' } as const;

function ProductTable({ products }: { products: Product[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <ProductHeader sortOptions={DEFAULT_SORT_OPTIONS} />
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <ProductList products={products} query={searchQuery} />
    </div>
  );
}
```

### State Colocation

- **Rule**: [MUST] Place state as close as possible to the components that actually use it. Do not unnecessarily lift it up to parent components.
- **Good Example**:

```typescript
function ProductPage() {
  return (
    <div>
      <SearchPanel />   {/* 검색 상태는 이 컴포넌트 내부에서만 관리 */}
      <ProductGrid />   {/* 검색 상태 변경 시 리렌더링되지 않음 */}
    </div>
  );
}

function SearchPanel() {
  const [query, setQuery] = useState('');
  return (
    <aside>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <SearchResults query={query} />
    </aside>
  );
}
```

### Lazy Initialization

- **Rule**: [MUST] When the initial value of `useState` is the result of an expensive computation (localStorage access, parsing, etc.), pass a function reference, not a function call.
- **Good Example**:

```typescript
function getInitialCart(): CartItem[] {
  const stored = localStorage.getItem('cart');
  return stored ? JSON.parse(stored) : [];
}

function ShoppingCart() {
  // 함수 참조 전달 - 초기 마운트 시에만 호출
  const [cartItems, setCartItems] = useState<CartItem[]>(getInitialCart);
  return <CartView items={cartItems} />;
}
```

### Large List Optimization

- **Rule**: [SHOULD] Apply a virtualization library for lists rendering hundreds or more items.
- **Good Example**:

```typescript
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualOrderList({ orders }: { orders: Order[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  return (
    <div ref={containerRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{ position: 'absolute', top: `${virtualItem.start}px`, width: '100%' }}
          >
            <OrderRow order={orders[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 7. Error Boundary

### Error Boundary Implementation

- **Rule**: [SHOULD] Use the `react-error-boundary` library. If custom implementation is needed, implement both `getDerivedStateFromError` and `componentDidCatch`.
- **Good Example**:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <h2>문제가 발생했다</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
}

export function ProductSection({ productId }: { productId: string }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => reportError(error, info.componentStack)}
    >
      <ProductDetail productId={productId} />
    </ErrorBoundary>
  );
}
```

- **Example**:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col gap-4 p-6">
      <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        <p className="font-semibold">문제가 발생했다</p>
        <p>{error.message}</p>
      </div>
      <button
        className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        onClick={resetErrorBoundary}
      >
        다시 시도
      </button>
    </div>
  );
}
```

### Recovery Strategy (Reset Pattern)

- **Rule**: [MUST] All Error Boundary fallback UIs must provide a recovery mechanism. Use the `resetKeys` prop to automatically retry when dependent data changes.
- **Good Example**:

```typescript
export function OrderDetailPage({ orderId }: { orderId: string }) {
  return (
    <ErrorBoundary
      FallbackComponent={OrderDetailFallback}
      resetKeys={[orderId]} // orderId 변경 시 에러 상태 자동 초기화
      onError={(error) => reportError(error)}
    >
      <OrderDetail orderId={orderId} />
    </ErrorBoundary>
  );
}
```

### Error Boundary Placement Strategy

- **Rule**: [MUST] Place at least one global boundary at the root, and add additional boundaries for each UI section that can fail independently.
- **Good Example**:

```typescript
// 대시보드 - 섹션별 경계로 장애 격리
export default function DashboardPage() {
  return (
    <div className="dashboard">
      <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
        <RevenueChart />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
        <OrderStatusPanel />
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
        <InventoryAlerts />
      </ErrorBoundary>
    </div>
  );
}
```

---

## 8. Suspense Strategy

### useSuspenseQuery and Suspense Boundaries

- **Rule**: [SHOULD] Use `useSuspenseQuery` as the default for data fetching, and handle loading/error states declaratively with `Suspense` + `ErrorBoundary`.
- **Good Example**:
  ```tsx
  // 경계 컴포넌트 — Page 또는 Feature wrapper에서 설정
  import { Suspense } from 'react';
  import { ErrorBoundary } from 'react-error-boundary';

  export default function OrdersPage() {
    return (
      <PageLayout title="주문 관리">
        <ErrorBoundary FallbackComponent={OrdersErrorFallback}>
          <Suspense fallback={<OrderListSkeleton />}>
            <OrderList />
          </Suspense>
        </ErrorBoundary>
      </PageLayout>
    );
  }

  // Feature 컴포넌트 — 로딩/에러 분기 없이 데이터만 소비
  import { useSuspenseQuery } from '@tanstack/react-query';

  function OrderList() {
    const filters = { /* ... */ };
    const { data } = useSuspenseQuery(orderKeys.list(filters));
    // data는 항상 T 타입 (undefined 불가)
    return <DataTable columns={ORDER_COLUMNS} data={data} />;
  }
  ```
### When to Use useQuery

- **Rule**: [MAY] `useQuery` can be used instead of `useSuspenseQuery` in the following situations.

| Situation | Reason |
|-----------|--------|
| When conditional fetching is needed (`enabled` option) | `useSuspenseQuery` does not support `enabled` |
| When partial loading is needed (displaying some data first) | `useSuspenseQuery` suspends the entire component until data is ready |
| When the design does not yet have skeleton/fallback components | Suspense boundaries require fallback UI |

- **Good Example**:
  ```typescript
  // 조건부 페칭 — enabled가 필요하므로 useQuery 사용
  function UserOrders({ userId }: { userId?: string }) {
    const { data, isLoading } = useQuery({
      ...orderKeys.list({ userId }),
      enabled: !!userId, // userId가 없으면 호출하지 않음
    });

    if (!userId) return <SelectUserPrompt />;
    if (isLoading) return <Skeleton />;
    return <OrderList orders={data} />;
  }
  ```

### Suspense Boundary Placement Principles

- **Rule**: [SHOULD] Place Suspense boundaries per independently-loading UI unit. Do not wrap the entire page in a single Suspense.
- **Good Example**:
  ```tsx
  // 섹션별 독립 Suspense 경계 — 각 섹션이 독립적으로 로딩
  export default function DashboardPage() {
    return (
      <PageLayout title="대시보드">
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStats />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<TableSkeleton />}>
          <RecentOrders />
        </Suspense>
      </PageLayout>
    );
  }
  ```
> **Note**: The specific placement of Suspense boundaries and skeleton designs should be determined in consultation with the design team. For sections where skeleton components are not yet available, use `useQuery`, and switch to `useSuspenseQuery` when skeletons are ready.

---

## 9. Context API

### Context vs Zustand Selection Criteria

- **Rule**: [MUST] Use Zustand for **pure UI state** shared across multiple pages. Use Context API for infrequently changing configuration values (theme/locale) or internal state sharing within Compound Components. Use TanStack Query, nuqs, and React Hook Form for server data, URL state, and form state respectively. (See STATE_CONVENTION.md for details)

| Criterion | Context API | Zustand |
|-----------|-------------|---------|
| Change Frequency | Low (theme, locale) | High (cart, notifications) |
| Scope | Within a specific tree | App-wide |
| Selective Subscription | Not possible | Possible (selector) |
| Suitable Cases | Theme, language, Compound Component | Global UI state (sidebar, toast, etc.) |

### Provider Pattern

- **Rule**: [MUST] Separate Context Provider into a dedicated component. Since React Compiler automatically handles Provider value stabilization, manual `useMemo`/`useCallback` is unnecessary.
- **Good Example**:

```typescript
interface AuthContextValue {
  currentUser: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 내부에서 사용해야 한다.");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const user = await authApi.login(credentials);
    setCurrentUser(user);
  };

  const logout = () => setCurrentUser(null);

  // React Compiler가 자동으로 value 객체를 메모이제이션한다
  return <AuthContext value={{ currentUser, login, logout }}>{children}</AuthContext>;
}
```

### Context Separation Principle

- **Rule**: [MUST] Instead of one monolithic Context, separate Contexts by change frequency and concern.
- **Good Example**:

```typescript
// 관심사별로 분리된 Context
function App() {
  return (
    <ThemeProvider>      {/* 변경 빈도 낮음 */}
      <LocaleProvider>   {/* 변경 빈도 낮음 */}
        <AuthProvider>   {/* 로그인/로그아웃 시 변경 */}
          <Layout />
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

// 테마만 사용하는 컴포넌트 - AuthContext 변경 시 리렌더링되지 않음
function Header() {
  const theme = useTheme();
  return <header data-theme={theme}>헤더</header>;
}
```

---

## 10. TypeScript Integration

### Extending HTML Attributes in Component Props

- **Rule**: [MUST] Components wrapping native HTML elements should extend HTML attributes using `ComponentPropsWithoutRef` (or `ComponentPropsWithRef` when forwarding ref).
- **Good Example**:

```typescript
import { type ComponentPropsWithoutRef, type ComponentPropsWithRef } from "react";

// ref 불필요
interface ChipProps extends ComponentPropsWithoutRef<"span"> {
  variant: "filled" | "outlined";
  onRemove?: () => void;
}

function Chip({ variant, onRemove, children, ...rest }: ChipProps) {
  return (
    <span className={`chip-${variant}`} {...rest}>
      {children}
      {onRemove && <button onClick={onRemove}>x</button>}
    </span>
  );
}

// ref 필요 (React 19)
interface TextInputProps extends ComponentPropsWithRef<"input"> {
  label: string;
  error?: string;
}

function TextInput({ label, error, ref, ...rest }: TextInputProps) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...rest} />
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Typing Props Variants with Discriminated Unions

- **Rule**: [SHOULD] When a component has multiple variants with different allowed props per variant, use discriminated unions.
- **Good Example**:

```typescript
interface SolidButtonProps {
  variant: "solid";
  colorScheme: "primary" | "danger";
  disabled?: boolean;
  children: React.ReactNode;
}

interface LinkButtonProps {
  variant: "link";
  href: string;
  external?: boolean;
  children: React.ReactNode;
}

type ButtonProps = SolidButtonProps | LinkButtonProps;

function Button(props: ButtonProps) {
  if (props.variant === "link") {
    return <a href={props.href} target={props.external ? "_blank" : undefined}>{props.children}</a>;
  }
  return <button className={props.colorScheme} disabled={props.disabled}>{props.children}</button>;
}
```

### Hook Typing

- **Rule**: [MUST] When using union types with `useState`, specify them via generics. When referencing DOM elements with `useRef`, pass `null` as the initial value. Use `as const` for tuple returns from custom Hooks.
- **Good Example**:

```typescript
// useState: 유니온 타입 명시
type AuthStatus = "idle" | "loading" | "authenticated" | "error";
const [status, setStatus] = useState<AuthStatus>("idle");

// useState: 초기 null 허용
const [user, setUser] = useState<User | null>(null);

// useRef: DOM 참조 - 초기값 null 필수
const inputRef = useRef<HTMLInputElement>(null);

// 커스텀 Hook: 튜플 반환 시 as const
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = () => setValue((prev) => !prev);
  return [value, toggle] as const;
  // 반환 타입: readonly [boolean, () => void]
}
```

### Generic Components

- **Rule**: [SHOULD] General-purpose UI components that do not depend on a specific data type should be implemented using generic props patterns.
- **Good Example**:

```typescript
interface Column<T> {
  key: keyof T & string;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

function DataTable<T extends { id: string | number }>({
  data, columns, onRowClick,
}: DataTableProps<T>) {
  return (
    <table>
      <thead>
        <tr>{columns.map((col) => <th key={col.key}>{col.header}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} onClick={() => onRowClick?.(row)}>
            {columns.map((col) => (
              <td key={col.key}>
                {col.render ? col.render(row[col.key], row) : String(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### children Typing

- **Rule**: [MUST] Use `React.ReactNode` as the default type for `children`. Use `React.ReactElement` only when only specific React elements should be allowed.
- **Good Example**:

```typescript
// 일반적인 래퍼 - ReactNode
interface CardProps {
  title: string;
  children: React.ReactNode;
}

// React 요소만 허용 (cloneElement 등) - ReactElement
interface TooltipTriggerProps {
  content: string;
  children: React.ReactElement;
}
```

---

## 11. Anti-patterns

### No Inline Functions in JSX

- **Rule**: [MUST NOT] Do not define functions inline in JSX props. Extract handlers as named functions in the component body.
- **Good Example**:

```typescript
function OrderItem({ order }: OrderItemProps) {
  const handleDelete = () => {
    deleteOrder(order.id);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateOrderStatus(order.id, e.target.value as OrderStatus);
  };

  return (
    <div>
      <select onChange={handleStatusChange}>
        {/* options */}
      </select>
      <button onClick={handleDelete}>삭제</button>
    </div>
  );
}
```

- **Bad Example**:

```typescript
function OrderItem({ order }: OrderItemProps) {
  return (
    <div>
      <select onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}>
        {/* options */}
      </select>
      <button onClick={() => deleteOrder(order.id)}>삭제</button>
    </div>
  );
}
```

### Unnecessary State and Derived State Synchronization

- **Rule**: [MUST NOT] Do not create separate state for values that can be computed from existing state or props, or synchronize them with `useEffect`. Compute them directly during rendering.
- **Good Example**:

```typescript
function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  // state에서 계산 가능한 값은 렌더링 중 계산
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );
  const itemCount = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = filteredItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return <p>상품 {itemCount}개, 합계: {total.toLocaleString()}원</p>;
}
```

- **Bad Example**:

```typescript
function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [itemCount, setItemCount] = useState(0);  // items에서 계산 가능
  const [total, setTotal] = useState(0);           // items에서 계산 가능

  // useEffect로 동기화 - 2번 렌더링, stale 값 노출 위험
  useEffect(() => {
    setItemCount(items.reduce((sum, item) => sum + item.quantity, 0));
    setTotal(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  }, [items]);

  return <div />;
}
```

### Using useEffect as an Event Handler

- **Rule**: [MUST NOT] Do not put response logic for user actions (API calls, toasts, navigation, etc.) in `useEffect`.
- **Good Example**:

```typescript
function OrderForm() {
  const handleSubmit = async () => {
    await submitOrder();
    toast.success("주문이 완료되었다");
    router.push("/orders");
  };

  return <button onClick={handleSubmit}>주문하기</button>;
}
```

- **Bad Example**:

```typescript
function OrderForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isSubmitted) return;
    submitOrder().then(() => {
      toast.success("주문이 완료되었다");
      router.push("/orders");
    }).finally(() => setIsSubmitted(false));
  }, [isSubmitted]);

  return <button onClick={() => setIsSubmitted(true)}>주문하기</button>;
}
```

### Not Utilizing key for Component Reset

- **Rule**: [SHOULD] When all internal state of a component needs to be reset when a specific value changes, pass that value to the `key` prop instead of resetting individual states with `useEffect`.
- **Good Example**:

```typescript
function ChatPage({ rooms }: { rooms: ChatRoom[] }) {
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id);

  return (
    <div>
      <RoomList rooms={rooms} onSelect={setSelectedRoomId} />
      {/* key가 바뀌면 ChatPanel의 모든 내부 상태가 자동 초기화 */}
      <ChatPanel roomId={selectedRoomId} key={selectedRoomId} />
    </div>
  );
}
```

### Lying About useEffect Dependencies

- **Rule**: [MUST NOT] Do not exclude actually used values from the `useEffect` dependency array, or suppress dependency warnings with `eslint-disable`.

### Side Effects During Rendering

- **Rule**: [MUST NOT] Do not execute side effects such as API calls, `localStorage` access, or direct DOM manipulation in the component function body (render phase).
- **Good Example**:

```typescript
function AnalyticsDashboard() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return <div className={theme} />;
}
```

- **Bad Example**:

```typescript
function AnalyticsDashboard() {
  const savedTheme = localStorage.getItem("theme"); // SSR에서 에러
  document.title = "대시보드";                        // DOM 직접 조작
  fetch("/api/pageview", { method: "POST" });        // 매 렌더마다 API 호출

  return <div />;
}
```