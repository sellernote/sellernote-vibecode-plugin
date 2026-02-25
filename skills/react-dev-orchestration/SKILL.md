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
