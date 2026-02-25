# React-only Skill Set Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create 3 new React-only skills (react-ui-dev, react-data-provider, react-dev-orchestration), sync REACT_CONVENTION.md references, and update nextjs-ui-dev SKILL.md from MUI to DS+Tailwind.

**Architecture:** Mirror the Next.js skill structure for React SPA (Vite + React Router). Each skill is self-contained with its own references/ directory. Convention docs are copied from `sellernote-development-convention` repo. SKILL.md workflows translate Next.js-specific concepts to React-only equivalents.

**Tech Stack:** Skills are Markdown files with frontmatter. References are copies from the convention repo at `/Users/sungwoo.yang/Documents/sellernote/sellernote/sellernote-development-convention/`.

**Convention repo path:** `CONV=/Users/sungwoo.yang/Documents/sellernote/sellernote/sellernote-development-convention`
**Skills path:** `SKILLS=/Users/sungwoo.yang/Documents/sellernote/sellernote/sellernote-vibecode-plugin/skills`

---

## Task 1: Sync REACT_CONVENTION.md across all skills

REACT_CONVENTION.md is the only out-of-sync reference (verified via md5 checksum comparison). All other convention references are already up-to-date.

**Files:**
- Source: `$CONV/frontend/react/REACT_CONVENTION.md`
- Update: `$SKILLS/react-dev/references/REACT_CONVENTION.md`
- Update: `$SKILLS/nextjs-ui-dev/references/REACT_CONVENTION.md`
- Update: `$SKILLS/convention-code-review/references/REACT_CONVENTION.md`
- Update: `$SKILLS/convention-refactor/references/REACT_CONVENTION.md`

**Step 1: Copy latest REACT_CONVENTION.md to all skills**

```bash
CONV="/Users/sungwoo.yang/Documents/sellernote/sellernote/sellernote-development-convention"
SKILLS="/Users/sungwoo.yang/Documents/sellernote/sellernote/sellernote-vibecode-plugin/skills"

cp "$CONV/frontend/react/REACT_CONVENTION.md" "$SKILLS/react-dev/references/REACT_CONVENTION.md"
cp "$CONV/frontend/react/REACT_CONVENTION.md" "$SKILLS/nextjs-ui-dev/references/REACT_CONVENTION.md"
cp "$CONV/frontend/react/REACT_CONVENTION.md" "$SKILLS/convention-code-review/references/REACT_CONVENTION.md"
cp "$CONV/frontend/react/REACT_CONVENTION.md" "$SKILLS/convention-refactor/references/REACT_CONVENTION.md"
```

**Step 2: Verify checksums match**

```bash
SOURCE_MD5=$(md5 -q "$CONV/frontend/react/REACT_CONVENTION.md")
for skill in react-dev nextjs-ui-dev convention-code-review convention-refactor; do
  SKILL_MD5=$(md5 -q "$SKILLS/$skill/references/REACT_CONVENTION.md")
  if [ "$SOURCE_MD5" = "$SKILL_MD5" ]; then echo "$skill: OK"; else echo "$skill: MISMATCH"; fi
done
```

Expected: All "OK"

**Step 3: Commit**

```bash
git add skills/react-dev/references/REACT_CONVENTION.md \
       skills/nextjs-ui-dev/references/REACT_CONVENTION.md \
       skills/convention-code-review/references/REACT_CONVENTION.md \
       skills/convention-refactor/references/REACT_CONVENTION.md
git commit -m "chore: sync REACT_CONVENTION.md to latest convention"
```

---

## Task 2: Create react-data-provider skill

**Files:**
- Create: `$SKILLS/react-data-provider/SKILL.md`
- Create: `$SKILLS/react-data-provider/references/COMMON_CONVENTION.md` (copy from convention repo)
- Create: `$SKILLS/react-data-provider/references/TYPESCRIPT_CONVENTION.md` (copy)
- Create: `$SKILLS/react-data-provider/references/FRONTEND_CONVENTION.md` (copy)
- Create: `$SKILLS/react-data-provider/references/STATE_CONVENTION.md` (copy)

**Step 1: Create directory and copy references**

```bash
mkdir -p "$SKILLS/react-data-provider/references"
cp "$CONV/common/COMMON_CONVENTION.md" "$SKILLS/react-data-provider/references/COMMON_CONVENTION.md"
cp "$CONV/common/typescript/TYPESCRIPT_CONVENTION.md" "$SKILLS/react-data-provider/references/TYPESCRIPT_CONVENTION.md"
cp "$CONV/frontend/FRONTEND_CONVENTION.md" "$SKILLS/react-data-provider/references/FRONTEND_CONVENTION.md"
cp "$CONV/frontend/state/STATE_CONVENTION.md" "$SKILLS/react-data-provider/references/STATE_CONVENTION.md"
```

**Step 2: Write SKILL.md**

Create `$SKILLS/react-data-provider/SKILL.md` with this content:

```markdown
---
name: react-data-provider
description: React SPA 데이터 페칭 및 상태 관리 가이드. TanStack Query를 통한 서버 상태 관리, Zustand를 통한 클라이언트 상태 관리, API 클라이언트 설정, 쿼리 키 팩토리, 옵티미스틱 업데이트, 캐시 무효화 등을 Sellernote 컨벤션에 맞게 진행합니다. "데이터 페칭", "API 연동", "상태 관리", "TanStack Query", "Zustand", "쿼리 훅 만들어줘", "스토어 만들어줘", "API 호출", "캐시 전략", "optimistic update" 등의 요청에 사용합니다. Next.js 프로젝트는 nextjs-data-provider skill을 사용하세요.
---

# React Data Provider

React SPA(Vite + React Router) 프로젝트에서 데이터 페칭과 상태 관리를 Sellernote 컨벤션에 맞게 구현합니다.

> **React-only 프로젝트 특성**: Server Components, Server Actions, revalidatePath/Tag가 없습니다. 모든 데이터 페칭은 클라이언트 사이드에서 TanStack Query를 통해 이루어지며, 뮤테이션은 useMutation + REST API 호출로 처리합니다.

## Convention Loading

작업 시작 전 반드시 다음 참조 파일을 읽습니다:

1. **항상 먼저 읽기** (핵심 규칙):
   - `references/STATE_CONVENTION.md` - 상태 분류, TanStack Query 패턴, Zustand 패턴
   - `references/FRONTEND_CONVENTION.md` - 컴포넌트 설계, import 규칙

2. **필요 시 읽기**:
   - `references/TYPESCRIPT_CONVENTION.md` - 타입 시스템, async/await, import 순서
   - `references/COMMON_CONVENTION.md` - 네이밍, 에러 처리, 로깅

## Workflow

### Step 1: 상태 유형 분류

모든 상태는 반드시 아래 4가지 중 하나로 분류합니다:

| 상태 유형 | 도구 | 사용 시점 |
|-----------|------|-----------|
| Server state | TanStack Query | API에서 가져온 데이터 (상품 목록, 사용자 프로필, 주문 내역) |
| Client state | Zustand | 공유 UI 상태, 사용자 설정 (사이드바 열림/닫힘, 테마, 알림) |
| Local state | useState | 단일 컴포넌트 상태 (모달 열림, 입력값, 토글) |
| URL state | useSearchParams (react-router-dom) | 페이지네이션, 필터, 정렬 |

핵심 규칙:
- [MUST] 서버 데이터는 TanStack Query로만 관리
- [MUST NOT] 서버 상태를 Zustand에 복제
- [MUST NOT] 로컬 상태(예: `isDeleteModalOpen`)를 Zustand에 저장

### Step 2: 페칭 전략 결정

React SPA에서는 모든 데이터 페칭이 클라이언트 사이드입니다:

| 시나리오 | 방법 |
|----------|------|
| 목록/상세 데이터 조회 | TanStack Query `useQuery` |
| 검색/필터/페이지네이션 | TanStack Query + URL state (useSearchParams) |
| 생성/수정/삭제 | TanStack Query `useMutation` + REST API |
| 실시간 데이터 (폴링) | TanStack Query `refetchInterval` |
| 무한 스크롤 | TanStack Query `useInfiniteQuery` |

### Step 3: API 클라이언트 설정

[MUST] `lib/api.ts`에 fetch wrapper를 설정합니다:

```typescript
// lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
```

### Step 4: TanStack Query (서버 상태)

#### 4a: 쿼리 키 팩토리

[MUST] `@lukemorales/query-key-factory`를 사용합니다. `queries/queryKeys.ts`에 배치:

```typescript
import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';

export const productKeys = createQueryKeys('products', {
  all: null,
  list: (filters: ProductFilters) => ({ queryKey: [filters] }),
  detail: (id: string) => ({ queryKey: [id] }),
});

export const queryKeys = mergeQueryKeys(productKeys);
```

#### 4b: 커스텀 쿼리 훅

[MUST] `queries/` 디렉토리에 도메인별 파일로 배치. `useQuery`/`useMutation`을 커스텀 훅으로 캡슐화하고 컴포넌트에서 직접 호출하지 않습니다:

```typescript
// queries/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productKeys } from './queryKeys';
import { api } from '@/lib/api';

export function useProducts(filters: ProductFilters) {
  return useQuery({
    ...productKeys.list(filters),
    queryFn: () => api.get<ProductListResponse>(`/products?${toSearchParams(filters)}`),
    staleTime: 5 * 60 * 1000,
  });
}
```

#### 4c: 옵티미스틱 업데이트 + 롤백

UX 중요 뮤테이션에 적용합니다:

```typescript
// queries/useUpdateProduct.ts
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProductInput) =>
      api.put<Product>(`/products/${data.id}`, data),
    onMutate: async (updatedProduct) => {
      const detailKey = productKeys.detail(updatedProduct.id).queryKey;
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousProduct = queryClient.getQueryData(detailKey);
      queryClient.setQueryData(detailKey, (old: Product) => ({
        ...old,
        ...updatedProduct,
      }));
      return { previousProduct };
    },
    onError: (_err, updatedProduct, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(updatedProduct.id).queryKey,
          context.previousProduct,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all.queryKey });
    },
  });
}
```

핵심 규칙:
- [MUST] 뮤테이션 성공 시 관련 쿼리 invalidate
- [MUST] 옵티미스틱 업데이트 시 `onError`에서 롤백 구현
- [MUST] `setQueryData` 전에 `cancelQueries` 호출 (레이스 컨디션 방지)

### Step 5: Zustand (클라이언트 UI 상태)

#### 5a: Slice 패턴

[MUST] `store/slices/`에 도메인별 slice 파일을 생성, `StateCreator` 타입 사용:

```typescript
// store/slices/uiSlice.ts
import type { StateCreator } from 'zustand';

export interface UISlice {
  isSidebarOpen: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
}

export const createUISlice: StateCreator<UISlice & UserSlice, [], [], UISlice> = (set) => ({
  isSidebarOpen: true,
  notifications: [],
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  addNotification: (notification) =>
    set((state) => ({ notifications: [...state.notifications, notification] })),
});
```

#### 5b: Store with Partialize

[MUST] `devtools`(최외곽) + `persist` + `partialize`로 일시적 데이터 제외:

```typescript
// store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type StoreState = UserSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createUISlice(...a),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          user: state.user,
          isSidebarOpen: state.isSidebarOpen,
        }),
      },
    ),
    { name: 'AppStore' },
  ),
);
```

#### 5c: 셀렉터

[MUST] 개별 셀렉터를 export. 전체 스토어를 구조분해하지 않습니다:

```typescript
// store/selectors.ts
export const useUser = () => useStore((state) => state.user);
export const useIsSidebarOpen = () => useStore((state) => state.isSidebarOpen);
```

### Step 6: 검증

1. 모든 API 호출이 TanStack Query 커스텀 훅을 통해 이루어지는지 확인
2. 서버 데이터가 Zustand에 복제되지 않았는지 확인
3. 쿼리 키가 `@lukemorales/query-key-factory`를 사용하는지 확인
4. 뮤테이션이 성공 시 관련 쿼리를 invalidate하는지 확인
5. Zustand가 slice 패턴 + `devtools` + `persist` + `partialize`를 사용하는지 확인
6. API 클라이언트가 `lib/api.ts`에 설정되어 있는지 확인

## Cross-Skill References

- **React 컴포넌트 패턴**: `react-dev` skill 사용
- **UI 컴포넌트, 스타일링, 폼, 테스트**: `react-ui-dev` skill 사용
- **전체 기능 오케스트레이션**: `react-dev-orchestration` skill 사용
- **코드 리뷰**: `convention-code-review` skill 사용
```

**Step 3: Commit**

```bash
git add skills/react-data-provider/
git commit -m "feat: add react-data-provider skill for React SPA data/state management"
```

---

## Task 3: Create react-ui-dev skill

**Files:**
- Create: `$SKILLS/react-ui-dev/SKILL.md`
- Create: `$SKILLS/react-ui-dev/references/` (8 convention files)

**Step 1: Create directory and copy references**

```bash
mkdir -p "$SKILLS/react-ui-dev/references"
cp "$CONV/common/COMMON_CONVENTION.md" "$SKILLS/react-ui-dev/references/COMMON_CONVENTION.md"
cp "$CONV/common/typescript/TYPESCRIPT_CONVENTION.md" "$SKILLS/react-ui-dev/references/TYPESCRIPT_CONVENTION.md"
cp "$CONV/frontend/FRONTEND_CONVENTION.md" "$SKILLS/react-ui-dev/references/FRONTEND_CONVENTION.md"
cp "$CONV/frontend/architecture/ARCHITECTURE_CONVENTION.md" "$SKILLS/react-ui-dev/references/FRONTEND_ARCHITECTURE_CONVENTION.md"
cp "$CONV/frontend/styling/STYLING_CONVENTION.md" "$SKILLS/react-ui-dev/references/STYLING_CONVENTION.md"
cp "$CONV/frontend/form/FORM_CONVENTION.md" "$SKILLS/react-ui-dev/references/FORM_CONVENTION.md"
cp "$CONV/frontend/testing/TESTING_CONVENTION.md" "$SKILLS/react-ui-dev/references/TESTING_CONVENTION.md"
cp "$CONV/frontend/react/REACT_CONVENTION.md" "$SKILLS/react-ui-dev/references/REACT_CONVENTION.md"
```

**Step 2: Write SKILL.md**

Create `$SKILLS/react-ui-dev/SKILL.md` with this content:

```markdown
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
   - `references/TESTING_CONVENTION.md` - Storybook, Jest, E2E 테스트
   - `references/REACT_CONVENTION.md` - React 19 패턴, Hooks 규칙, 성능 최적화, Error Boundary
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
| Unit | Jest | 유틸리티 함수, 커스텀 훅, 순수 로직 | 40% |
| Component | Storybook + Interaction Testing | 개별 UI 컴포넌트 렌더링/인터랙션 | 25% |
| Integration | React Testing Library | 다중 컴포넌트 조합, 폼 플로우 | 20% |
| E2E | Playwright | 핵심 사용자 시나리오 (로그인, 주문 생성) | 10% |
| Visual | Chromatic | UI 스타일 회귀 감지 | 5% |

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
```

**Step 3: Commit**

```bash
git add skills/react-ui-dev/
git commit -m "feat: add react-ui-dev skill for React SPA UI development"
```

---

## Task 4: Create react-dev-orchestration skill

**Files:**
- Create: `$SKILLS/react-dev-orchestration/SKILL.md`
- Create: `$SKILLS/react-dev-orchestration/references/FRONTEND_CONVENTION.md` (copy)
- Create: `$SKILLS/react-dev-orchestration/references/FRONTEND_ARCHITECTURE_CONVENTION.md` (copy)

**Step 1: Create directory and copy references**

```bash
mkdir -p "$SKILLS/react-dev-orchestration/references"
cp "$CONV/frontend/FRONTEND_CONVENTION.md" "$SKILLS/react-dev-orchestration/references/FRONTEND_CONVENTION.md"
cp "$CONV/frontend/architecture/ARCHITECTURE_CONVENTION.md" "$SKILLS/react-dev-orchestration/references/FRONTEND_ARCHITECTURE_CONVENTION.md"
```

**Step 2: Write SKILL.md**

Create `$SKILLS/react-dev-orchestration/SKILL.md` with this content:

```markdown
---
name: react-dev-orchestration
description: React SPA 전체 기능 개발 오케스트레이션. 데이터 레이어와 UI 레이어를 조율하여 완전한 기능을 구현합니다. 새 페이지, 새 기능, end-to-end 구현 등의 요청에 사용합니다. "새 페이지 만들어줘", "기능 개발해줘", "새 기능 추가해줘", "페이지 구현해줘", "develop new feature", "create new page", "build a feature" 등 데이터 레이어(쿼리, 뮤테이션, 스토어)와 UI 레이어(컴포넌트, 폼, 스토리)를 함께 만들어야 하는 작업에 사용합니다. Next.js 프로젝트는 nextjs-dev-orchestration skill을 사용하세요.
---

# React Dev Orchestration

React SPA(Vite + React Router) 프로젝트에서 전체 기능 개발을 요구사항 분석부터 통합 검증까지 오케스트레이션합니다.

> **React-only 프로젝트 특성**: Server/Client 분리가 없고, 모든 코드가 클라이언트에서 실행됩니다. App Router 파일 규칙(page.tsx, layout.tsx, loading.tsx, error.tsx) 대신 React Router의 코드 기반 라우팅을 사용합니다.

## Convention Loading

작업 시작 전 반드시 다음 참조 파일을 읽습니다:

1. **항상**: `references/FRONTEND_ARCHITECTURE_CONVENTION.md`, `references/FRONTEND_CONVENTION.md`

> **참고**: 아키텍처 컨벤션의 Next.js 전용 내용(`app/` 디렉토리, Route Groups, Server Components, `'use client'`)은 React-only 프로젝트에 해당하지 않습니다. 컴포넌트 4분류 체계(UI/Feature/Layout/Page), 의존성 방향, 코로케이션, import 규칙 등 프레임워크 무관 규칙에 집중합니다.

## Orchestration Workflow

### Step 1: 요구사항 분석

1. 기능 범위 파악 (페이지, CRUD 기능, 대시보드 섹션, 폼 등)
2. 데이터 엔티티와 사용자 인터랙션 목록 작성
3. 라우트 구조 결정 (URL 경로, 중첩 라우트, 동적 세그먼트)
4. 인증/권한 요구사항 확인

### Step 2: 컴포넌트 트리 설계

**Page -> Feature -> UI** 의존성 방향을 따라 계층 설계합니다.

```
pages/FeatureNamePage.tsx        <- React Router route element, Feature 컴포넌트 조합

components/feature/FeatureName/
  FeatureName.tsx                <- 비즈니스 로직, hooks/store/queries 사용
  FeatureNameForm.tsx            <- 폼 처리
  index.ts

components/ui/
  (Feature 컴포넌트가 사용하는 재사용 UI 컴포넌트)
```

Sellernote 규칙:
- `pages/` 디렉토리에는 페이지 컴포넌트만 배치 — 비즈니스 로직 없음
- Page 컴포넌트는 Feature/UI 컴포넌트를 조합만 담당
- Feature 컴포넌트는 `components/feature/`에 배치하며 모든 비즈니스 로직 포함
- UI 컴포넌트는 `components/ui/`에 배치하며 props에만 의존 (store/queries 금지)

### Step 3: 데이터 레이어 계획

| 카테고리 | 식별 항목 |
|----------|-----------|
| Queries | 목록 쿼리(GET), 상세 쿼리(GET by ID), 검색/필터 쿼리 |
| Mutations | 생성, 수정, 삭제 — useMutation + REST API |
| Client State | UI 상태(필터, 모달, 선택) — Zustand stores |
| Server State | TanStack Query 훅 (클라이언트 사이드 데이터 페칭/캐싱) |
| Types | 공유 TypeScript 인터페이스 + Zod 스키마 |

각 쿼리/뮤테이션에 대해 API 엔드포인트, 쿼리 키 구조, 캐시 무효화 전략을 기록합니다.

### Step 4: react-data-provider 스킬 위임

`react-data-provider` 스킬을 사용하여 데이터 레이어를 구현합니다:

```
react-data-provider 스킬로 [기능명] 데이터 레이어 구현:

1. 필요한 쿼리:
   - [각 쿼리의 엔드포인트, 파라미터, 쿼리 키]

2. 필요한 뮤테이션:
   - [각 뮤테이션의 API 엔드포인트, 파라미터, 캐시 무효화 대상]

3. Zustand store:
   - [클라이언트 상태 slice와 state shape, actions]

4. Types/Schemas:
   - [공유 타입과 Zod 유효성 검사 스키마]

생성할 파일:
- queries/use{Feature}Query.ts
- queries/use{Feature}ListQuery.ts
- queries/use{Feature}Mutation.ts
- store/slices/{feature}Slice.ts
- types/{Feature}.types.ts
- schemas/{feature}Schema.ts
```

데이터 레이어 구현이 완료된 후 다음 단계로 진행합니다.

### Step 5: UI 레이어 계획

| 컴포넌트 유형 | 위치 | 예시 |
|---------------|------|------|
| UI 컴포넌트 | `components/ui/` | DataTable, StatusBadge, ConfirmDialog |
| Feature 컴포넌트 | `components/feature/` | OrderList, OrderForm, OrderDetail |
| Layout 컴포넌트 | `components/layout/` | PageLayout, SectionHeader |

각 컴포넌트에 대해: props interface, 사용할 데이터 훅, Storybook 요구사항을 기록합니다.

### Step 6: react-ui-dev 스킬 위임

`react-ui-dev` 스킬을 사용하여 UI 레이어를 구현합니다:

```
react-ui-dev 스킬로 [기능명] UI 레이어 구현:

1. UI 컴포넌트:
   - [각 컴포넌트의 props interface와 Storybook 요구사항]

2. Feature 컴포넌트:
   - [각 컴포넌트가 사용하는 데이터 훅/스토어]

3. Form 컴포넌트 (있다면):
   - [폼 필드, Zod 스키마 참조, 제출 뮤테이션]

4. 사용 가능한 데이터 훅 (데이터 레이어에서 구현 완료):
   - [구현된 쿼리/뮤테이션/스토어 훅 목록]

생성할 파일:
- components/ui/{Component}/{Component}.tsx
- components/ui/{Component}/{Component}.stories.tsx
- components/ui/{Component}/index.ts
- components/feature/{Feature}/{Feature}.tsx
- components/feature/{Feature}/{Feature}.test.tsx
- components/feature/{Feature}/index.ts
```

### Step 7: 라우팅 설정

데이터와 UI 레이어 구현이 완료되면, React Router로 라우팅을 구성합니다.

```typescript
// routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
    ],
  },
]);
```

React Router 규칙:
- `createBrowserRouter`로 라우터 생성 (object-based route 정의)
- 중첩 라우트로 레이아웃 공유
- `errorElement`로 라우트별 에러 처리
- `loader`는 TanStack Query의 `ensureQueryData`와 연동 가능 (선택)
- 인증 가드는 레이아웃 컴포넌트 또는 라우트 `loader`에서 처리

### Step 8: 통합 검증

완성된 기능을 다음 체크리스트로 검증합니다:

- [ ] `pages/` 디렉토리에는 페이지 컴포넌트만 있고, 비즈니스 로직은 `components/feature/`에 배치
- [ ] 의존성 방향: Page -> Feature -> UI (역방향 import 없음)
- [ ] 모든 import가 `@/` 절대 경로 사용
- [ ] 데이터 레이어 완성: 쿼리 훅, 뮤테이션 훅, Zustand store, Zod 스키마
- [ ] UI 레이어 완성: UI 컴포넌트에 Storybook, Feature 컴포넌트에 테스트
- [ ] React Router 라우트 설정 완료
- [ ] 에러 처리: ErrorBoundary 배치, API 에러 핸들링

## Key Rules Summary

| 규칙 | 상세 |
|------|------|
| MUST | `pages/`에는 페이지 컴포넌트만; 비즈니스 로직은 `components/`, `hooks/`, `store/`, `queries/`에 배치 |
| MUST | 의존성 방향: Page -> Feature -> UI (역방향 금지) |
| MUST | `@/` 절대 import 경로 |
| MUST NOT | Page 컴포넌트에 비즈니스 로직 직접 작성 |
| MUST NOT | UI 컴포넌트에서 store, queries, hooks import |

## Cross-Skill References

- **데이터 레이어** (TanStack Query, Zustand): `react-data-provider` skill 사용
- **UI 레이어** (DS 컴포넌트, 폼, Storybook, 테스트): `react-ui-dev` skill 사용
- **React 패턴** (컴포넌트, Hooks, 성능 최적화): `react-dev` skill 사용
```

**Step 3: Commit**

```bash
git add skills/react-dev-orchestration/
git commit -m "feat: add react-dev-orchestration skill for React SPA feature orchestration"
```

---

## Task 5: Update nextjs-ui-dev SKILL.md

Replace MUI v6 references with @sellernote/design-system + Tailwind CSS v4 in the SKILL.md (references are already up-to-date).

**Files:**
- Modify: `$SKILLS/nextjs-ui-dev/SKILL.md`

**Step 1: Update description frontmatter**

Replace the `description` field to remove MUI mentions and add DS+Tailwind:

Old (line 3):
```
description: Next.js UI development following Sellernote conventions. Use when creating, modifying, or reviewing React components, MUI-styled UI, form handling...
```

New:
```
description: Next.js UI development following Sellernote conventions. Use when creating, modifying, or reviewing React components, @sellernote/design-system + Tailwind CSS v4 styled UI, form handling, Storybook stories, Jest/RTL tests, or page layouts in a Next.js App Router project. Triggers on tasks involving UI component creation, DS component usage, Tailwind CSS v4 styling, React Hook Form + Zod form implementation, Storybook story writing, component testing, page composition, layout structure, responsive design, dark mode support, or any frontend UI work. Also use when asked to build a new component, create a form with validation, add Storybook coverage, write component tests, implement a page layout, or apply Sellernote frontend architecture conventions.
```

**Step 2: Update Convention Loading section (line 17)**

Old:
```
   - `references/STYLING_CONVENTION.md` - MUI v6 theming, styled(), sx, anti-patterns
```

New:
```
   - `references/STYLING_CONVENTION.md` - @sellernote/design-system + Tailwind CSS v4, 디자인 토큰, cn()
```

**Step 3: Update Step 2 component description (line 54)**

Old:
```
Follow standard React/MUI patterns. Key Sellernote constraints:
```

New:
```
Follow standard React + DS + Tailwind patterns. Key Sellernote constraints:
```

**Step 4: Replace entire Step 3 (lines 62-78)**

Old Step 3 (MUI + Next.js setup):
```markdown
### Step 3: Apply Styling

**MUI + Next.js setup (required in root layout):**

- Use `AppRouterCacheProvider` from `@mui/material-nextjs/v15-appRouter`
- Set `cssVariables: true` in `createTheme`
- Use `next/font` with CSS variable connected to MUI theme typography

**Styling priority order:**

1. **Theme overrides** - Global, all-instance styles
2. **`styled()`** - Reusable styled components
3. **`sx` prop** - One-off layout/spacing adjustments

**Key constraints:** `theme.palette` for all colors (no hex), `theme.spacing()` for spacing (no magic px), MUI breakpoints for responsive (no manual media queries), no inline `style={{}}`, no `!important`, use `Box`/`Stack`/`Grid` over raw HTML elements.

See `references/STYLING_CONVENTION.md` for full rules and examples.
```

New Step 3 (DS + Tailwind):
```markdown
### Step 3: Apply Styling

**@sellernote/design-system 기반 스타일링:**

1. **DS 컴포넌트 우선 사용** - `@sellernote/design-system`에서 제공하는 40+ 컴포넌트를 직접 import
2. **Tailwind 유틸리티 클래스** - DS에 없는 레이아웃/간격/커스텀 스타일은 Tailwind 클래스 사용
3. **cn() 조건부 결합** - DS의 `cn()` 함수로 조건부 className 결합

**Key constraints:**
- [MUST] 색상은 DS 디자인 토큰 사용 (하드코딩 hex 금지)
- [MUST] 글로벌 CSS에서 `@import 'tailwindcss'` → `@import '@sellernote/design-system/styles'` 순서
- [MUST] 조건부 className은 `cn()` 사용
- [MUST NOT] 인라인 `style={{}}` 사용 금지
- [MUST NOT] `!important` 사용 금지

See `references/STYLING_CONVENTION.md` for full rules and examples.
```

**Step 5: Update Step 4 form section (lines 84, 88)**

Old:
```
- Wrap MUI components with `Controller` (not `register` directly - MUI controlled components are incompatible)
...
- Field-level errors via MUI `error`/`helperText` props
```

New:
```
- Wrap DS form components with `Controller` (not `register` directly - DS controlled components are incompatible)
...
- Field-level errors via DS form component의 error props
```

**Step 6: Update File Structure Reference (lines 141-145)**

Old:
```
├── theme/                      # MUI theme
│   ├── index.ts                # createTheme
│   └── tokens.ts               # Design tokens
```

New:
```
├── styles/                     # Global styles
│   └── globals.css             # Tailwind CSS + DS styles import
```

**Step 7: Commit**

```bash
git add skills/nextjs-ui-dev/SKILL.md
git commit -m "refactor: update nextjs-ui-dev SKILL.md from MUI to DS+Tailwind"
```

---

## Task 6: Final verification

**Step 1: Verify all new skills have correct structure**

```bash
echo "=== react-ui-dev ==="
ls -la skills/react-ui-dev/SKILL.md
ls skills/react-ui-dev/references/ | wc -l  # should be 8
ls skills/react-ui-dev/references/

echo "=== react-data-provider ==="
ls -la skills/react-data-provider/SKILL.md
ls skills/react-data-provider/references/ | wc -l  # should be 4
ls skills/react-data-provider/references/

echo "=== react-dev-orchestration ==="
ls -la skills/react-dev-orchestration/SKILL.md
ls skills/react-dev-orchestration/references/ | wc -l  # should be 2
ls skills/react-dev-orchestration/references/
```

**Step 2: Verify no MUI references remain in nextjs-ui-dev SKILL.md**

```bash
grep -i "MUI\|@mui\|styled()\|sx prop\|createTheme\|theme\.palette\|theme\.spacing" skills/nextjs-ui-dev/SKILL.md
```

Expected: No output (no matches)

**Step 3: Verify REACT_CONVENTION.md is synced**

```bash
CONV="/Users/sungwoo.yang/Documents/sellernote/sellernote/sellernote-development-convention"
SOURCE_MD5=$(md5 -q "$CONV/frontend/react/REACT_CONVENTION.md")
for skill in react-dev react-ui-dev nextjs-ui-dev convention-code-review convention-refactor; do
  ref="skills/$skill/references/REACT_CONVENTION.md"
  if [ -f "$ref" ]; then
    SKILL_MD5=$(md5 -q "$ref")
    if [ "$SOURCE_MD5" = "$SKILL_MD5" ]; then echo "$skill: SYNCED"; else echo "$skill: OUT-OF-SYNC"; fi
  fi
done
```

Expected: All "SYNCED"

**Step 4: Verify all new skill frontmatter is valid**

```bash
for skill in react-ui-dev react-data-provider react-dev-orchestration; do
  echo "=== $skill ==="
  head -4 "skills/$skill/SKILL.md"
  echo ""
done
```

Expected: Each shows `---`, `name:`, `description:`, valid YAML frontmatter

**Step 5: Final commit if any fixes needed, then verify git status**

```bash
git status
git log --oneline -5
```

Expected: Clean working tree, recent commits for tasks 1-5.
