# React 컨벤션

> 이 문서는 React 19 프로젝트에 적용되는 규칙을 정의합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

---

## 1. 기술 스택

| 항목 | 버전/설정 |
| --- | --- |
| React | 19 |
| TypeScript | 5.x |
| React Compiler | 활성화 권장 |
| Error Boundary | react-error-boundary |
| UI 컴포넌트 | @sellernote/design-system |
| 가상화 | @tanstack/react-virtual (필요 시) |

> **React 19 문법 변경 사항**: 이 문서의 코드 예시는 React 19 기준으로 작성되었습니다.
> - Context: `<MyContext.Provider value={...}>` 대신 `<MyContext value={...}>` 축약 문법 사용
> - ref: `forwardRef` 대신 ref를 일반 prop으로 직접 전달
> - 이전 버전(React 18 이하)에서는 해당 문법이 동작하지 않습니다.

---

## 2. 컴포넌트 패턴

### Compound Components

- **규칙**: [SHOULD] 논리적으로 연관된 컴포넌트 그룹은 Compound Component 패턴으로 묶어 표현한다.
- **이유**: `<Select>`, `<Select.Option>` 처럼 관련 컴포넌트를 하나의 네임스페이스로 묶으면 사용처에서 의도가 명확하게 드러나고, 내부 상태를 Context로 공유하면서도 외부 API는 선언적으로 유지할 수 있다.
- **좋은 예시**:

```typescript
import { createContext, useContext } from "react";

interface SelectContextValue {
  value: string;
  onChange: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select.Option은 Select 내부에서만 사용할 수 있습니다.");
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

> **참고**: `@sellernote/design-system`이 `Select`, `Combobox`, `RadioGroup`, `CheckboxGroup` 등 복합 입력 컴포넌트를 제공한다. Compound Component를 직접 구현하기 전에 DS 컴포넌트를 먼저 확인한다.

- **나쁜 예시**:

```typescript
// options를 배열 prop으로 전달 - 확장성이 떨어지고 커스텀 렌더링이 어렵다
<Select
  value={selected}
  onChange={setSelected}
  options={[
    { value: "kr", label: "한국" },
    { value: "us", label: "미국" },
  ]}
/>
```

### Controlled vs Uncontrolled 컴포넌트

- **규칙**: [MUST] 폼 내 입력 컴포넌트는 제어 컴포넌트(Controlled)로 작성한다. 단, 외부에서 값을 관리할 필요가 없는 일회성 내부 UI는 비제어(Uncontrolled)로 두어도 무방하다.
- **이유**: 제어 컴포넌트는 React 상태가 단일 진실의 원천(single source of truth)이 되어 값 동기화, 유효성 검사, 폼 초기화가 명확하다. 단, React Hook Form 사용 시 내부적으로 비제어 방식으로 동작하므로 register 패턴을 따른다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// 비제어 컴포넌트를 폼에서 사용 - 값 추적이 어렵고 초기화 처리가 복잡해진다
function EmailInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    console.log(inputRef.current?.value); // ref로 직접 값을 읽어야 함
  }

  return <input type="email" defaultValue="" ref={inputRef} />;
}
```

- **DS 컴포넌트 연동 예시**:

```typescript
import { useState } from "react";
import { TextField, Select } from "@sellernote/design-system";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");

  return (
    <form className="flex flex-col gap-400">
      <TextField
        label="이메일"
        value={email}
        onChange={setEmail}
      />
      <Select
        label="국가"
        value={country}
        items={[
          { label: "한국", value: "kr" },
          { label: "미국", value: "us" },
        ]}
        onSelectedChange={setCountry}
      />
    </form>
  );
}
```

### 조건부 렌더링

- **규칙**: [MUST] 조건부 렌더링 시 `&&` 연산자 왼쪽에 숫자형 값(number)을 직접 사용하지 않는다. 복잡한 조건은 삼항 연산자 또는 early return 패턴을 사용한다.
- **이유**: `count && <Component />` 에서 `count`가 `0`이면 React는 `0`을 그대로 렌더링한다. Boolean으로 명시적 변환이 필요하다. 조건이 복잡할수록 early return으로 가독성을 높이는 것이 낫다.
- **좋은 예시**:

```typescript
// 1. boolean 변환 후 && 연산자 사용
function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div>
      {orders.length > 0 && <p>총 {orders.length}건의 주문이 있습니다.</p>}
    </div>
  );
}

// 2. 상태에 따른 early return
function UserProfile({ user }: { user: User | null }) {
  if (!user) return <p>로그인이 필요합니다.</p>;
  if (user.isSuspended) return <p>정지된 계정입니다.</p>;

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

- **나쁜 예시**:

```typescript
function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div>
      {/* orders.length가 0이면 화면에 "0"이 렌더링된다 */}
      {orders.length && <p>총 {orders.length}건</p>}

      {/* JSX 내부 복잡한 중첩 삼항 - 가독성이 매우 나쁘다 */}
      {orders.length > 10
        ? orders.length > 50
          ? <p>주문이 너무 많습니다</p>
          : <p>주문이 많습니다</p>
        : <p>주문이 적습니다</p>}
    </div>
  );
}
```

### 리스트 렌더링과 key

- **규칙**: [MUST NOT] 리스트 렌더링 시 `key`로 배열 인덱스(`index`)를 사용하지 않는다. 데이터 고유 식별자(ID)를 `key`로 사용해야 한다.
- **이유**: React는 `key`를 통해 리스트 항목의 동일성을 추적한다. 인덱스를 `key`로 사용하면 항목 추가/삭제/재정렬 시 React가 잘못된 컴포넌트를 재사용하여 상태 오염, 애니메이션 버그, 포커스 손실 등이 발생한다.
- **좋은 예시**:

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

- **나쁜 예시**:

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

### children과 합성 패턴 심화

- **규칙**: [SHOULD] 레이아웃이나 래퍼 컴포넌트는 `children` prop을 통한 합성 패턴을 사용한다. Render Props는 훅으로 대체할 수 없는 JSX 렌더링 제어가 필요할 때에만 사용한다.
- **이유**: `children` 합성은 결합도를 낮추고 부모가 자식의 렌더링을 제어할 수 있게 한다. Polymorphic component(`as` prop)는 HTML 시맨틱을 유지하면서 스타일을 재사용할 때 유용하다.
- **좋은 예시**:

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

## 3. Hooks 규칙

### 기본 규칙

- **규칙**: [MUST] Hook은 반드시 컴포넌트 함수 또는 Custom Hook의 최상위(top level)에서만 호출한다. 조건문, 반복문, 중첩 함수 내에서 호출하지 않는다.
- **이유**: React는 Hook 호출 순서를 기반으로 각 Hook의 상태를 추적한다. 조건부 호출이 발생하면 렌더링마다 Hook 호출 순서가 달라져 상태 불일치가 발생한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
function UserProfile({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  // 조건부 Hook 호출 - React 규칙 위반
  if (isAdmin) {
    const adminData = useAdminData();
  }

  const [isEditing, setIsEditing] = useState(false);
  return <div />;
}
```

### useState 패턴

- **규칙**: [MUST] 이전 상태에 의존하는 업데이트는 함수형 업데이트(functional update)를 사용한다. 객체 상태는 불변성을 지켜 스프레드로 업데이트한다.
- **이유**: 함수형 업데이트는 클로저 내 stale state 문제를 방지한다. 객체를 직접 변경하면 React가 변경을 감지하지 못한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
function Counter() {
  const [count, setCount] = useState(0);
  // stale closure 위험 - 비동기 상황에서 count가 오래된 값을 캡처할 수 있다
  const increment = () => setCount(count + 1);
  return <button onClick={increment}>{count}</button>;
}

function ProfileForm() {
  const [form, setForm] = useState({ name: "", email: "" });
  const handleNameChange = (value: string) => {
    form.name = value; // 직접 변경 금지
    setForm(form);     // 같은 참조 - 리렌더링 발생하지 않음
  };
  return <div />;
}
```

### useEffect 규칙

- **규칙**: [MUST] `useEffect`의 의존성 배열에 Effect 내부에서 참조하는 모든 반응형 값을 빠짐없이 명시한다. ESLint `exhaustive-deps` 규칙을 반드시 활성화한다.
- **규칙**: [MUST] `useEffect`는 외부 시스템과의 동기화(DOM 조작, 구독, 타이머)에만 사용한다. 이벤트 핸들링이나 파생 상태 계산에는 사용하지 않는다.
- **규칙**: [MUST] 구독, 타이머, 연결 등 정리(cleanup)가 필요한 Effect에는 반드시 cleanup 함수를 반환한다.
- **이유**: 의존성 누락은 stale closure로 인한 버그의 주요 원인이다. Cleanup 없이 구독이나 타이머를 등록하면 메모리 누수가 발생한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// 파생 상태를 Effect로 동기화 - 불필요한 렌더링 사이클
function ProductList({ products }: { products: Product[] }) {
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);

  useEffect(() => {
    setActiveProducts(products.filter((p) => p.isActive));
  }, [products]); // 렌더링 → Effect → setState → 리렌더링

  return <ul>{activeProducts.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}

// cleanup 없는 구독 - 메모리 누수
function PriceTracker({ productId }: { productId: string }) {
  useEffect(() => {
    const subscription = priceSocket.subscribe(productId, updatePrice);
    // cleanup 없음!
  }, [productId]);

  return <div />;
}
```

### useRef 사용 패턴

- **규칙**: [MUST] 신규 컴포넌트 작성 시 `forwardRef` 대신 `ref`를 직접 prop으로 수신한다. 기존 `forwardRef` 코드는 점진적으로 마이그레이션한다. (상세 패턴은 섹션 4 "ref를 prop으로 직접 전달" 참조)
- **규칙**: [SHOULD] 렌더링 결과에 영향을 주지 않는 값(타이머 ID, 이전 값 추적, 플래그)은 `useState` 대신 `useRef`로 저장한다.
- **이유**: `useRef`로 저장한 값 변경은 리렌더링을 유발하지 않으므로, 렌더링과 무관한 값에 적합하다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// 렌더링 무관 값에 useState 사용 - 불필요한 리렌더링
function DebouncedSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [timerId, setTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timerId) clearTimeout(timerId);
    setTimerId(setTimeout(() => onSearch(e.target.value), 300)); // 리렌더링 발생
  };

  return <input onChange={handleChange} />;
}
```

### useMemo / useCallback

- **규칙**: [SHOULD] React Compiler가 활성화된 프로젝트에서는 `useMemo`와 `useCallback`을 수동으로 작성하지 않는다. Compiler가 없는 프로젝트에서는 `memo`로 감싼 자식에 전달하는 함수/객체, 또는 비용이 실측으로 확인된 계산에만 사용한다.
- **이유**: `useMemo`와 `useCallback` 자체도 비용이 있으며, React Compiler가 자동으로 최적화를 수행하므로 수동 메모이제이션은 중복이다. Compiler가 없다면 `memo`와 함께 사용할 때만 실질적인 효과가 있다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// memo도 없는 컴포넌트에 전달하는 단순 핸들러에 useCallback 적용 - 효과 없음
function UserInfo({ user }: { user: User }) {
  const handleClick = useCallback(() => {
    console.log(user.name);
  }, [user.name]);

  // 단순한 문자열 포맷팅에 useMemo 적용 - 오버엔지니어링
  const displayName = useMemo(
    () => `${user.firstName} ${user.lastName}`,
    [user.firstName, user.lastName]
  );

  return <button onClick={handleClick}>{displayName}</button>;
}
```

### Custom Hooks 설계

- **규칙**: [MUST] Custom Hook 이름은 반드시 `use`로 시작한다. Hook은 단일 관심사만 담당하며, 반환값은 구조분해가 자연스러운 경우 객체, 단순한 값/함수 쌍은 배열(튜플)로 반환한다.
- **이유**: `use` 접두사는 React가 Hook 규칙을 적용하는 기준이다. 단일 책임을 가진 Hook은 테스트, 재사용, 교체가 쉽다.
- **좋은 예시**:

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

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = newValue instanceof Function ? newValue(prev) : newValue;
        localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

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

- **나쁜 예시**:

```typescript
// 여러 관심사를 하나의 Hook에 혼합
function useUserAndOrders(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [theme, setTheme] = useState("light"); // 관련 없는 관심사

  useEffect(() => { fetchUser(userId).then(setUser); }, [userId]);
  useEffect(() => { fetchOrders(userId).then(setOrders); }, [userId]);

  return { user, orders, theme, setTheme };
}
```

---

## 4. React 19 기능

### use() Hook

- **규칙**: [SHOULD] Promise 또는 Context 값을 읽을 때 `use()` hook을 사용하고, Promise를 소비하는 컴포넌트는 반드시 `<Suspense>` 경계 안에 배치한다.
- **이유**: `use()`는 조건문이나 반복문 안에서도 호출할 수 있는 유일한 hook이다. 단, 렌더 함수 내부에서 직접 생성한 Promise는 `use()`에 전달하면 안 된다 (매 렌더마다 새 Promise가 생성되어 무한 서스펜스가 발생한다).
- **좋은 예시**:

```typescript
// server-component.tsx (서버 컴포넌트에서 Promise 생성)
import { Suspense } from 'react';

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

// CommentsPanel.tsx (클라이언트 컴포넌트에서 use()로 소비)
'use client';

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
```

- **나쁜 예시**:

```typescript
'use client';

import { use } from 'react';

export function CommentsPanel({ postId }: { postId: string }) {
  // 렌더 함수 내부에서 Promise를 직접 생성 - 무한 루프 발생
  const comments = use(fetch(`/api/posts/${postId}/comments`).then(r => r.json()));
  return <ul>{comments.map(c => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

### React Compiler (React Forget)

- **규칙**: [SHOULD] React Compiler가 활성화된 프로젝트에서는 `useMemo`, `useCallback`, `React.memo`를 수동으로 추가하지 않는다.
- **이유**: React Compiler는 렌더 로직을 정적 분석하여 자동으로 메모이제이션을 적용한다. 수동 memo가 공존하면 의도가 불명확해지고 중복 최적화로 인한 혼란이 생긴다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// React Compiler 활성화 시 - 수동 메모이제이션 중복 적용
import { useMemo, useCallback, memo } from 'react';

const ProductList = memo(function ProductList({ products, filter }: ProductListProps) {
  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())),
    [products, filter]
  );

  const handleSelect = useCallback((id: string) => {
    console.log("선택:", id);
  }, []);

  return (
    <ul>
      {filteredProducts.map((p) => (
        <ProductItem key={p.id} product={p} onSelect={handleSelect} />
      ))}
    </ul>
  );
});
```

### Actions (useActionState, useFormStatus)

- **규칙**: [SHOULD] 폼 제출 로직은 `useActionState`로 상태를 관리하고, 제출 버튼의 pending 상태는 `useFormStatus`를 사용하는 별도의 자식 컴포넌트에서 처리한다.
- **이유**: `useFormStatus`는 가장 가까운 부모 `<form>`의 제출 상태를 구독하므로, 반드시 `<form>` 내부의 자식 컴포넌트에서 호출해야 한다.
- **좋은 예시**:

```typescript
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

interface FormState {
  error: string | null;
  success: boolean;
}

async function updateUserName(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get('name') as string;
  if (!name || name.length < 2) {
    return { error: '이름은 2자 이상이어야 합니다.', success: false };
  }
  await updateName(name);
  return { error: null, success: true };
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
  const [state, formAction] = useActionState(updateUserName, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction}>
      <input type="text" name="name" placeholder="새 이름 입력" />
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p>이름이 업데이트되었습니다.</p>}
      <SubmitButton />
    </form>
  );
}
```

- **나쁜 예시**:

```typescript
'use client';

export function UserNameForm() {
  const [state, formAction] = useActionState(updateUserName, { error: null });
  // useFormStatus를 form과 같은 컴포넌트에서 호출하면 동작하지 않는다
  const { pending } = useFormStatus(); // 항상 { pending: false }를 반환

  return (
    <form action={formAction}>
      <input type="text" name="name" />
      <button type="submit" disabled={pending}>저장</button>
    </form>
  );
}
```

### useOptimistic

- **규칙**: [MAY] 서버 응답을 기다리지 않고 즉각적인 UI 피드백이 필요한 경우 `useOptimistic`을 사용하고, 반드시 Transition 또는 Action 내부에서 낙관적 상태를 업데이트한다.
- **이유**: `useOptimistic`은 비동기 액션이 진행되는 동안 임시로 낙관적 상태를 보여주고, 액션이 완료되면 실제 서버 값으로 자동 교체한다. Transition 외부에서 호출하면 즉시 원래 값으로 되돌아간다.
- **좋은 예시**:

```typescript
'use client';

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

### ref를 prop으로 직접 전달

- **규칙**: [MUST] React 19에서 함수형 컴포넌트에 ref를 전달할 때 `forwardRef`를 사용하지 않고 일반 prop으로 직접 전달한다.
- **이유**: React 19부터 `ref`를 일반 prop처럼 받을 수 있다. `forwardRef`는 deprecated이며 향후 버전에서 제거될 예정이다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
import { forwardRef } from 'react';

// React 19에서는 forwardRef가 불필요하다 (deprecated)
const TextInput = forwardRef<HTMLInputElement, { label: string }>(
  function TextInput({ label }, ref) {
    return (
      <label>
        {label}
        <input ref={ref} />
      </label>
    );
  }
);
```

### Metadata 지원

- **규칙**: [SHOULD] React 19는 컴포넌트 내부에서 `<title>`, `<meta>` 태그를 직접 렌더링하면 자동으로 `<head>`에 호이스팅한다. 단, Next.js App Router 환경에서는 **`generateMetadata`/`metadata` export가 우선**이며, 이 방식으로 커버할 수 없는 컴포넌트 수준의 동적 메타데이터에만 React 내장 지원을 사용한다.
- **이유**: Next.js의 `generateMetadata`는 메타데이터 중복 제거, 상속, `<head>` 스트리밍을 자동 처리하므로 페이지 단위 메타데이터에 더 적합하다. React 19의 내장 지원은 모달 타이틀 오버라이드 등 컴포넌트 수준의 동적 변경에 활용한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
'use client';

import { useEffect } from 'react';

export default function BlogPostPage({ post }: { post: Post }) {
  // React 19에서는 useEffect로 title을 직접 조작할 필요가 없다
  useEffect(() => {
    document.title = `${post.title} | Sellernote 블로그`;
  }, [post.title]);

  return <article><h1>{post.title}</h1></article>;
}
```

---

## 5. 이벤트 처리

### 핸들러 네이밍

- **규칙**: [MUST] Props로 노출하는 이벤트 콜백은 `onXxx`, 컴포넌트 내부 핸들러 함수는 `handleXxx` 형식으로 명명한다.
- **이유**: `on` 접두사는 "이벤트 핸들러를 전달하세요"라는 계약을 표현하고, `handle` 접두사는 실제 로직을 담는 내부 함수임을 구분해준다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
interface ProductCardProps {
  product: Product;
  addToCart: (id: string) => void;      // on 접두사 없음
  handleWishlist: (id: string) => void; // handle은 내부 함수에 사용
}
```

### 이벤트 타입

- **규칙**: [MUST] 이벤트 핸들러를 별도 함수로 추출할 때는 올바른 React 이벤트 타입을 명시한다. `any` 또는 DOM 네이티브 `Event` 타입을 사용하지 않는다.
- **이유**: React의 합성 이벤트(SyntheticEvent)는 DOM 네이티브 `Event`와 다르다. 정확한 타입을 명시해야 TypeScript의 타입 추론이 정확하다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
const handleChange = (e: any) => { setQuery(e.target.value); };
const handleSubmit = (e: Event) => { e.preventDefault(); }; // DOM 네이티브 타입
```

### 합성 이벤트 주의점

- **규칙**: [SHOULD] `stopPropagation()`은 이벤트 버블링이 실제로 문제가 되는 상황에서만 사용한다. `preventDefault()`는 브라우저 기본 동작을 막아야 할 명확한 이유가 있을 때만 사용한다.
- **이유**: `stopPropagation()`을 무분별하게 사용하면 분석 도구(GA, Hotjar 등)의 이벤트 추적이 차단될 수 있다.
- **좋은 예시**:

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

## 6. 성능 최적화

### 리렌더링 이해와 방지

- **규칙**: [MUST] 렌더 함수 외부에 상수 객체/배열을 정의하여 매 렌더링마다 새 참조가 생성되는 것을 방지한다.
- **이유**: React 컴포넌트는 (1) state 변경, (2) 부모 리렌더링, (3) Context 값 변경 시 리렌더링된다. 렌더 함수 내부에서 객체를 새로 생성하여 자식에 전달하면 불필요한 리렌더링이 발생한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
function ProductTable({ products }: { products: Product[] }) {
  return (
    <div>
      {/* 매 렌더마다 새 객체가 생성되어 ProductHeader가 항상 리렌더링 */}
      <ProductHeader sortOptions={{ field: 'name', direction: 'asc' }} />
    </div>
  );
}
```

### 상태 위치 최적화 (State Colocation)

- **규칙**: [MUST] 상태는 해당 상태를 실제로 사용하는 컴포넌트와 최대한 가깝게 배치한다. 불필요하게 상위 컴포넌트로 끌어올리지 않는다.
- **이유**: 상태를 너무 높은 곳에 배치하면 무관한 컴포넌트도 리렌더링된다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
function ProductPage() {
  const [query, setQuery] = useState('');
  // query가 변경될 때마다 ProductGrid까지 리렌더링된다
  return (
    <div>
      <SearchPanel query={query} onQueryChange={setQuery} />
      <ProductGrid /> {/* 무관하지만 리렌더링됨 */}
    </div>
  );
}
```

### 지연 초기화 (Lazy Initialization)

- **규칙**: [MUST] `useState`의 초기값이 비용이 큰 연산(로컬스토리지 접근, 파싱 등)의 결과인 경우, 함수 호출이 아닌 함수 참조를 전달한다.
- **이유**: `useState(fn())`은 매 렌더링마다 `fn()`을 호출하지만 반환값은 첫 렌더에서만 사용된다. `useState(fn)`으로 함수 참조를 전달하면 초기 마운트 시에만 호출된다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
function ShoppingCart() {
  // 함수를 즉시 호출 - 매 리렌더링마다 localStorage를 파싱한다
  const [cartItems, setCartItems] = useState<CartItem[]>(getInitialCart());
  return <CartView items={cartItems} />;
}
```

### 큰 리스트 최적화

- **규칙**: [SHOULD] 수백 개 이상의 아이템을 렌더링하는 리스트에는 가상화(virtualization) 라이브러리를 적용한다.
- **이유**: DOM 노드가 많아질수록 초기 렌더링, 스크롤 성능, 메모리 사용량이 급격히 증가한다. `@tanstack/react-virtual`은 뷰포트에 보이는 아이템만 렌더링하여 이를 해결한다.
- **좋은 예시**:

```typescript
'use client';

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

### 에러 경계 구현

- **규칙**: [SHOULD] `react-error-boundary` 라이브러리를 사용한다. 직접 구현이 필요한 경우 `getDerivedStateFromError`와 `componentDidCatch`를 모두 구현한다.
- **이유**: `react-error-boundary`는 reset 기능, fallback render props, hook 등을 제공하여 클래스 컴포넌트 구현의 복잡성을 줄인다.
- **좋은 예시**:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <h2>문제가 발생했습니다</h2>
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

- **DS 컴포넌트 활용 예시**:

```typescript
import { ErrorBoundary } from 'react-error-boundary';
import { ActionButton, Alert } from "@sellernote/design-system";

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col gap-400 p-600">
      <Alert variant="error" title="문제가 발생했습니다" open>
        {error.message}
      </Alert>
      <ActionButton variant="secondary" onClick={resetErrorBoundary}>
        다시 시도
      </ActionButton>
    </div>
  );
}
```

### 복구 전략 (Reset 패턴)

- **규칙**: [MUST] 모든 Error Boundary의 fallback UI에는 복구 수단을 제공한다. `resetKeys` prop을 활용하여 의존 데이터가 변경될 때 자동으로 재시도한다.
- **이유**: 복구 경로가 없는 UI는 사용자에게 새로고침 외에 선택지를 주지 않아 이탈률을 높인다.
- **좋은 예시**:

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

### 에러 경계 배치 전략

- **규칙**: [MUST] 루트에 최소 1개의 전역 경계를 두고, 독립적으로 실패할 수 있는 UI 섹션마다 추가 경계를 배치한다.
- **이유**: 단일 전역 경계만 있으면 작은 오류 하나가 전체 페이지를 대체한다. 독립적인 UI 섹션에 별도 경계를 두면 나머지 페이지는 정상 동작한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// 단일 전역 경계만 존재: 어느 한 위젯의 오류가 대시보드 전체를 교체한다
export default function DashboardPage() {
  return (
    <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
      <div className="dashboard">
        <RevenueChart />       {/* 여기서 오류 발생 시 */}
        <OrderStatusPanel />   {/* 이 위젯도 사라진다 */}
        <InventoryAlerts />    {/* 이 위젯도 사라진다 */}
      </div>
    </ErrorBoundary>
  );
}
```

---

## 8. Context API

### Context vs Zustand 선택 기준

- **규칙**: [MUST] 전역 클라이언트 상태(여러 페이지에서 공유, 자주 업데이트)는 Zustand를 사용한다. Context API는 변경 빈도가 낮은 설정값이나 Compound Component의 내부 상태 공유에 사용한다.
- **이유**: Context 값이 변경되면 해당 Context를 구독하는 모든 컴포넌트가 리렌더링된다. Zustand는 선택적 구독(selector)을 지원해 필요한 상태가 변경될 때만 리렌더링된다.

| 기준 | Context API | Zustand |
|------|-------------|---------|
| 변경 빈도 | 낮음 (테마, 로케일) | 높음 (장바구니, 알림) |
| 범위 | 특정 트리 내부 | 앱 전역 |
| 선택적 구독 | 불가 | 가능 (selector) |
| 적합한 사례 | 테마, 언어, Compound Component | UI 상태, 사용자 설정 |

### Provider 패턴

- **규칙**: [MUST] Context Provider에 전달하는 값이 객체나 함수를 포함하는 경우 참조를 안정화한다. React Compiler 미활성화 시 `useMemo`와 `useCallback`을 수동으로 적용하고, Compiler 활성화 시에는 자동 처리에 맡긴다. Provider는 별도 컴포넌트로 분리한다.
- **이유**: Provider 컴포넌트가 리렌더링될 때 `value`로 새 객체 리터럴을 전달하면 값이 변경되지 않았더라도 모든 구독 컴포넌트가 리렌더링된다.
- **좋은 예시**:

```typescript
interface AuthContextValue {
  currentUser: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 내부에서 사용해야 합니다.");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = useCallback(async (credentials: Credentials) => {
    const user = await authApi.login(credentials);
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);

  const value = useMemo(
    () => ({ currentUser, login, logout }),
    [currentUser, login, logout]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
```

- **나쁜 예시**:

```typescript
function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 매 렌더링마다 새 객체 + 새 함수 참조 생성 - 전체 구독자 리렌더링
  return (
    <AuthContext
      value={{
        currentUser,
        login: async (credentials) => { /* ... */ },
        logout: () => setCurrentUser(null),
      }}
    >
      <Layout />
    </AuthContext>
  );
}
```

### Context 분리 원칙

- **규칙**: [MUST] 하나의 거대한 Context 대신 변경 빈도와 관심사에 따라 Context를 분리한다.
- **이유**: 하나의 Context에 모든 값을 넣으면 일부 값만 변경되어도 전체 구독 컴포넌트가 리렌더링된다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// 하나의 거대한 Context
const AppContext = createContext<{
  theme: string;
  locale: string;
  currentUser: User | null;
  cartItems: CartItem[];
  notifications: Notification[];
} | null>(null);
// cartItems가 변경될 때 theme만 사용하는 Header도 리렌더링된다
```

---

## 9. TypeScript 연동

> **참고**: DS에서 제공하는 타입을 활용한다.
> ```typescript
> import type { OptionItem, OptionGroup } from "@sellernote/design-system";
> import type { ActionButtonProps, DialogProps } from "@sellernote/design-system";
> ```

### 컴포넌트 Props에 HTML 속성 확장

- **규칙**: [MUST] 네이티브 HTML 요소를 래핑하는 컴포넌트는 `ComponentPropsWithoutRef`(또는 ref 전달 시 `ComponentPropsWithRef`)로 HTML 속성을 확장한다.
- **이유**: HTML 속성을 수동으로 나열하면 `className`, `aria-*`, `data-*` 등이 누락되어 사용처에서 타입 에러가 발생한다.
- **좋은 예시**:

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
      {onRemove && <button onClick={onRemove}>×</button>}
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

- **나쁜 예시**:

```typescript
// HTML 속성을 수동으로 나열 - className, aria-* 등 누락
interface TextInputProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
```

### Discriminated Union으로 Props 변형 타이핑

- **규칙**: [SHOULD] 컴포넌트가 여러 변형(variant)을 가지며 변형마다 허용 props가 다를 경우 discriminated union을 사용한다.
- **이유**: optional props를 모두 나열하면 잘못된 조합을 타입 수준에서 방지할 수 없다.
- **좋은 예시**:

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

### Hook 타이핑

- **규칙**: [MUST] `useState`에 유니온 타입을 사용할 때 제네릭으로 명시하고, `useRef`에 DOM 요소를 참조할 때 초기값으로 `null`을 전달한다. 커스텀 Hook의 튜플 반환에는 `as const`를 사용한다.
- **이유**: 제네릭 없이 초기값만 전달하면 TypeScript가 초기값의 타입으로 좁게 추론한다.
- **좋은 예시**:

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
  const toggle = useCallback(() => setValue((prev) => !prev), []);
  return [value, toggle] as const;
  // 반환 타입: readonly [boolean, () => void]
}
```

- **나쁜 예시**:

```typescript
const [status, setStatus] = useState("idle"); // string으로 추론 - 잘못된 값 허용
const [user, setUser] = useState(null);        // null로만 추론
const inputRef = useRef<HTMLInputElement>();    // undefined 가능 - DOM API와 불일치

function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = () => setValue((prev) => !prev);
  return [value, toggle];
  // 반환 타입: (boolean | (() => void))[] - 구조분해 시 유니온
}
```

### Generic 컴포넌트

- **규칙**: [SHOULD] 데이터 타입에 의존하지 않는 범용 UI 컴포넌트는 제네릭 props 패턴으로 구현한다.
- **이유**: `any`를 사용하면 콜백 인자 타입 정보가 유실된다. 제네릭을 사용하면 사용처까지 타입이 정확히 흐른다.
- **좋은 예시**:

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

### children 타이핑

- **규칙**: [MUST] `children` 타입은 기본적으로 `React.ReactNode`를 사용한다. `React.ReactElement`는 특정 React 요소만 허용해야 하는 경우에만 사용한다.
- **이유**: `React.ReactNode`는 문자열, 숫자, `null`, 배열, React 요소 등 렌더링 가능한 모든 값을 포괄한다. `JSX.Element`는 React 19에서 권장하지 않는다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
interface CardProps {
  children: JSX.Element; // 문자열, 숫자, 배열 전달 불가
}
```

---

## 10. 안티패턴

### 불필요한 상태와 파생 상태 동기화

- **규칙**: [MUST NOT] 기존 state나 props로부터 계산 가능한 값을 별도의 state로 만들거나, `useEffect`로 동기화한다. 렌더링 중 직접 계산한다.
- **이유**: 별도 state로 관리하면 (1) 원본 변경 시 두 번 렌더링되고, (2) 한 프레임 동안 stale 값이 노출되며, (3) 동기화를 빠뜨리면 추적하기 어려운 버그가 발생한다. 렌더링 중 직접 계산하면 항상 최신 값이 보장된다.
- **좋은 예시**:

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

- **나쁜 예시**:

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

### useEffect를 이벤트 핸들러로 사용

- **규칙**: [MUST NOT] 사용자 액션에 대한 응답 로직(API 호출, 토스트, 네비게이션 등)을 `useEffect`에 넣는다.
- **이유**: `useEffect`는 외부 시스템 동기화용 API이다. 이벤트 응답 로직을 Effect에 넣으면 트리거 시점이 불명확해지고, Strict Mode에서 두 번 실행될 수 있다.
- **좋은 예시**:

```typescript
function OrderForm() {
  const handleSubmit = async () => {
    await submitOrder();
    toast.success("주문이 완료되었습니다");
    router.push("/orders");
  };

  return <button onClick={handleSubmit}>주문하기</button>;
}
```

- **나쁜 예시**:

```typescript
function OrderForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isSubmitted) return;
    submitOrder().then(() => {
      toast.success("주문이 완료되었습니다");
      router.push("/orders");
    }).finally(() => setIsSubmitted(false));
  }, [isSubmitted]);

  return <button onClick={() => setIsSubmitted(true)}>주문하기</button>;
}
```

### key를 사용한 컴포넌트 리셋 미활용

- **규칙**: [SHOULD] 특정 값이 바뀔 때 컴포넌트의 모든 내부 상태를 초기화해야 한다면, `useEffect`로 개별 state를 리셋하는 대신 `key` prop에 해당 값을 전달한다.
- **이유**: `key`가 변경되면 React는 컴포넌트를 언마운트 후 새로 마운트하여 모든 내부 상태를 자동 초기화한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
function ChatPanel({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  // 수동 리셋 - 새 state 추가 시마다 리셋 코드도 추가해야 함
  useEffect(() => {
    setMessage("");
    setIsEmojiOpen(false);
  }, [roomId]);

  return <div />;
}
```

### useEffect 의존성 거짓말

- **규칙**: [MUST NOT] `useEffect`의 의존성 배열에서 실제 사용하는 값을 제외하거나, `eslint-disable`로 의존성 경고를 무시한다.
- **이유**: 의존성 배열은 "Effect가 사용하는 모든 반응형 값의 목록"이다. 값을 누락하면 stale closure가 발생하여 추적하기 어려운 버그가 생긴다. 의존성을 줄이고 싶다면 Effect 내부 코드를 리팩토링해야 한다.

### 렌더링 중 부수효과

- **규칙**: [MUST NOT] 컴포넌트 함수 본문(렌더링 페이즈)에서 API 호출, `localStorage` 접근, DOM 직접 조작 등 부수효과를 실행한다.
- **이유**: React는 컴포넌트 함수를 언제든 다시 호출할 수 있다(Strict Mode에서 두 번 호출). 렌더링 함수는 순수 함수여야 한다. 부수효과는 `useEffect`(외부 동기화)나 이벤트 핸들러(사용자 액션)에서 실행한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
function AnalyticsDashboard() {
  const savedTheme = localStorage.getItem("theme"); // SSR에서 에러
  document.title = "대시보드";                        // DOM 직접 조작
  fetch("/api/pageview", { method: "POST" });        // 매 렌더마다 API 호출

  return <div />;
}
```

---

## 11. 참고 자료

- [React 공식 문서](https://react.dev)
- [React 19 블로그 포스트](https://react.dev/blog/2024/12/05/react-19)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app)
- [react-error-boundary](https://github.com/bvaughn/react-error-boundary)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [React Compiler](https://react.dev/learn/react-compiler)
