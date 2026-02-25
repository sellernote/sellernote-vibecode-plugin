# React-only Skill Set Design

## Problem

Next.js 프로젝트는 3개의 세밀한 스킬(nextjs-dev-orchestration, nextjs-data-provider, nextjs-ui-dev)로 커버되지만, React-only 프로젝트(Vite + React Router)는 react-dev 1개 스킬만 존재하여 아키텍처, 스타일링, 상태관리, 폼, 테스팅 가이드가 없다.

또한, 기존 Next.js 스킬의 references가 MUI v6 기반으로 작성되어 있어 최신 컨벤션(@sellernote/design-system + Tailwind CSS v4)과 불일치한다.

## Decision

접근 A(병렬 React 스킬 세트)를 채택한다. Next.js 스킬 구조를 미러링하여 React 전용 스킬을 만들고, 기존 스킬의 references를 최신 컨벤션으로 동기화한다.

## Tech Stack (React-only)

| 영역 | 기술 |
|------|------|
| 빌드 | Vite |
| 라우팅 | React Router |
| UI 라이브러리 | React 19 |
| 스타일링 | @sellernote/design-system + Tailwind CSS v4 |
| 상태관리 | TanStack Query v5 + Zustand |
| 폼 | React Hook Form + Zod |
| 테스팅 | Jest + RTL + Storybook (@storybook/react-vite) |

## React vs Next.js Key Differences

| 영역 | Next.js | React-only |
|------|---------|------------|
| 렌더링 | Server Components 기본 | 전부 클라이언트 |
| 라우팅 | App Router (파일 기반) | React Router (코드 기반) |
| 데이터 페칭 | Server Component fetch + TQ | TQ만 (전부 클라이언트) |
| 뮤테이션 | Server Actions | TQ useMutation + REST API |
| 캐시 무효화 | revalidatePath/Tag + TQ | TQ invalidateQueries만 |
| 디렉토리 | `app/` (라우트 파일) | `pages/` 또는 `routes/` |
| 'use client' | 필요 (Feature 컴포넌트) | 불필요 (전부 클라이언트) |
| Storybook | @storybook/nextjs | @storybook/react-vite |

## New Skills

### 1. react-ui-dev

**역할:** React SPA에서 UI 컴포넌트, DS+Tailwind 스타일링, 폼, 테스팅 가이드

**References:**
- COMMON_CONVENTION.md
- TYPESCRIPT_CONVENTION.md
- FRONTEND_CONVENTION.md
- FRONTEND_ARCHITECTURE_CONVENTION.md
- STYLING_CONVENTION.md
- FORM_CONVENTION.md
- TESTING_CONVENTION.md
- REACT_CONVENTION.md

**Workflow:**
1. 컴포넌트 분류 (UI/Feature/Layout/Page) - Page는 `pages/` 디렉토리, 클라이언트 컴포넌트
2. 컴포넌트 구현 - 컨벤션 4분류 체계 적용, `'use client'` 불필요
3. 스타일링 적용 - DS 컴포넌트 → Tailwind 유틸리티 → cn() 조건부
4. 폼 구현 - RHF + Zod, DS 컴포넌트와 Controller 연동
5. 테스트 작성 - @storybook/react-vite, Jest + RTL, test pyramid

### 2. react-data-provider

**역할:** React SPA에서 데이터 페칭과 상태 관리 가이드

**References:**
- COMMON_CONVENTION.md
- TYPESCRIPT_CONVENTION.md
- FRONTEND_CONVENTION.md
- STATE_CONVENTION.md

**Workflow:**
1. 상태 분류 (Server/Client/Local/URL)
2. 페칭 전략 결정 - 모든 데이터는 TQ 또는 API client (Server Component fetch 없음)
3. API 클라이언트 설정 - lib/api.ts에 fetch wrapper
4. TanStack Query 구현 - 쿼리 키 팩토리, 커스텀 쿼리 훅, 옵티미스틱 업데이트
5. Mutation 구현 - useMutation + REST API fetch (Server Actions 대신)
6. Zustand 구현 - 슬라이스 패턴, 셀렉터, devtools+persist
7. 검증

### 3. react-dev-orchestration

**역할:** React SPA 전체 기능 개발 오케스트레이션

**References:**
- FRONTEND_CONVENTION.md
- FRONTEND_ARCHITECTURE_CONVENTION.md

**Workflow:**
1. 요구사항 분석
2. 컴포넌트 트리 설계 (Page → Feature → UI)
3. 데이터 레이어 계획
4. react-data-provider 스킬 위임
5. UI 레이어 계획
6. react-ui-dev 스킬 위임
7. React Router 라우팅 설정
8. 통합 검증

### 4. react-dev (기존, 유지)

변경 없음. React 19 패턴(컴포넌트, 훅, 성능 최적화, Error Boundary, Context)에 집중.

## Existing Skill Updates

### nextjs-ui-dev
- SKILL.md: MUI v6 참조를 DS + Tailwind v4로 전면 교체
- references/STYLING_CONVENTION.md: 최신 컨벤션으로 교체
- references/FRONTEND_CONVENTION.md: 최신 컨벤션으로 교체
- references/FRONTEND_ARCHITECTURE_CONVENTION.md: 최신 컨벤션으로 교체

### nextjs-data-provider
- references/FRONTEND_CONVENTION.md: 최신 컨벤션으로 동기화

### nextjs-dev-orchestration
- references/FRONTEND_CONVENTION.md, FRONTEND_ARCHITECTURE_CONVENTION.md: 동기화

### convention-code-review, convention-refactor
- 프론트엔드 관련 references 전체 최신화

### react-dev
- references/REACT_CONVENTION.md: 최신 확인 및 동기화

## Reference Sync Strategy

모든 references 파일은 sellernote-development-convention 레포의 최신 파일을 복사한다.

소스 매핑:
- `common/COMMON_CONVENTION.md` → `COMMON_CONVENTION.md`
- `common/typescript/TYPESCRIPT_CONVENTION.md` → `TYPESCRIPT_CONVENTION.md`
- `frontend/FRONTEND_CONVENTION.md` → `FRONTEND_CONVENTION.md`
- `frontend/architecture/ARCHITECTURE_CONVENTION.md` → `FRONTEND_ARCHITECTURE_CONVENTION.md`
- `frontend/styling/STYLING_CONVENTION.md` → `STYLING_CONVENTION.md`
- `frontend/state/STATE_CONVENTION.md` → `STATE_CONVENTION.md`
- `frontend/form/FORM_CONVENTION.md` → `FORM_CONVENTION.md`
- `frontend/testing/TESTING_CONVENTION.md` → `TESTING_CONVENTION.md`
- `frontend/react/REACT_CONVENTION.md` → `REACT_CONVENTION.md`
- `frontend/nextjs/NEXTJS_CONVENTION.md` → `NEXTJS_CONVENTION.md`

## SKILL.md Adaptation Strategy

컨벤션 문서는 Next.js 중심으로 작성되어 있으므로(예: `app/` 디렉토리, Server Components), SKILL.md의 워크플로우에서 React-only 맥락으로 번역한다.

예시:
- 컨벤션: "page.tsx는 Server Component를 기본으로"
- React 스킬: "Page 컴포넌트는 pages/ 디렉토리에 위치, React Router의 route element로 사용, 일반 클라이언트 컴포넌트"

## File Structure

```
skills/
├── react-ui-dev/           # NEW
│   ├── SKILL.md
│   └── references/
│       ├── COMMON_CONVENTION.md
│       ├── TYPESCRIPT_CONVENTION.md
│       ├── FRONTEND_CONVENTION.md
│       ├── FRONTEND_ARCHITECTURE_CONVENTION.md
│       ├── STYLING_CONVENTION.md
│       ├── FORM_CONVENTION.md
│       ├── TESTING_CONVENTION.md
│       └── REACT_CONVENTION.md
│
├── react-data-provider/    # NEW
│   ├── SKILL.md
│   └── references/
│       ├── COMMON_CONVENTION.md
│       ├── TYPESCRIPT_CONVENTION.md
│       ├── FRONTEND_CONVENTION.md
│       └── STATE_CONVENTION.md
│
├── react-dev-orchestration/ # NEW
│   ├── SKILL.md
│   └── references/
│       ├── FRONTEND_CONVENTION.md
│       └── FRONTEND_ARCHITECTURE_CONVENTION.md
│
├── react-dev/              # EXISTING (keep)
│   ├── SKILL.md
│   └── references/
│       └── REACT_CONVENTION.md
│
├── nextjs-ui-dev/          # EXISTING (update refs + SKILL.md)
├── nextjs-data-provider/   # EXISTING (update refs)
├── nextjs-dev-orchestration/ # EXISTING (update refs)
├── convention-code-review/ # EXISTING (update frontend refs)
└── convention-refactor/    # EXISTING (update frontend refs)
```
