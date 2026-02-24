# 테스트 컨벤션

> 이 문서는 프론트엔드 테스트 전략과 Storybook 활용 방법을 정의합니다.
> 상위 규칙: [프론트엔드 공통 컨벤션](../FRONTEND_CONVENTION.md)

---

## 1. 테스트 피라미드

프론트엔드 테스트는 아래 피라미드 구조를 따른다. 하위 레벨일수록 빠르고 안정적이며 비중이 높아야 한다.

```
        /  Visual  \          ← Visual Regression (Chromatic)
       /    E2E     \         ← Playwright, 핵심 사용자 시나리오
      /  Integration  \       ← React Testing Library, 컴포넌트 조합
     /   Component      \     ← Storybook Interaction Testing
    /    Unit Testing     \   ← Jest, 유틸리티/훅 단위
   ────────────────────────
```

| 레벨 | 도구 | 대상 | 비중 |
| --- | --- | --- | --- |
| Unit | Jest | 유틸리티 함수, 커스텀 훅, 순수 로직 | 40% |
| Component | Storybook + Interaction Testing | 개별 UI 컴포넌트의 렌더링과 인터랙션 | 25% |
| Integration | React Testing Library | 여러 컴포넌트의 조합, 폼 제출 흐름 등 | 20% |
| E2E | Playwright | 로그인, 주문 생성 등 핵심 사용자 시나리오 | 10% |
| Visual | Chromatic | UI 스타일 변경 감지, 시각적 회귀 방지 | 5% |

---

## 2. Storybook 컨벤션

### 2-1. 설정

- **규칙**: [MUST] Storybook은 `@storybook/nextjs` 프레임워크를 사용하고, App Router를 활성화한다
- **이유**: Next.js의 Image, Link, Router 등 내장 기능을 Storybook 환경에서도 동일하게 동작시키려면 전용 프레임워크 어댑터가 필요하다. `appDirectory: true` 설정은 App Router 기반 프로젝트와의 호환성을 보장한다.

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
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "../src/styles/theme";

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
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

### 2-2. 스토리 파일 위치

- **규칙**: [MUST] 스토리 파일은 컴포넌트와 같은 폴더에 위치시키며, `[ComponentName].stories.tsx` 패턴을 따른다
- **이유**: 컴포넌트와 스토리를 같은 폴더에 두면 관련 파일을 한눈에 파악할 수 있고, 컴포넌트 수정 시 스토리도 함께 업데이트할 가능성이 높아진다.
- **좋은 예시**:

```
src/components/ui/Button/
├── Button.tsx
├── Button.stories.tsx
├── Button.test.tsx
└── Button.types.ts
```

- **나쁜 예시**:

```
src/components/ui/Button/
└── Button.tsx

src/stories/
└── Button.stories.tsx      ← 컴포넌트와 분리되어 관리가 어려움
```

### 2-3. CSF3 포맷

- **규칙**: [MUST] Component Story Format 3(CSF3)을 사용하며, `Meta`와 `StoryObj` 타입을 적용한다
- **이유**: CSF3은 Storybook 공식 표준 포맷으로, 타입 안전성과 자동 완성을 제공한다. `satisfies` 키워드를 사용하면 타입 추론과 타입 검증을 동시에 달성할 수 있다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// CSF2 방식: 함수로 스토리를 정의하면 타입 안전성이 떨어짐
export default {
  title: "Button",
  component: Button,
};

export const Primary = () => <Button variant="primary">버튼</Button>;
export const Secondary = () => <Button variant="secondary">버튼</Button>;
```

### 2-4. 스토리 계층

- **규칙**: [SHOULD] `title` 속성은 Atomic Design 분류에 따라 계층적으로 작성한다
- **이유**: 일관된 계층 구조는 Storybook 사이드바에서 컴포넌트를 빠르게 탐색할 수 있게 하며, 팀원 간 컴포넌트 분류 기준을 통일한다.

| 분류 | 대상 | 예시 |
| --- | --- | --- |
| Atoms | 더 이상 분해할 수 없는 기본 요소 | `Atoms/Button`, `Atoms/Input`, `Atoms/Badge` |
| Molecules | Atom을 조합한 단위 기능 | `Molecules/SearchField`, `Molecules/FormField` |
| Organisms | Molecule을 조합한 독립 영역 | `Organisms/Header`, `Organisms/OrderTable` |
| Templates | 페이지 레이아웃 구조 | `Templates/DashboardLayout` |
| Pages | 실제 데이터가 연결된 페이지 | `Pages/OrderListPage` |

### 2-5. Interaction Testing

- **규칙**: [SHOULD] 사용자 인터랙션이 포함된 컴포넌트는 `play` 함수를 사용하여 Storybook 내에서 동작을 검증한다
- **이유**: Interaction Testing은 브라우저 환경에서 실제 사용자 동작을 시뮬레이션하므로 DOM 기반 테스트보다 신뢰도가 높다. 또한 Storybook UI에서 테스트 과정을 시각적으로 확인할 수 있어 디버깅이 용이하다.
- **좋은 예시**:

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

- **규칙**: [SHOULD] 공용 컴포넌트는 `tags: ['autodocs']`를 설정하여 자동 문서화를 활성화한다
- **이유**: Autodocs는 Props 테이블, Controls 패널, 코드 예제를 자동으로 생성하므로 별도 문서 작성 없이 컴포넌트 사용법을 전달할 수 있다.
- **좋은 예시**:

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

## 3. 단위 테스트 (Jest + React Testing Library)

### 3-1. 컴포넌트 테스트

- **규칙**: [MUST] 컴포넌트 테스트는 render -> interact -> assert 패턴을 따르며, `screen.getByRole`을 우선 사용한다
- **이유**: `getByRole`은 접근성 트리를 기반으로 요소를 탐색하므로, 테스트가 통과하면 접근성도 함께 보장된다. 구현 세부사항이 아닌 사용자 관점에서 테스트하는 것이 리팩토링에 강한 테스트를 만든다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
describe("UserProfile", () => {
  it("renders", () => {
    const { container } = render(<UserProfile name="홍길동" email="hong@example.com" />);

    // querySelector로 구현 세부사항에 의존
    expect(container.querySelector(".user-name")).toHaveTextContent("홍길동");
    expect(container.querySelector(".user-email")).toHaveTextContent("hong@example.com");
  });
});
```

### 3-2. Hook 테스트

- **규칙**: [SHOULD] 커스텀 훅은 `renderHook`을 사용하여 독립적으로 테스트한다
- **이유**: 훅을 컴포넌트와 분리하여 테스트하면 훅 자체의 로직을 정밀하게 검증할 수 있고, 컴포넌트 렌더링 없이 빠르게 테스트할 수 있다.
- **좋은 예시**:

```typescript
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./useCounter";

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

### 3-3. 파일 위치

- **규칙**: [MUST] 테스트 파일은 테스트 대상과 같은 폴더에 위치시키며, `*.test.tsx` (또는 `*.spec.tsx`) 패턴을 사용한다
- **이유**: 테스트 파일이 대상 파일과 같은 폴더에 있으면 관련 코드를 한 곳에서 관리할 수 있고, 파일 탐색 비용이 줄어든다.

```
src/components/ui/Button/
├── Button.tsx
├── Button.test.tsx          ← 컴포넌트 테스트
├── Button.stories.tsx       ← 스토리
└── Button.types.ts

src/hooks/
├── useCounter.ts
└── useCounter.test.ts       ← 훅 테스트

src/utils/
├── formatDate.ts
└── formatDate.test.ts       ← 유틸리티 테스트
```

### 3-4. Mock 패턴

- **규칙**: [SHOULD] 외부 의존성은 목적에 맞는 Mock 도구를 사용하여 격리한다
- **이유**: 테스트의 격리성을 확보하면 외부 서비스 장애나 네트워크 상태에 영향받지 않고 안정적으로 테스트를 실행할 수 있다.

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

## 4. E2E 테스트

- **규칙**: [SHOULD] 핵심 사용자 시나리오에 대해 E2E 테스트를 작성하며, Playwright를 사용한다
- **이유**: E2E 테스트는 실제 브라우저에서 전체 애플리케이션 흐름을 검증하므로 통합 문제를 발견하기에 가장 효과적이다. Playwright는 크로스 브라우저 지원, 자동 대기, 강력한 셀렉터 엔진을 제공한다.
- **좋은 예시**:

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

E2E 테스트는 비용이 높으므로 다음과 같은 핵심 시나리오에 집중한다:

| 시나리오 | 검증 항목 |
| --- | --- |
| 로그인/로그아웃 | 인증 플로우, 세션 관리 |
| 주문 CRUD | 생성, 조회, 수정, 삭제 전체 흐름 |
| 검색/필터 | 검색 결과 정확성, 필터 동작 |
| 결제 플로우 | 결제 정보 입력, 결제 완료 확인 |

---

## 5. 테스트 네이밍

- **규칙**: [SHOULD] `describe`로 테스트 대상을 명시하고, `it`에서 조건과 기대 결과를 작성한다
- **이유**: 명확한 네이밍은 테스트 실패 시 문제 원인을 빠르게 파악할 수 있게 해주며, 테스트 코드가 곧 명세 문서 역할을 한다.
- **좋은 예시**:

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

- **나쁜 예시**:

```typescript
// 테스트 대상이 모호하고 기대 결과가 불명확함
describe("tests", () => {
  it("works", () => { /* ... */ });
  it("test 1", () => { /* ... */ });
  it("should render correctly", () => { /* ... */ });
});
```

---

## 6. 안티패턴

### 구현 세부사항 테스트

- **규칙**: [MUST NOT] `data-testid`를 남용하거나 내부 구현에 의존하는 테스트를 작성하지 않는다. `getByRole`, `getByText`, `getByLabelText`를 우선 사용한다.
- **이유**: 구현 세부사항에 의존하는 테스트는 리팩토링 시 쉽게 깨진다. 사용자가 실제로 인식하는 요소(텍스트, 역할, 레이블)를 기준으로 테스트하면 내부 구조가 변경되어도 동작이 동일한 한 테스트가 유지된다.
- **좋은 예시**:

```typescript
// 사용자 관점에서 요소를 탐색
expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled();
expect(screen.getByLabelText("이메일")).toHaveValue("hong@example.com");
expect(screen.getByText("주문이 완료되었습니다.")).toBeInTheDocument();
```

- **나쁜 예시**:

```typescript
// data-testid에 의존하면 접근성 검증이 누락되고 리팩토링에 취약함
expect(screen.getByTestId("delete-btn")).toBeDisabled();
expect(screen.getByTestId("email-input")).toHaveValue("hong@example.com");
expect(screen.getByTestId("success-msg")).toBeInTheDocument();
```

### 스냅샷 테스트 남용

- **규칙**: [SHOULD NOT] 변경이 잦은 UI 컴포넌트에 스냅샷 테스트를 사용하지 않는다
- **이유**: 스냅샷 테스트는 UI가 조금만 변경되어도 실패하므로, 변경이 잦은 컴포넌트에서는 의미 없는 스냅샷 업데이트가 반복된다. 이는 팀원들이 스냅샷 변경을 검토 없이 승인하게 만드는 습관을 유발한다. 스냅샷 테스트는 변경이 드문 디자인 시스템 컴포넌트 등에 제한적으로 사용한다.

### 테스트 간 상태 공유

- **규칙**: [MUST NOT] 테스트 간 상태를 공유하지 않는다. 각 테스트는 독립적으로 실행되어야 한다.
- **이유**: 상태를 공유하면 테스트 실행 순서에 따라 결과가 달라지는 flaky test가 발생한다. 모든 테스트는 자체적으로 필요한 상태를 설정하고 정리해야 한다.
- **좋은 예시**:

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

- **나쁜 예시**:

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

### 비동기 로직에서 waitFor 누락

- **규칙**: [MUST NOT] 비동기로 렌더링되는 요소를 `waitFor` 없이 assertion하지 않는다
- **이유**: API 호출 결과나 상태 업데이트로 렌더링되는 요소는 즉시 DOM에 나타나지 않는다. `waitFor` 없이 assertion하면 테스트가 간헐적으로 실패하는 flaky test가 된다.
- **좋은 예시**:

```typescript
it("사용자 목록을 로딩 후 표시한다", async () => {
  render(<UserList />);

  // 비동기 렌더링 요소는 waitFor로 대기
  await waitFor(() => {
    expect(screen.getByText("홍길동")).toBeInTheDocument();
  });
});
```

- **나쁜 예시**:

```typescript
it("사용자 목록을 로딩 후 표시한다", () => {
  render(<UserList />);

  // API 응답 전에 assertion → 간헐적 실패
  expect(screen.getByText("홍길동")).toBeInTheDocument();
});
```

---

## 7. 참고 자료

- [Storybook 공식 문서](https://storybook.js.org/docs)
- [Testing Library 공식 문서](https://testing-library.com/docs)
- [Kent C. Dodds - Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests)
- [Kent C. Dodds - Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
- [Playwright 공식 문서](https://playwright.dev/docs/intro)
- [MSW(Mock Service Worker) 공식 문서](https://mswjs.io/docs)
- [Chromatic 공식 문서](https://www.chromatic.com/docs)
