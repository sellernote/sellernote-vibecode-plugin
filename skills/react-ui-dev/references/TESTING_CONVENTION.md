# Testing Convention

> This document defines the frontend testing strategy and Storybook usage guidelines.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Test Pyramid

Frontend testing follows the pyramid structure below. Lower levels should be faster, more stable, and have a higher proportion.

```text
       /    E2E     \         ← Playwright, 핵심 사용자 시나리오
      /  Integration  \       ← React Testing Library, 컴포넌트 조합
     /   Component      \     ← Storybook Interaction Testing
    /    Unit Testing     \   ← Vitest, 유틸리티/훅 단위
   ────────────────────────
```

| Level | Tool | Target | Proportion |
| --- | --- | --- | --- |
| Unit | Vitest | Utility functions, custom hooks, pure logic | 40% |
| Component | Storybook + Interaction Testing | Rendering and interaction of individual UI components | 25% |
| Integration | React Testing Library | Combination of multiple components, form submission flows, etc. | 25% |
| E2E | Playwright | Core user scenarios such as login, order creation, etc. | 10% |

---

## 2. Storybook Convention

### 2-1. Setup

- **Rule**: [MUST] Storybook uses the `@storybook/react-vite` framework

`.storybook/main.ts`:

```typescript
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../app/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: "@storybook/react-vite",
  staticDirs: ["../public"],
};

export default config;
```

`.storybook/preview.ts`:

```typescript
import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
  },
};

export default preview;
```

### 2-2. Story File Location

- **Rule**: [MUST] Story files are placed in the same folder as the component, following the `[ComponentName].stories.tsx` pattern
- **Good Example**:

```text
app/components/ui/button/
├── Button.tsx
├── Button.stories.tsx
├── Button.test.tsx
└── button.types.ts
```

### 2-3. CSF3 Format

- **Rule**: [MUST] Use Component Story Format 3 (CSF3) with `Meta` and `StoryObj` types
- **Good Example**:

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Atoms/Button",
  component: Button,
  args: {
    children: "버튼",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary 버튼",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary 버튼",
  },
};

export const Disabled: Story = {
  args: {
    variant: "primary",
    disabled: true,
    children: "비활성 버튼",
  },
};
```

### 2-4. Story Hierarchy

- **Rule**: [SHOULD] The `title` property should be written hierarchically according to the Atomic Design classification

| Classification | Target | Example |
| --- | --- | --- |
| Atoms | Basic elements that cannot be broken down further | `Atoms/Button`, `Atoms/Input`, `Atoms/Badge` |
| Molecules | Functional units composed of Atoms | `Molecules/SearchField`, `Molecules/FormField` |
| Organisms | Independent sections composed of Molecules | `Organisms/Header`, `Organisms/OrderTable` |
| Templates | Page layout structures | `Templates/DashboardLayout` |
| Pages | Pages connected with actual data | `Pages/OrderListPage` |

### 2-5. Interaction Testing

- **Rule**: [SHOULD] Components with user interactions should use the `play` function to verify behavior within Storybook
- **Good Example**:

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { within, userEvent, expect } from "@storybook/test";
import { ContactForm } from "./ContactForm";

const meta = {
  title: "Molecules/ContactForm",
  component: ContactForm,
} satisfies Meta<typeof ContactForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SubmitSuccess: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 이름 입력
    const nameInput = canvas.getByRole("textbox", { name: "이름" });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "홍길동");

    // 이메일 입력
    const emailInput = canvas.getByRole("textbox", { name: "이메일" });
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "hong@example.com");

    // 제출 버튼 클릭
    const submitButton = canvas.getByRole("button", { name: "제출" });
    await userEvent.click(submitButton);

    // 성공 메시지 확인
    await expect(
      canvas.getByText("성공적으로 제출되었습니다.")
    ).toBeInTheDocument();
  },
};
```

### 2-6. Autodocs

- **Rule**: [SHOULD] Shared components should enable automatic documentation by setting `tags: ['autodocs']`
- **Good Example**:

```typescript
const meta = {
  title: "Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      description: "버튼의 시각적 스타일",
      control: "select",
      options: ["primary", "secondary"],
    },
    onClick: {
      action: "clicked",
      description: "클릭 이벤트 핸들러",
    },
  },
} satisfies Meta<typeof Button>;
```

---

## 3. Unit Testing (Vitest + React Testing Library)

### 3-1. Component Testing

- **Rule**: [MUST] Component tests follow the render -> interact -> assert pattern, prioritizing `screen.getByRole`
- **Good Example**:

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

### 3-2. Hook Testing

- **Rule**: [SHOULD] Custom hooks should be tested independently using `renderHook`
- **Good Example**:

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

### 3-3. useSuspenseQuery Testing

- **Rule**: [SHOULD] Components using `useSuspenseQuery` should be tested with a `Suspense` boundary, and APIs should be mocked with MSW
- **Good Example**:

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

### 3-4. File Location

- **Rule**: [MUST] Test files are placed in the same folder as the test target, using the `*.test.tsx` (or `*.spec.tsx`) pattern

```text
app/components/ui/button/
├── Button.tsx
├── Button.test.tsx          ← 컴포넌트 테스트
├── Button.stories.tsx       ← 스토리
└── button.types.ts

app/hooks/
├── use-counter.ts
└── use-counter.test.ts      ← 훅 테스트

app/utils/
├── format-date.ts
└── format-date.test.ts      ← 유틸리티 테스트
```

### 3-5. Mock Patterns

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

## 4. E2E Testing

- **Rule**: [SHOULD] Write E2E tests for core user scenarios using Playwright
- **Good Example**:

```typescript
import { test, expect } from "@playwright/test";

test.describe("주문 생성 플로우", () => {
  test("로그인 후 주문을 생성할 수 있다", async ({ page }) => {
    // 로그인
    await page.goto("/login");
    await page.getByLabel("이메일").fill("user@example.com");
    await page.getByLabel("비밀번호").fill("password123");
    await page.getByRole("button", { name: "로그인" }).click();

    // 대시보드 도착 확인
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

E2E tests are expensive, so focus on core scenarios such as the following:

| Scenario | Verification Items |
| --- | --- |
| Login/Logout | Authentication flow, session management |
| Order CRUD | Full flow of create, read, update, delete |
| Search/Filter | Search result accuracy, filter behavior |
| Payment Flow | Payment information input, payment completion confirmation |

---

## 5. Test Naming

- **Rule**: [SHOULD] Specify the test target with `describe`, and write the condition and expected result in `it`
- **Good Example**:

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

## 6. Anti-Patterns

### Testing Implementation Details

- **Rule**: [MUST NOT] Do not overuse `data-testid` or write tests that depend on internal implementation. Prioritize `getByRole`, `getByText`, and `getByLabelText`.
- **Good Example**:

```typescript
// 사용자 관점에서 요소를 탐색
expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled();
expect(screen.getByLabelText("이메일")).toHaveValue("hong@example.com");
expect(screen.getByText("주문이 완료되었습니다.")).toBeInTheDocument();
```

- **Bad Example**:

```typescript
// data-testid에 의존하면 접근성 검증이 누락되고 리팩토링에 취약함
expect(screen.getByTestId("delete-btn")).toBeDisabled();
expect(screen.getByTestId("email-input")).toHaveValue("hong@example.com");
expect(screen.getByTestId("success-msg")).toBeInTheDocument();
```

### Overuse of Snapshot Testing

- **Rule**: [SHOULD NOT] Do not use snapshot testing for UI components that change frequently

### Sharing State Between Tests

- **Rule**: [MUST NOT] Do not share state between tests. Each test must run independently.
- **Good Example**:

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

- **Bad Example**:

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
- **Good Example**:

```typescript
it("사용자 목록을 로딩 후 표시한다", async () => {
  render(<UserList />);

  // 비동기 렌더링 요소는 waitFor로 대기
  await waitFor(() => {
    expect(screen.getByText("홍길동")).toBeInTheDocument();
  });
});
```

- **Bad Example**:

```typescript
it("사용자 목록을 로딩 후 표시한다", () => {
  render(<UserList />);

  // API 응답 전에 assertion → 간헐적 실패
  expect(screen.getByText("홍길동")).toBeInTheDocument();
});
```