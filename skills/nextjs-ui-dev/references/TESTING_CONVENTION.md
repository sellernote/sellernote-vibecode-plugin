# Testing Convention

> This document defines the frontend testing strategy and Storybook usage guidelines.
> Parent rules: FRONTEND_CONVENTION.md

---

## 1. Test Pyramid

Frontend testing follows the pyramid structure below. Lower levels should be faster, more stable, and have higher proportion.

```
        /  Visual  \          ← Visual Regression (Chromatic)
       /    E2E     \         ← Playwright, 핵심 사용자 시나리오
      /  Integration  \       ← React Testing Library, 컴포넌트 조합
     /   Component      \     ← Storybook Interaction Testing
    /    Unit Testing     \   ← Jest, 유틸리티/훅 단위
   ────────────────────────
```

| Level | Tool | Target | Proportion |
| --- | --- | --- | --- |
| Unit | Jest | Utility functions, custom hooks, pure logic | 40% |
| Component | Storybook + Interaction Testing | Rendering and interaction of individual UI components | 25% |
| Integration | React Testing Library | Composition of multiple components, form submission flows, etc. | 20% |
| E2E | Playwright | Core user scenarios such as login, order creation | 10% |
| Visual | Chromatic | Detecting UI style changes, preventing visual regression | 5% |

---

## 2. Storybook Convention

### 2-1. Setup

- **Rule**: [MUST] Storybook uses the `@storybook/nextjs` framework and enables App Router

`.storybook/main.ts`:

```typescript
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {
      appDirectory: true,
    },
  },
  staticDirs: ["../public"],
};

export default config;
```

`.storybook/preview.ts`:

```typescript
import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
```

### 2-2. Story File Location

- **Rule**: [MUST] Story files are placed in the same folder as the component, following the `[ComponentName].stories.tsx` pattern

```
src/shared/ui/Button/
├── Button.tsx
├── Button.stories.tsx
├── Button.test.tsx
└── Button.types.ts
```

### 2-3. CSF3 Format

- **Rule**: [MUST] Use Component Story Format 3 (CSF3) with `Meta` and `StoryObj` types

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "shared/Button",
  component: Button,
  args: { children: "버튼" },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary", children: "Primary 버튼" } };
export const Secondary: Story = { args: { variant: "secondary", children: "Secondary 버튼" } };
```

### 2-4. Story Hierarchy

- **Rule**: [SHOULD] The `title` property should be written hierarchically following the FSD layer classification

| Classification | Target | Example |
| --- | --- | --- |
| shared | Common UI components | `shared/Button`, `shared/DataTable` |
| entities | Domain basic UI | `entities/OrderCard`, `entities/UserBadge` |
| features | Business feature components | `features/OrderList`, `features/UserProfile` |
| widgets | Independent UI blocks | `widgets/Header`, `widgets/Sidebar` |

### 2-5. Interaction Testing

- **Rule**: [SHOULD] Components with user interactions should use the `play` function to verify behavior within Storybook

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { within, userEvent, expect } from "@storybook/test";
import { ContactForm } from "./ContactForm";

const meta = {
  title: "features/ContactForm",
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

- **Rule**: [SHOULD] Common components should set `tags: ['autodocs']` to enable automatic documentation

```typescript
const meta = {
  title: "shared/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { description: "버튼의 시각적 스타일", control: "select", options: ["primary", "secondary"] },
    onClick: { action: "clicked", description: "클릭 이벤트 핸들러" },
  },
} satisfies Meta<typeof Button>;
```

---

## 3. Unit Testing (Jest + React Testing Library)

### 3-1. Component Testing

- **Rule**: [MUST] Component tests follow the render -> interact -> assert pattern and prioritize using `screen.getByRole`

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserProfile } from "./UserProfile";

describe("UserProfile", () => {
  it("사용자 이름과 이메일을 렌더링한다", () => {
    render(<UserProfile name="홍길동" email="hong@example.com" />);
    expect(screen.getByRole("heading", { name: "홍길동" })).toBeInTheDocument();
    expect(screen.getByText("hong@example.com")).toBeInTheDocument();
  });

  it("편집 버튼 클릭 시 편집 모드로 전환된다", async () => {
    const user = userEvent.setup();
    render(<UserProfile name="홍길동" email="hong@example.com" />);
    await user.click(screen.getByRole("button", { name: "편집" }));
    expect(screen.getByRole("textbox", { name: "이름" })).toHaveValue("홍길동");
  });
});
```

### 3-2. Hook Testing

- **Rule**: [SHOULD] Custom hooks should be tested independently using `renderHook`

```typescript
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./useCounter";

describe("useCounter", () => {
  it("increment 호출 시 count가 1 증가한다", () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => { result.current.increment(); });
    expect(result.current.count).toBe(1);
  });
});
```

### 3-3. File Location

- **Rule**: [MUST] Test files are placed in the same folder as the test target, using the `*.test.tsx` (or `*.spec.tsx`) pattern

### 3-4. Mock Patterns

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

**Next.js Router Mock**:

```typescript
import { useRouter, usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

describe("Navigation", () => {
  it("로고 클릭 시 홈으로 이동한다", async () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    (usePathname as jest.Mock).mockReturnValue("/dashboard");

    const user = userEvent.setup();
    render(<Navigation />);

    await user.click(screen.getByRole("link", { name: "홈" }));

    expect(push).toHaveBeenCalledWith("/");
  });
});
```

**Zustand Store Mock**:

```typescript
import { create } from "zustand";

// 테스트용 store를 직접 생성하여 초기 상태를 제어
function createMockAuthStore(initialState = {}) {
  return create(() => ({
    user: null,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
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

E2E tests are costly, so focus on the following core scenarios:

| Scenario | Verification Items |
| --- | --- |
| Login/Logout | Authentication flow, session management |
| Order CRUD | Full flow of create, read, update, delete |
| Search/Filter | Search result accuracy, filter behavior |
| Payment Flow | Payment information input, payment completion confirmation |

---

## 5. Test Naming

- **Rule**: [SHOULD] Use `describe` to specify the test target, and write conditions and expected results in `it`

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

- **Rule**: [MUST NOT] Do not overuse `data-testid` or write tests that depend on internal implementation. Prioritize `getByRole`, `getByText`, and `getByLabelText`.

```typescript
// 사용자 관점에서 요소를 탐색
expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled();
expect(screen.getByLabelText("이메일")).toHaveValue("hong@example.com");
```

- **Rule**: [SHOULD NOT] Do not use snapshot tests for UI components that change frequently. Use them only in limited cases such as design system components that rarely change.
- **Rule**: [MUST NOT] Do not share state between tests. Each test must run independently. (Create a new store/state for each test)
- **Rule**: [MUST NOT] Do not assert asynchronously rendered elements without `waitFor`

```typescript
// 비동기 렌더링 요소는 반드시 waitFor로 대기
await waitFor(() => {
  expect(screen.getByText("홍길동")).toBeInTheDocument();
});
```