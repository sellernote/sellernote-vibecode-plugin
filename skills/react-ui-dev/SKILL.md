---
name: react-ui-dev
description: React SPA UI 개발 가이드. @sellernote/design-system + Tailwind CSS v4 스타일링, React Hook Form + Zod 폼, Storybook + Jest + RTL 테스팅을 Sellernote 컨벤션에 맞게 진행합니다. UI 컴포넌트 생성, DS 컴포넌트 활용, Tailwind 스타일링, 폼 구현, Storybook 스토리 작성, 컴포넌트 테스트, 페이지 레이아웃, 반응형 디자인 등의 프론트엔드 UI 작업에 사용합니다. "컴포넌트 만들어줘", "스타일링 해줘", "폼 만들어줘", "테스트 작성해줘", "Storybook 추가해줘", "UI 개발", "create a component", "add styling", "write tests" 등의 요청에 활용됩니다. Next.js 프로젝트는 nextjs-ui-dev skill을 사용하세요.
---

# React UI Dev

React SPA(Vite + React Router) 프로젝트에서 UI 컴포넌트, 페이지, 폼, 테스트를 Sellernote 프론트엔드 컨벤션에 맞게 개발합니다.

> **React-only 프로젝트 특성**: 모든 컴포넌트가 클라이언트 컴포넌트입니다. `'use client'` 디렉티브가 불필요하며, Server Components가 없습니다. 라우팅은 React Router를 사용합니다.

## Convention Loading

작업 시작 전 반드시 다음 참조 파일을 읽습니다:

1. **항상 먼저 읽기** (핵심 규칙):
   - `references/FRONTEND_CONVENTION.md` - 컴포넌트 설계, props, imports, 접근성
   - `references/FRONTEND_ARCHITECTURE_CONVENTION.md` - 4 컴포넌트 분류, 의존성 방향, 코로케이션
   - `references/STYLING_CONVENTION.md` - @sellernote/design-system + Tailwind CSS v4, 디자인 토큰

2. **필요 시 읽기**:
   - `references/FORM_CONVENTION.md` - React Hook Form + Zod 폼
   - `references/TESTING_CONVENTION.md` - Storybook, Vitest, RTL, Playwright
   - `references/REACT_CONVENTION.md` - React 19 패턴, Hooks 규칙, 성능 최적화, Error Boundary
   - `references/REACT_ROUTER_CONVENTION.md` - React Router 7 Framework Mode, route modules
   - `references/COMMON_CONVENTION.md` - 네이밍, git, 에러 코드
   - `references/TYPESCRIPT_CONVENTION.md` - TS 스타일, imports, 타입

## Workflow

컴포넌트 유형을 먼저 판단한 후, 해당하는 단계를 따릅니다. 해당하지 않는 단계는 건너뜁니다.

### Step 1: 컴포넌트 유형 판단

아래 4가지 컴포넌트 유형 중 하나로 분류합니다:

| 유형 | 위치 | 특징 | Storybook |
|------|------|------|-----------|
| UI | `components/ui/` | props만으로 동작, 비즈니스 로직 없음, store/queries 미사용 | 필수 |
| Feature | `components/feature/` | 비즈니스 로직 포함, hooks/store/queries 사용, UI 컴포넌트 조합 | 선택 |
| Layout | `components/layout/` | 페이지 구조, 네비게이션, 도메인 로직 없음 | 선택 |
| Page | `pages/` | React Router의 route element, Feature/UI 컴포넌트 조합, 비즈니스 로직 없음 | 없음 |

**의존성 방향 (단방향, 엄격 적용):**

```
Page -> Feature -> UI
```

- UI는 Feature를 import 금지; Feature는 Page를 import 금지
- UI 컴포넌트는 props, React 내장 훅, 다른 UI 컴포넌트에만 의존
- UI 컴포넌트는 `store/`, `queries/`, 비즈니스 `hooks/`를 import 금지

### Step 2: 컴포넌트 구현

Sellernote 프론트엔드 컨벤션을 따릅니다:

- **UI 컴포넌트**: `interface`로 props 정의, `React.ReactNode`로 children, store/queries import 금지, 최대 300줄
- **Feature 컴포넌트**: UI 컴포넌트를 조합, TanStack Query로 데이터 페칭(`useEffect` 금지), prop drilling 3단계 초과 시 Zustand 사용
- **Page 컴포넌트**: Feature/UI/Layout 컴포넌트 조합만 담당, 비즈니스 로직 직접 작성 금지. `pages/` 디렉토리에 위치

`references/FRONTEND_ARCHITECTURE_CONVENTION.md`에서 전체 규칙과 예시를 확인합니다.

> **참고**: 아키텍처 컨벤션의 `app/` 디렉토리, Server Component, `'use client'` 관련 내용은 Next.js 전용입니다. React-only 프로젝트에서는:
> - `app/` 대신 `pages/` 디렉토리 사용
> - 모든 컴포넌트가 클라이언트이므로 `'use client'` 불필요
> - `loading.tsx`, `error.tsx` 파일 규칙 대신 React의 `<Suspense>`, `<ErrorBoundary>` 직접 사용
> - Server Actions 대신 TanStack Query의 `useMutation` 사용

### Step 3: 스타일링 적용

**@sellernote/design-system 기반 스타일링:**

1. **DS 컴포넌트 우선 사용** - `@sellernote/design-system`에서 제공하는 40+ 컴포넌트를 직접 import
2. **Tailwind 유틸리티 클래스** - DS에 없는 레이아웃/간격/커스텀 스타일은 Tailwind 클래스 사용
3. **cn() 조건부 결합** - DS의 `cn()` 함수로 조건부 className 결합

**핵심 제약:**
- [MUST] 색상은 DS 디자인 토큰 사용 (하드코딩 hex 금지)
- [MUST] 글로벌 CSS에서 `@import 'tailwindcss'` → `@import '@sellernote/design-system/styles'` 순서
- [MUST] 조건부 className은 `cn()` 사용 (`clsx` 단독 사용 금지)
- [MUST NOT] 인라인 `style={{}}` 사용 금지
- [MUST NOT] `!important` 사용 금지

`references/STYLING_CONVENTION.md`에서 전체 규칙과 예시를 확인합니다.

### Step 4: 폼 구현 (해당 시)

**필수 조합:** React Hook Form + Zod

- DS 컴포넌트를 `Controller`로 래핑 (DS의 제어 컴포넌트에는 `register` 직접 사용 불가)
- `zodResolver` + `mode: 'onBlur'`을 `useForm`에 설정
- `z.infer<typeof schema>`로 폼 타입 추출 (수동 interface 금지)
- 공통 스키마(email, password, phone)는 `lib/schemas/common.ts`에 정의
- `useFieldArray`로 동적 필드, `discriminatedUnion`으로 조건부 유효성 검사

`references/FORM_CONVENTION.md`에서 전체 규칙과 예시를 확인합니다.

### Step 5: 테스트 작성

테스트 피라미드 비율을 따릅니다:

| 레벨 | 도구 | 대상 | 비중 |
|------|------|------|------|
| Unit | Vitest | 유틸리티 함수, 커스텀 훅, 순수 로직 | 40% |
| Component | Storybook + Interaction Testing | 개별 UI 컴포넌트 렌더링/인터랙션 | 25% |
| Integration | React Testing Library | 다중 컴포넌트 조합, 폼 플로우 | 25% |
| E2E | Playwright | 핵심 사용자 시나리오 (로그인, 주문 생성) | 10% |

**핵심 제약:**
- [MUST] CSF3 포맷, `satisfies Meta<typeof Component>`
- [MUST] 인터랙티브 컴포넌트에 `play` 함수
- [MUST] `getByRole`/`getByLabelText`/`getByText` 우선 (`getByTestId` 최후 수단)
- [MUST] API 목은 MSW 사용
- [MUST] 비동기 assertions에 `waitFor` 사용
- [MUST] 테스트 파일은 컴포넌트와 같은 폴더에 배치 (코로케이션)

**React-only Storybook 설정:**
- `@storybook/react-vite` 프레임워크 사용 (`@storybook/nextjs` 아님)
- Vite 설정 자동 연동

`references/TESTING_CONVENTION.md`에서 전체 규칙과 예시를 확인합니다.

## File Structure Reference

```
src/
├── pages/                      # 페이지 컴포넌트 (React Router route elements)
│   ├── DashboardPage.tsx
│   ├── OrdersPage.tsx
│   └── NotFoundPage.tsx
├── routes/                     # React Router 라우트 설정
│   └── index.tsx               # createBrowserRouter 설정
├── components/
│   ├── ui/                     # UI 컴포넌트 (props만, Storybook 대상)
│   │   └── StatusBadge/
│   │       ├── StatusBadge.tsx
│   │       ├── StatusBadge.stories.tsx
│   │       ├── StatusBadge.test.tsx
│   │       └── index.ts
│   ├── feature/                # Feature 컴포넌트 (비즈니스 로직)
│   │   └── OrderList/
│   │       ├── OrderList.tsx
│   │       ├── OrderList.test.tsx
│   │       └── index.ts
│   └── layout/                 # Layout 컴포넌트 (구조)
│       └── Header/
├── hooks/                      # 커스텀 훅
├── store/                      # Zustand 스토어
│   └── slices/
├── queries/                    # TanStack Query 훅
├── lib/                        # 유틸리티, API 클라이언트
├── types/                      # 공유 타입 정의
├── schemas/                    # Zod 스키마
└── constants/                  # 상수
```

## Cross-Skill References

- **React 컴포넌트 패턴, Hooks, 성능 최적화**: `react-dev` skill 사용
- **데이터 페칭, 상태 관리**: `react-data-provider` skill 사용
- **전체 기능 오케스트레이션**: `react-dev-orchestration` skill 사용
- **코드 리뷰**: `convention-code-review` skill 사용
- **컨벤션 리팩토링**: `convention-refactor` skill 사용
