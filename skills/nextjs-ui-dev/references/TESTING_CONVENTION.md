# Testing Convention

> This document defines the frontend testing strategy.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Test Pyramid

Frontend testing follows the pyramid structure below. Lower levels should be faster, more stable, and have a higher proportion.

```text
      /     E2E      \      ← Playwright, 핵심 사용자 시나리오
     /  Integration   \     ← React Testing Library, 사용자 흐름/조합
    /   Unit Testing   \    ← Vitest, 유틸리티/훅/순수 로직
   ──────────────────────
```

| Level | Tool | Target | Proportion |
| --- | --- | --- | --- |
| Unit | Vitest | Utility functions, custom hooks, pure logic | 50% |
| Integration | React Testing Library | Combination of multiple components, form submission flows, screen-level verification | 35% |
| E2E | Playwright | Core user scenarios such as login, order creation | 15% |

---

## 2. Unit Testing (Vitest + React Testing Library)

### 2-1. Component Testing

- **Rule**: [MUST] Component tests follow the render -> interact -> assert pattern and prioritize using `screen.getByRole`
- **Good example**:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfile } from "./UserProfile";

describe("UserProfile", () => {
  it("사용자 이름과 이메일을 렌더링한다", () => {
    // render
    render(<UserProfile name="홍길동" email="hong@example.com" />);

    // assert
    expect(screen.getByRole("heading", { name: "홍길동" })).toBeInTheDocument();
    expect(screen.getByText("hong@example.com")).toBeInTheDocument();
  });

  it("편집 버튼 클릭 시 편집 모드로 전환된다", async () => {
    const user = userEvent.setup();

    // render
    render(<UserProfile name="홍길동" email="hong@example.com" />);

    // interact
    await user.click(screen.getByRole("button", { name: "편집" }));

    // assert
    expect(screen.getByRole("textbox", { name: "이름" })).toHaveValue("홍길동");
  });
});
```

### 2-2. Hook Testing

- **Rule**: [SHOULD] Custom hooks should be tested independently using `renderHook`
- **Good example**:

```typescript
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./use-counter";

describe("useCounter", () => {
  it("초기값을 설정할 수 있다", () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it("increment 호출 시 count가 1 증가한다", () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("decrement 호출 시 count가 1 감소한다", () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(-1);
  });
});
```

### 2-3. useSuspenseQuery Testing

- **Rule**: [SHOULD] Components using `useSuspenseQuery` should be tested with `Suspense` boundaries, and APIs should be mocked with MSW
- **Good example**:

```typescript
import { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserProfile } from "./UserProfile";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>로딩 중...</div>}>
        {ui}
      </Suspense>
    </QueryClientProvider>
  );
}

describe("UserProfile", () => {
  it("로딩 후 사용자 정보를 표시한다", async () => {
    // MSW로 API 응답 모킹 (setupServer에서 설정)
    renderWithProviders(<UserProfile userId="1" />);

    // Suspense fallback 확인
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();

    // 데이터 로딩 완료 후 확인
    await waitFor(() => {
      expect(screen.getByText("홍길동")).toBeInTheDocument();
    });
  });
});
```

### 2-4. File Location

- **Rule**: [MUST NOT] Do not create `.test.tsx` and `.stories.tsx` files per component as a default structure.
- **Rule**: [SHOULD] When testing is needed, write separate test files on a feature basis.

```text
app/features/order/
├── api/
│   ├── query-options.ts
│   └── use-orders-query.ts
└── tests/
    └── use-orders-query.test.ts

app/hooks/
├── use-counter.ts
└── use-counter.test.ts      ← 훅 테스트

app/utils/
├── format-date.ts
└── format-date.test.ts      ← 유틸리티 테스트
```

### 2-5. Mock Patterns

- **Rule**: [SHOULD] External dependencies should be isolated using appropriate mock tools

**API Mock (MSW)**:

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserList } from "./UserList";

const server = setupServer(
  http.get("/api/users", () => {
    return HttpResponse.json([
      { id: 1, name: "홍길동" },
      { id: 2, name: "김철수" },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("UserList", () => {
  it("사용자 목록을 렌더링한다", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("홍길동")).toBeInTheDocument();
      expect(screen.getByText("김철수")).toBeInTheDocument();
    });
  });
});
```

**React Router Mock**:

```typescript
import { useNavigate, useLocation } from "react-router";
import { vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

describe("Navigation", () => {
  it("로고 클릭 시 홈으로 이동한다", async () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    vi.mocked(useLocation).mockReturnValue({
      pathname: "/dashboard",
      search: "",
      hash: "",
      state: null,
      key: "default",
    });

    const user = userEvent.setup();
    render(<Navigation />);

    await user.click(screen.getByRole("link", { name: "홈" }));

    expect(navigate).toHaveBeenCalledWith("/");
  });
});
```

**Zustand Store Mock**:

```typescript
import { create } from "zustand";
import { vi } from "vitest";

// 테스트용 store를 직접 생성하여 초기 상태를 제어
function createMockAuthStore(initialState = {}) {
  return create(() => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...initialState,
  }));
}

describe("AuthenticatedContent", () => {
  it("인증된 사용자에게 콘텐츠를 표시한다", () => {
    const useAuthStore = createMockAuthStore({
      user: { name: "홍길동" },
      isAuthenticated: true,
    });

    render(<AuthenticatedContent useAuthStore={useAuthStore} />);

    expect(screen.getByText("홍길동님, 환영합니다.")).toBeInTheDocument();
  });
});
```

---

## 3. E2E Testing

- **Rule**: [SHOULD] Write E2E tests for core user scenarios using Playwright
- **Good example**:

```typescript
import { test, expect } from "@playwright/test";

test.describe("주문 생성 플로우", () => {
  test("로그인 후 주문을 생성할 수 있다", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.getByLabel("이메일").fill("user@example.com");
    await page.getByLabel("비밀번호").fill("password123");
    await page.getByRole("button", { name: "로그인" }).click();

    // 대시보��� 도착 확인
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();

    // 주문 생성 페이지로 이동
    await page.getByRole("link", { name: "주문 생성" }).click();
    await expect(page).toHaveURL("/orders/new");

    // 주문 정보 입력
    await page.getByLabel("상품명").fill("테스트 상품");
    await page.getByLabel("수량").fill("10");
    await page.getByRole("button", { name: "주문 생성" }).click();

    // 주문 완료 확인
    await expect(page.getByText("주문이 생성되었습니다.")).toBeVisible();
  });
});
```

E2E tests are costly, so focus on the following core scenarios:

| Scenario | Verification Items |
| --- | --- |
| Login/Logout | Authentication flow, session management |
| Order CRUD | Full flow of create, read, update, delete |
| Search/Filter | Search result accuracy, filter behavior |
| Payment Flow | Payment information input, payment completion confirmation |

---

## 4. Test Naming

- **Rule**: [SHOULD] Specify the test target with `describe`, and write the condition and expected result in `it`
- **Good example**:

```typescript
describe("OrderTable", () => {
  describe("정렬", () => {
    it("날짜 컬럼 클릭 시 최신순으로 정렬된다", () => { /* ... */ });
    it("금액 컬럼 클릭 시 높은 금액순으로 정렬된다", () => { /* ... */ });
  });

  describe("필터", () => {
    it("상태 필터 적용 시 해당 상태의 주문만 표시된다", () => { /* ... */ });
    it("날짜 범위 필터 적용 시 범위 내 주문만 표시된다", () => { /* ... */ });
  });

  describe("빈 상태", () => {
    it("주문이 없을 때 빈 상태 메시지를 표시한다", () => { /* ... */ });
  });
});
```

---

## 5. Anti-patterns

### Testing Implementation Details

- **Rule**: [MUST NOT] Do not overuse `data-testid` or write tests that depend on internal implementation. Prioritize using `getByRole`, `getByText`, and `getByLabelText`.
- **Good example**:

```typescript
// 사용자 관점에서 요소를 탐색
expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled();
expect(screen.getByLabelText("이메일")).toHaveValue("hong@example.com");
expect(screen.getByText("주문이 완료되었습니다.")).toBeInTheDocument();
```

- **Bad example**:

```typescript
// data-testid에 의존하면 접근성 검증이 누락되고 리팩토링에 취약함
expect(screen.getByTestId("delete-btn")).toBeDisabled();
expect(screen.getByTestId("email-input")).toHaveValue("hong@example.com");
expect(screen.getByTestId("success-msg")).toBeInTheDocument();
```

### Overuse of Snapshot Tests

- **Rule**: [SHOULD NOT] Do not use snapshot tests for UI components that change frequently

### Sharing State Between Tests

- **Rule**: [MUST NOT] Do not share state between tests. Each test must run independently.
- **Good example**:

```typescript
describe("CartStore", () => {
  // 각 테스트마다 새로운 store 생성
  it("상품을 추가할 수 있다", () => {
    const store = createCartStore();
    store.getState().addItem({ id: "1", name: "상품A", price: 1000 });

    expect(store.getState().items).toHaveLength(1);
  });

  it("상품을 제거할 수 있다", () => {
    const store = createCartStore();
    store.getState().addItem({ id: "1", name: "상품A", price: 1000 });
    store.getState().removeItem("1");

    expect(store.getState().items).toHaveLength(0);
  });
});
```

- **Bad example**:

```typescript
describe("CartStore", () => {
  // 테스트 간 store를 공유하여 실행 순서에 의존
  const store = createCartStore();

  it("상품을 추가할 수 있다", () => {
    store.getState().addItem({ id: "1", name: "상품A", price: 1000 });
    expect(store.getState().items).toHaveLength(1);
  });

  it("상품을 제거할 수 있다", () => {
    // 위 테스트에서 추가한 상품에 의존 → 순서가 바뀌면 실패
    store.getState().removeItem("1");
    expect(store.getState().items).toHaveLength(0);
  });
});
```

### Missing waitFor for Asynchronous Logic

- **Rule**: [MUST NOT] Do not assert on asynchronously rendered elements without `waitFor`
- **Good example**:

```typescript
it("사용자 목록을 로딩 후 표시한다", async () => {
  render(<UserList />);

  // 비동기 렌더링 요소는 waitFor로 대기
  await waitFor(() => {
    expect(screen.getByText("홍길동")).toBeInTheDocument();
  });
});
```

- **Bad example**:

```typescript
it("사용자 목록을 로딩 후 표시한다", () => {
  render(<UserList />);

  // API 응답 전에 assertion → 간헐적 실패
  expect(screen.getByText("홍길동")).toBeInTheDocument();
});
```